// The sync engine. Local-first: the app always works from its own saved data, and syncing quietly reconciles that
// with a copy in the cloud. It never needs to be told what changed. It compares the current data with what it
// looked like at the last sync, and the cloud with what it looked like then too.
//
// The cloud side is a table of documents, one per unit (see units.js), each with a version number. A change is
// saved only if the version is still the one we last saw (optimistic concurrency); if someone else got there first,
// we fetch their version, merge the two (see merge.js) and try again.
import { cleanUnit, emptyUnit, isKnownKey, same } from './units.js';
import { mergeUnit, reconcile } from './merge.js';

export const META_KEY = 'nutrily:sync';
const OVERLAP_MS = 10_000; // look slightly further back than the last sync, so a change committed late is not missed
const MAX_ATTEMPTS = 6;

/* ---------- What this device remembers about the last sync ---------- */

export function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY));
    if (m && typeof m === 'object') {
      return { userId: typeof m.userId === 'string' ? m.userId : null, cursor: typeof m.cursor === 'string' ? m.cursor : null, base: m.base && typeof m.base === 'object' ? m.base : {} };
    }
  } catch {
    /* fall through to a clean slate */
  }
  return { userId: null, cursor: null, base: {} };
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* storage full: the next sync will simply redo some work */
  }
}

// Remove everything Nutrily has saved on this device.
export function wipeLocalData() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('nutrily:')) localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/* ---------- One round of syncing ---------- */

async function runPool(jobs, size) {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) await jobs[next++]();
  };
  await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, worker));
}

// `local` maps unit keys to the current values. `meta` is what loadMeta() returned. Returns what to apply locally
// (`merged`), the new `base` and `cursor` to remember, and some counts. Throws if the cloud cannot be reached, in
// which case nothing should be saved.
export async function syncOnce({ backend, local, meta, concurrency = 5 }) {
  const rows = await backend.fetchChanged(meta.cursor);
  const remote = new Map();
  for (const row of rows) {
    if (!isKnownKey(row.key)) continue; // ignore anything we do not understand
    remote.set(row.key, { version: row.version, value: cleanUnit(row.key, row.value) });
  }

  const keys = new Set([...Object.keys(local).filter(isKnownKey), ...Object.keys(meta.base).filter(isKnownKey), ...remote.keys()]);
  const firstEverSync = !meta.userId;
  const base = { ...meta.base };
  const merged = {};
  const stats = { pushed: 0, pulled: 0 };
  const jobs = [];

  for (const key of keys) {
    const known = meta.base[key]; // {value, version}, or undefined if this device has never synced this unit
    const baseValue = known ? cleanUnit(key, known.value) : emptyUnit(key);
    const localValue = cleanUnit(key, local[key] ?? emptyUnit(key));
    const r = remote.get(key);
    const remoteChanged = Boolean(r) && (!known || r.version > known.version);
    const localChanged = !same(localValue, baseValue);
    if (!remoteChanged && !localChanged) continue;

    jobs.push(async () => {
      let version = known ? known.version : 0;
      let lastSeen = baseValue; // the newest cloud version we know about
      let result = localValue; // what both sides should end up holding

      if (remoteChanged) {
        version = r.version;
        lastSeen = r.value;
        // A device's very first sync (it holds data from before it joined the account): the account's data is the
        // truth when both sides changed the same thing. After that, the edit you just made wins a tie.
        result = localChanged ? mergeUnit(key, baseValue, localValue, r.value, { preferRemote: firstEverSync }) : r.value;
      }

      if (!same(result, lastSeen)) {
        for (let attempt = 0; ; attempt++) {
          if (attempt >= MAX_ATTEMPTS) throw new Error('Too many changes at once. Try syncing again.');
          const res = version === 0 ? await backend.insert(key, result) : await backend.update(key, result, version);
          if (res.ok) {
            version = res.version;
            stats.pushed += 1;
            break;
          }
          // Someone else saved first. Fetch their version, fold our changes into it, and go round again.
          const latest = await backend.fetchOne(key);
          if (!latest) {
            version = 0; // it disappeared, so create it again
            continue;
          }
          const latestValue = cleanUnit(key, latest.value);
          result = mergeUnit(key, lastSeen, result, latestValue, { preferRemote: false });
          lastSeen = latestValue;
          version = latest.version;
          if (same(result, lastSeen)) break; // their version already holds everything
        }
      } else if (remoteChanged) {
        stats.pulled += 1;
      }

      base[key] = { value: result, version };
      if (!same(result, localValue)) merged[key] = result;
    });
  }

  await runPool(jobs, concurrency);

  let cursor = meta.cursor;
  if (rows.length > 0) {
    const newest = Math.max(...rows.map((r) => Date.parse(r.updated_at)).filter(Number.isFinite));
    if (Number.isFinite(newest)) {
      const next = new Date(newest - OVERLAP_MS).toISOString();
      if (!cursor || next > cursor) cursor = next;
    }
  }
  return { merged, base, cursor, stats };
}

// A whole sync as the app runs it: compare, push and pull, apply what arrived, and remember where we got to.
//   getUnits()          the current local data as units (called twice, so edits made mid-sync are noticed)
//   applyUnits(map)     write units into the app's own storage
//   store               where this device keeps its sync notes (the browser's storage unless a test supplies one)
export async function runSync({ backend, getUnits, applyUnits, userId, store = { load: loadMeta, save: saveMeta } }) {
  const meta = store.load();
  if (meta.userId && meta.userId !== userId) throw new Error('This device has data from another account.');

  const snapshot = getUnits();
  const out = await syncOnce({ backend, local: snapshot, meta });

  // If the person kept using the app while we were talking to the cloud, fold the result into what they have now.
  const current = getUnits();
  const toApply = {};
  for (const [key, result] of Object.entries(out.merged)) {
    const now = cleanUnit(key, current[key] ?? emptyUnit(key));
    const reconciled = reconcile(key, cleanUnit(key, snapshot[key] ?? emptyUnit(key)), now, result);
    if (!same(reconciled, now)) toApply[key] = reconciled;
  }
  if (Object.keys(toApply).length > 0) applyUnits(toApply);

  store.save({ userId, cursor: out.cursor, base: out.base });
  return { ...out.stats, applied: Object.keys(toApply) };
}
