import { useEffect, useState } from 'react';

// Works like useState, but the value is saved in the browser and restored on reload.
// This is the only place that touches localStorage, so swapping in a database later means changing one file.
const resolve = (v) => (typeof v === 'function' ? v() : v);

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? resolve(initialValue) : JSON.parse(saved);
    } catch {
      return resolve(initialValue); // storage blocked or the saved text was corrupted
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: the app keeps working until the page is closed */
    }
  }, [key, value]);

  return [value, setValue];
}
