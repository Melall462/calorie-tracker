// A copy of everything Nutrily keeps on this device, as a file the person can keep. Offered before deleting an account.
// Only the person's own data is included: not the sync bookkeeping, and not anything to do with signing in.
export const EXPORT_KEYS = ['entries', 'goals', 'water', 'weights', 'profile', 'preferences', 'meals', 'plan', 'foods'];

// `storage` is anything with getItem (localStorage in the app).
export function buildExport(storage, now = new Date()) {
  const data = {};
  for (const key of EXPORT_KEYS) {
    let raw = null;
    try {
      raw = storage.getItem(`nutrily:${key}`);
    } catch {
      /* unreadable: leave it out */
    }
    if (raw === null || raw === undefined) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      /* not valid JSON: leave it out rather than guess */
    }
  }
  return { app: 'Nutrily', exportedAt: now.toISOString(), data };
}

export function exportFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `nutrily-data-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// Save the file through the browser's normal download.
export function downloadExport() {
  const now = new Date();
  const blob = new Blob([JSON.stringify(buildExport(window.localStorage, now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFilename(now);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}
