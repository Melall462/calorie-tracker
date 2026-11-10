export const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

// Pick a sensible meal for the time of day.
export function defaultMeal() {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

// Turn text from an input into a positive number, or 0 if it isn't one.
export function toNumber(text) {
  const n = Number(String(text).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
