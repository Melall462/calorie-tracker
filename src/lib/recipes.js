// Saved meals (the recipe book). Pure functions, no React.
//
// A meal looks like:
//   { id, name, servings, notes, ai?, ingredients: [{ id, name, serving, calories, protein, carbs, fat }] }
// Each ingredient's numbers are for the whole amount used in the recipe, and "servings" is how many portions the
// recipe makes. Nutrition per serving is worked out from the totals, so nothing is stored twice.
import { round1, sumEntries } from './nutrition.js';

export const MAX_MEALS = 500;
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
    const meal = { id: m.id, name, servings: Math.min(servings, MAX_SERVINGS), ingredients, notes: String(m.notes ?? '').slice(0, 2000) };
    if (m.ai === true) meal.ai = true; // written by the AI planner, so it gets a reminder to check the ingredients
    out.push(meal);
  }
  return out;
}
