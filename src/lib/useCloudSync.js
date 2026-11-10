import { useCallback, useEffect, useRef, useState } from 'react';
import { loadBackend } from './backend.js';
import { loadMeta, runSync, wipeLocalData } from './sync.js';

const DEBOUNCE_MS = 2000;

// Account and sync for the whole app.
//   getUnits()    the app's current data as sync units
//   applyUnits()  write units into the app's data
//   watch         a fixed-length list of the app's data; when any of it changes, a sync is scheduled
export function useCloudSync({ getUnits, applyUnits, watch }) {
  const [backend, setBackend] = useState(undefined); // undefined: still loading, null: cloud sync is not set up
  const [session, setSession] = useState(undefined); // undefined: checking, null: signed out
  const [status, setStatus] = useState('idle'); // idle, syncing or error
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState('');

  // Always the newest functions and account, so a sync that runs later never uses stale data.
  const latest = useRef({});
  const userId = session?.user?.id ?? null;
  latest.current = { getUnits, applyUnits, backend, userId };
  const run = useRef(null); // the sync in progress, if any
  const again = useRef(false); // another sync was asked for while one was running
  const timer = useRef(null);

  useEffect(() => {
    let off = false;
    loadBackend()
      .then((b) => !off && setBackend(b))
      .catch(() => !off && setBackend(null));
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (backend === undefined) return undefined;
    if (backend === null) {
      setSession(null);
      return undefined;
    }
    let off = false;
    backend
      .getSession()
      .then((s) => !off && setSession(s))
      .catch(() => !off && setSession(null));
    const stop = backend.onAuthChange((s) => !off && setSession(s));
    return () => {
      off = true;
      stop();
    };
  }, [backend]);

  // Returns true if the data is now safely in the cloud. Calling it while a sync runs waits for that sync.
  const syncNow = useCallback(() => {
    const { backend: b, userId: uid } = latest.current;
    if (!b || !uid) return Promise.resolve(false);
    if (run.current) {
      again.current = true;
      return run.current;
    }
    setStatus('syncing');
    setError('');
    run.current = (async () => {
      try {
        do {
          again.current = false;
          await runSync({ backend: b, userId: uid, getUnits: () => latest.current.getUnits(), applyUnits: (units) => latest.current.applyUnits(units) });
        } while (again.current);
        setLastSynced(new Date());
        setStatus('idle');
        return true;
      } catch (e) {
        setStatus('error');
        setError(e?.message || 'Something went wrong while syncing.');
        return false;
      } finally {
        run.current = null;
      }
    })();
    return run.current;
  }, []);

  // Signing in on a device that holds another account's data must never mix the two.
  useEffect(() => {
    if (!userId) return;
    const meta = loadMeta();
    if (meta.userId && meta.userId !== userId) {
      wipeLocalData();
      window.location.reload();
      return;
    }
    syncNow();
  }, [userId, syncNow]);

  // Sync shortly after anything changes.
  useEffect(() => {
    if (!userId) return undefined;
    timer.current = setTimeout(() => syncNow(), DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, syncNow, ...watch]);

  // And when the device comes back online or the app is opened again, so changes from other devices show up.
  useEffect(() => {
    if (!userId) return undefined;
    const onVisible = () => document.visibilityState === 'visible' && syncNow();
    window.addEventListener('online', syncNow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', syncNow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, syncNow]);

  const signIn = useCallback((email, password) => latest.current.backend.signIn(email, password), []);
  const signUp = useCallback((email, password) => latest.current.backend.signUp(email, password), []);
  const signOut = useCallback(async () => {
    await latest.current.backend.signOut();
    setStatus('idle');
  }, []);

  // For shared devices: back everything up first, and only if that worked, sign out and clear this device.
  const signOutAndClear = useCallback(async () => {
    const backedUp = await syncNow();
    if (!backedUp) return { error: "Couldn't back up your data first, so nothing was cleared. Try again when you're online." };
    await latest.current.backend.signOut();
    wipeLocalData();
    window.location.reload();
    return {};
  }, [syncNow]);

  return {
    available: Boolean(backend),
    loading: backend === undefined || session === undefined,
    session,
    email: session?.user?.email ?? '',
    status,
    lastSynced,
    error,
    syncNow,
    signIn,
    signUp,
    signOut,
    signOutAndClear,
  };
}
