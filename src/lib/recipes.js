// Saved meals (the recipe book). Pure functions, no React.
//
// A meal looks like:
//   { id, name, servings, notes, ai?, ingredients: [{ id, name, serving, calories, protein, carbs, fat }] }
// Each ingredient's numbers are for the whole amount used in the recipe, and "servings" is how many portions the
// recipe makes. Nutrition per serving is worked out from the totals, so nothing is stored twice.
import { round1, sumEntries } from './nutrition.js';

// Kept modest because the whole recipe book syncs as one record. A typical recipe with instructions is about 2 KB and a
// maximum-size one about 4 KB, so 300 fit comfortably under the 2 MB limit on a synced record.
export const MAX_MEALS = 300;
export const MAX_NOTES = 2000;
export const MAX_INGREDIENTS = 60;
export const MAX_SERVINGS = 100;

// Nutrition for eating `eaten` servings of a meal (1 gives the per-serving numbers).
export function portion(meal, eaten) {
  const total = sumEntries(meal.ingredients);
  const factor = eaten / meal.servings;
  return {
    calories: Math.round(total.calories * factor),
    protein: round1(total.protein * factor),
    carbs: round1(total.carbs * factor),
    fat: round1(total.fat * factor),
  };
}

const amount = (value, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

// Clean up whatever is in storage so a bad value can never crash the app. Broken meals are dropped.
export function cleanMeals(saved) {
  if (!Array.isArray(saved)) return [];
  const out = [];
  for (const m of saved.slice(0, MAX_MEALS)) {
    if (!m || typeof m !== 'object' || typeof m.id !== 'string' || m.id === '') continue;
    const name = String(m.name ?? '').trim().slice(0, 120);
    const servings = Number(m.servings);
    const ingredients = Array.isArray(m.ingredients)
      ? m.ingredients
          .slice(0, MAX_INGREDIENTS)
          .map((i, index) => ({
            id: String(i?.id || `ingredient-${index}`),
            name: String(i?.name ?? '').trim().slice(0, 120),
            serving: String(i?.serving ?? '').slice(0, 80),
            calories: Math.round(amount(i?.calories, 10000)),
            protein: round1(amount(i?.protein, 1000)),
            carbs: round1(amount(i?.carbs, 2000)),
            fat: round1(amount(i?.fat, 1000)),
          }))
          .filter((i) => i.name)
      : [];
    if (!name || !(servings > 0) || ingredients.length === 0) continue;
    const meal = { id: m.id, name, servings: Math.min(servings, MAX_SERVINGS), ingredients, notes: String(m.notes ?? '').slice(0, MAX_NOTES) };
    if (m.ai === true) meal.ai = true; // written by the AI planner, so it gets a reminder to check the ingredients
    out.push(meal);
  }
  return out;
}

// Instructions are stored as plain text. AI recipes write them as numbered lines ("1. Boil the water."). Returns the
// steps as a list when every line is numbered, otherwise null (the text is then shown as written).
export function stepsOf(notes) {
  const lines = String(notes ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2 || !lines.every((l) => /^\d{1,2}[.)]\s+\S/.test(l))) return null;
  return lines.map((l) => l.replace(/^\d{1,2}[.)]\s+/, ''));
}

const quantity = (q) => {
  const mixed = q.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = q.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(q);
};

// "60 g" for 1.5 times the recipe becomes "90 g". Amounts that do not start with a plain number ("a pinch", "1-2
// cloves") are left as written with the multiplier added, rather than guessed at.
export function scaleAmount(text, factor) {
  const s = String(text ?? '').trim();
  if (!s || factor === 1 || !(factor > 0)) return s;
  const m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)([\s\S]*)$/);
  const times = Number(factor.toFixed(2));
  if (!m || /^\s*(?:-|–|to\b|or\b)/.test(m[2])) return `${s} (x${times})`;
  const value = quantity(m[1]) * factor;
  if (!Number.isFinite(value)) return `${s} (x${times})`;
  return `${Number(value.toFixed(2))}${m[2]}`;
}
