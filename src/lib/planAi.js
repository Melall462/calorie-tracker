// The app's side of AI planning: build the request, run it day by day, and turn the AI's reply into recipes and plan
// items. Nothing the AI says is trusted. Every meal is size-checked, summed from its ingredients, and screened against
// the person's allergies and diet before it can be saved. Pure functions apart from the `planner` call you pass in.
import { mealFlags } from './mealSafety.js';
import { newId } from './id.js';
import { round1 } from './nutrition.js';
import { SLOT_IDS } from './plan.js';

export const BUDGETS = [
  { id: 'any', label: 'No preference' },
  { id: 'low', label: 'Budget-friendly' },
  { id: 'medium', label: 'Mid-range' },
  { id: 'high', label: 'Treat myself' },
];
export const MAX_DAYS = 7;
export const MAX_MEALS = 8;

const num = (v, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

// What the AI is told about the person: their Account targets, diet, allergies, and what they asked for.
export function buildContext({ goals, preferences, cuisines = [], budget = 'any' }) {
  return {
    targets: { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat },
    diets: preferences.diets,
    avoid: preferences.avoid,
    likes: preferences.likes,
    dislikes: preferences.dislikes,
    cuisines,
    budget,
  };
}

// Clean one meal from the AI into a recipe the app can save, or null if it is unusable.
function toRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim().slice(0, 120);
  if (!name || !Array.isArray(raw.ingredients)) return null;
  // Capping an absurd number would hide the problem, so a meal claiming more than 3,500 kcal is simply refused.
  const claimed = raw.ingredients.slice(0, 15).reduce((sum, i) => sum + Math.max(0, Number(i?.calories) || 0), 0);
  if (claimed > 3500) return null;
  const ingredients = raw.ingredients
    .slice(0, 15)
    .map((i) => ({
      id: newId(),
      name: String(i?.name ?? '').trim().slice(0, 120),
      serving: String(i?.amount ?? '').trim().slice(0, 80),
      calories: Math.round(num(i?.calories, 3000)),
      protein: round1(num(i?.protein, 300)),
      carbs: round1(num(i?.carbs, 500)),
      fat: round1(num(i?.fat, 300)),
    }))
    .filter((i) => i.name);
  if (ingredients.length === 0) return null;
  const calories = ingredients.reduce((sum, i) => sum + i.calories, 0);
  if (calories < 50 || calories > 3500) return null; // not a believable single serving
  // The calories should roughly match the protein, carbs and fat (4, 4 and 9 kcal per gram). If not, the numbers are
  // not to be trusted, and a calorie tracker should not save them.
  const fromMacros = ingredients.reduce((sum, i) => sum + 4 * i.protein + 4 * i.carbs + 9 * i.fat, 0);
  if (Math.abs(fromMacros - calories) > 0.35 * calories + 50) return null;
  return { id: newId(), name, servings: 1, notes: String(raw.notes ?? '').trim().slice(0, 600), ingredients, ai: true };
}

// Returns { accepted: [{ slot, recipe }], removed: [{ name, reasons }], dropped }.
// Meals that break an allergy or diet are removed and reported, never saved. `dropped` counts unusable meals.
export function cleanAiMeals(rawMeals, prefs, allowedSlots = SLOT_IDS) {
  const accepted = [];
  const removed = [];
  let dropped = 0;
  for (const raw of Array.isArray(rawMeals) ? rawMeals.slice(0, 12) : []) {
    const recipe = toRecipe(raw);
    const slot = allowedSlots.includes(raw?.slot) ? raw.slot : null;
    if (!recipe || !slot) {
      dropped += 1;
      continue;
    }
    const { hard } = mealFlags(recipe, prefs);
    if (hard.length > 0) removed.push({ name: recipe.name, reasons: hard });
    else accepted.push({ slot, recipe });
  }
  return { accepted, removed, dropped };
}

export const recipeCalories = (recipe) => recipe.ingredients.reduce((sum, i) => sum + i.calories, 0);

// Plan several whole days, one request per day. A day that fails stops the run but keeps the days that worked.
//   planner(payload)   asks the AI (resolves to { meals }), throws on failure
//   dates              the days to plan, in order
export async function planDays({ planner, dates, slots, context, prefs, onProgress, isCancelled }) {
  const recipes = [];
  const items = [];
  const removed = [];
  const byName = new Map();
  let error = null;
  let daysDone = 0;
  let dropped = 0;

  for (let i = 0; i < dates.length; i++) {
    if (isCancelled?.()) break;
    onProgress?.({ done: i, total: dates.length });
    let reply;
    try {
      reply = await planner({ mode: 'day', dayIndex: i, slots, ...context, avoidNames: recipes.map((r) => r.name).slice(-40) });
    } catch (e) {
      error = e;
      break;
    }
    const result = cleanAiMeals(reply?.meals, prefs, slots);
    dropped += result.dropped;
    removed.push(...result.removed.map((r) => ({ ...r, date: dates[i] })));

    const usedSlots = new Set(); // one meal per meal time per day
    for (const { slot, recipe } of result.accepted) {
      if (usedSlots.has(slot)) {
        dropped += 1;
        continue;
      }
      usedSlots.add(slot);
      const key = recipe.name.toLowerCase();
      let saved = byName.get(key); // the same dish on two days is one recipe
      if (!saved) {
        saved = recipe;
        byName.set(key, saved);
        recipes.push(saved);
      }
      items.push({ id: newId(), date: dates[i], slot, mealId: saved.id, servings: 1, done: false, entryId: '' });
    }
    daysDone = i + 1;
  }
  onProgress?.({ done: daysDone, total: dates.length });
  return { recipes, items, removed, dropped, error, daysDone };
}

// Write a number of separate meals (saved to the recipe book, not placed on any day).
export async function planMeals({ planner, count, slots, context, prefs, existingNames = [] }) {
  let reply;
  try {
    reply = await planner({ mode: 'meals', count, slots, ...context, avoidNames: existingNames.slice(-40) });
  } catch (error) {
    return { recipes: [], removed: [], dropped: 0, error };
  }
  const { accepted, removed, dropped } = cleanAiMeals(reply?.meals, prefs, slots);
  const seen = new Set();
  const recipes = [];
  for (const { recipe } of accepted) {
    const key = recipe.name.toLowerCase();
    if (seen.has(key) || recipes.length >= count) continue;
    seen.add(key);
    recipes.push(recipe);
  }
  return { recipes, removed, dropped: dropped + (accepted.length - recipes.length), error: null };
}

// Calories of each planned day, from freshly generated recipes. Used to warn when a day lands far from the target.
export function dayCalories(recipes, items) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const totals = {};
  for (const item of items) totals[item.date] = (totals[item.date] ?? 0) + recipeCalories(byId.get(item.mealId) ?? { ingredients: [] });
  return totals;
}
