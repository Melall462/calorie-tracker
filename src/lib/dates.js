// Dates are plain local "YYYY-MM-DD" strings. This avoids timezone bugs from using Date objects for storage.
export function toKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export const todayKey = () => toKey(new Date());

export function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDay(key, amount) {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return toKey(date);
}

export function formatDay(key) {
  if (key === todayKey()) return 'Today';
  if (key === shiftDay(todayKey(), -1)) return 'Yesterday';
  return fromKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
