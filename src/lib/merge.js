// Three-way merge: given what two copies looked like when they last agreed (base), and what each looks like now
// (local and remote), combine both sets of changes. Because we know the base, a deletion on one side is told apart
// from an addition on the other, so nothing is brought back from the dead and nothing is silently lost.
//
// When both sides changed the very same thing, `preferRemote` decides. It is true only for a device's first sync
// (the account's data is treated as the truth) and false afterwards (the edit you just made wins).
import { cleanUnit, same } from './units.js';

// One value that either side may have changed.
export function scalar(base, local, remote, { preferRemote = false } = {}) {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote; // only the remote changed
  if (same(remote, base)) return local; // only the local changed
  return preferRemote ? remote : local; // both changed
}

// A list of objects with ids (entries, meals).
export function mergeById(base = [], local = [], remote = [], opts) {
  const B = new Map(base.map((x) => [x.id, x]));
  const L = new Map(local.map((x) => [x.id, x]));
  const R = new Map(remote.map((x) => [x.id, x]));

  const decide = (id) => {
    const inB = B.has(id);
    const inL = L.has(id);
    const inR = R.has(id);
    if (inL && inR) return scalar(B.get(id), L.get(id), R.get(id), opts);
    if (inL) return inB && same(L.get(id), B.get(id)) ? undefined : L.get(id); // the remote deleted it, unless we edited it
    if (inR) return inB && same(R.get(id), B.get(id)) ? undefined : R.get(id); // we deleted it, unless they edited it
    return undefined;
  };

  const out = [];
  const seen = new Set();
  for (const item of [...local, ...remote]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const value = decide(item.id);
    if (value !== undefined) out.push(value);
  }
  return out;
}

// A list of plain strings treated as a set (food likes, allergies).
export function mergeSet(base = [], local = [], remote = []) {
  const B = new Set(base);
  const L = new Set(local);
  const R = new Set(remote);
  const out = [];
  for (const x of [...local, ...remote]) {
    if (out.includes(x)) continue;
    const keep = (L.has(x) && R.has(x)) || (L.has(x) && !B.has(x)) || (R.has(x) && !B.has(x));
    if (keep) out.push(x);
  }
  return out;
}

// An object of independent fields (targets, body stats): each field is merged on its own.
export function mergeFlat(base = {}, local = {}, remote = {}, opts) {
  const out = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) out[key] = scalar(base[key], local[key], remote[key], opts);
  return out;
}

export function mergeUnit(key, base, local, remote, opts = {}) {
  let merged;
  if (key === 'settings') {
    merged = {
      goals: mergeFlat(base.goals, local.goals, remote.goals, opts),
      profile: mergeFlat(base.profile, local.profile, remote.profile, opts),
      preferences: Object.fromEntries(
        ['diets', 'avoid', 'likes', 'dislikes'].map((k) => [k, mergeSet(base.preferences?.[k], local.preferences?.[k], remote.preferences?.[k])])
      ),
      onboarded: local.onboarded === true || remote.onboarded === true, // once set up, always set up
    };
  } else if (key === 'meals') {
    merged = { meals: mergeById(base.meals, local.meals, remote.meals, opts) };
  } else if (key === 'foods') {
    merged = { foods: mergeById(base.foods, local.foods, remote.foods, opts) };
  } else {
    const localWater = local.water;
    const remoteWater = remote.water;
    const bothChangedWater = !same(localWater, base.water) && !same(remoteWater, base.water) && !same(localWater, remoteWater);
    merged = {
      entries: mergeById(base.entries, local.entries, remote.entries, opts),
      plan: mergeById(base.plan, local.plan, remote.plan, opts),
      // Water mostly goes up, so if both devices added some, keep the larger total rather than losing a drink.
      water: bothChangedWater ? Math.max(localWater, remoteWater) : scalar(base.water, localWater, remoteWater, opts),
      weight: scalar(base.weight, local.weight, remote.weight, opts),
    };
  }
  return cleanUnit(key, merged);
}

// After a sync, the cloud result has to be applied to the app. If the person made more changes while the sync was
// running, keep those too: treat the result as "remote" and the moment the sync started as the base.
export const reconcile = (key, snapshot, current, result) => mergeUnit(key, snapshot, current, result, { preferRemote: false });
