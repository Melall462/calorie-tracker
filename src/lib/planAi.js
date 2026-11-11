// The app's side of AI planning: build the request, run it day by day, and turn the AI's reply into recipes and plan
// items. Nothing the AI says is trusted. Every meal is size-checked, summed from its ingredients, and screened against
// the person's allergies and diet before it can be saved. Pure functions apart from the `planner` call you pass in.
import { mealFlags } from './mealSafety.js';
import { newId } from './id.js';
import { round1 } from './nutrition.js';
import { SLOT_IDS } from './plan.js';
import { MAX_NOTES, portion } from './recipes.js';

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

// The AI sends instructions as a list of steps. They are stored as numbered lines in the recipe's notes, so they sync
// and show like any recipe's method. (An older-style single note is still accepted.)
function instructionsFrom(raw) {
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .filter((step) => typeof step === 'string')
        .map((step) => step.trim().replace(/^\d{1,2}[.)]\s+/, '').slice(0, 300))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const text = steps.length > 0 ? steps.map((step, i) => `${i + 1}. ${step}`).join('\n') : String(raw.notes ?? '').trim();
  return text.slice(0, MAX_NOTES);
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
  return { id: newId(), name, servings: 1, notes: instructionsFrom(raw), ingredients, ai: true };
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

// How often a plan borrows meals from the person's own recipe book instead of asking the AI for a new one.
export const REUSE_LEVELS = [
  { id: 'never', label: 'Never', chance: 0, maxPerDay: 0 },
  { id: 'sometimes', label: 'Sometimes', chance: 0.3, maxPerDay: 1 },
  { id: 'often', label: 'Often', chance: 0.6, maxPerDay: 2 },
];

// Roughly what share of a day's calories each meal time takes. A saved recipe only suits a meal time if its calories
// fall inside this band, so a 150 kcal snack is never offered as dinner.
const SLOT_SHARE = { breakfast: [0.12, 0.4], lunch: [0.18, 0.45], dinner: [0.22, 0.5], snack: [0.03, 0.22] };
const MIN_LEFT_PER_MEAL = 150; // calories kept back for each meal time the AI still has to write

function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The recipes in the recipe book that are safe to reuse: nothing that breaks a diet or allergy, nothing on the avoid
// list. Each comes with its per-serving nutrition.
export function reusableRecipes(book, prefs) {
  return (Array.isArray(book) ? book : [])
    .filter((r) => r && Array.isArray(r.ingredients) && r.ingredients.length > 0)
    .filter((r) => {
      const f = mealFlags(r, prefs);
      return f.hard.length === 0 && f.soft.length === 0;
    })
    .map((recipe) => ({ recipe, nutrition: portion(recipe, 1) }))
    .filter((x) => x.nutrition.calories >= 50);
}

// Choose which of a day's meal times to fill from the recipe book. Returns [{ slot, recipe, nutrition }].
//   level      one of REUSE_LEVELS (how often, and at most how many in a day)
//   avoidIds   recipes used on the last couple of days, so the plan does not keep repeating itself
//   random     injectable so tests can be exact
export function pickBookMeals({ usable, slots, targets, level, avoidIds = [], random = Math.random }) {
  if (!level || !(level.chance > 0) || !(level.maxPerDay >= 1) || usable.length === 0) return [];
  const taken = new Set(avoidIds);
  const picks = [];
  let left = targets.calories;
  for (const slot of shuffle(slots, random)) {
    if (picks.length >= level.maxPerDay) break;
    if (random() >= level.chance) continue;
    const [low, high] = SLOT_SHARE[slot] ?? [0.05, 0.5];
    const keepBack = (slots.length - picks.length - 1) * MIN_LEFT_PER_MEAL;
    const fits = usable.filter(
      ({ recipe, nutrition }) =>
        !taken.has(recipe.id) && nutrition.calories >= low * targets.calories && nutrition.calories <= high * targets.calories && left - nutrition.calories >= keepBack,
    );
    if (fits.length === 0) continue;
    const chosen = fits[Math.floor(random() * fits.length)];
    taken.add(chosen.recipe.id);
    left -= chosen.nutrition.calories;
    picks.push({ slot, recipe: chosen.recipe, nutrition: chosen.nutrition });
  }
  return picks;
}

// Plan several whole days, one request per day. A day that fails stops the run but keeps the days that worked.
//   planner(payload)   asks the AI (resolves to { meals }), throws on failure
//   dates              the days to plan, in order
//   book, reuse        the recipe book and how often to borrow from it (a REUSE_LEVELS entry). When a day borrows
//                      meals, the AI is only asked for the rest, with the target reduced by what was borrowed, and a
//                      day made entirely of borrowed meals needs no AI request at all.
export async function planDays({ planner, dates, slots, context, prefs, onProgress, isCancelled, book = [], reuse = REUSE_LEVELS[0], random = Math.random }) {
  const recipes = [];
  const items = [];
  const removed = [];
  const byName = new Map();
  const planned = []; // names of every meal planned so far, so the AI does not repeat them
  const recentBook = []; // book recipes used on the last two days
  const usable = reuse.chance > 0 ? reusableRecipes(book, prefs) : [];
  let error = null;
  let daysDone = 0;
  let dropped = 0;
  let reused = 0;

  for (let i = 0; i < dates.length; i++) {
    if (isCancelled?.()) break;
    onProgress?.({ done: i, total: dates.length });

    const picks = pickBookMeals({ usable, slots, targets: context.targets, level: reuse, avoidIds: recentBook.flat(), random });
    const pickedSlots = new Set(picks.map((p) => p.slot));
    const remainingSlots = slots.filter((s) => !pickedSlots.has(s));

    let reply = { meals: [] };
    if (remainingSlots.length > 0) {
      const payload = { mode: 'day', dayIndex: i, slots: remainingSlots, ...context, avoidNames: planned.slice(-40) };
      if (picks.length > 0) {
        const left = (key) => Math.max(0, Math.round(context.targets[key] - picks.reduce((sum, p) => sum + p.nutrition[key], 0)));
        payload.partial = true;
        payload.targets = { calories: left('calories'), protein: left('protein'), carbs: left('carbs'), fat: left('fat') };
        payload.existing = picks.map((p) => ({ slot: p.slot, name: p.recipe.name, calories: p.nutrition.calories }));
      }
      try {
        reply = await planner(payload);
      } catch (e) {
        error = e;
        break;
      }
    }
    const result = cleanAiMeals(reply?.meals, prefs, remainingSlots);
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
      planned.push(saved.name);
      items.push({ id: newId(), date: dates[i], slot, mealId: saved.id, servings: 1, done: false, entryId: '' });
    }
    for (const pick of picks) {
      planned.push(pick.recipe.name);
      items.push({ id: newId(), date: dates[i], slot: pick.slot, mealId: pick.recipe.id, servings: 1, done: false, entryId: '' });
      reused += 1;
    }
    recentBook.push(picks.map((p) => p.recipe.id));
    if (recentBook.length > 2) recentBook.shift();
    daysDone = i + 1;
  }
  onProgress?.({ done: daysDone, total: dates.length });
  return { recipes, items, removed, dropped, error, daysDone, reused };
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

// Calories of each planned day. `recipes` should hold every recipe the items use (new ones and ones from the recipe
// book). Used to warn when a day lands far from the target.
export function dayCalories(recipes, items) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const totals = {};
  for (const item of items) totals[item.date] = (totals[item.date] ?? 0) + recipeCalories(byId.get(item.mealId) ?? { ingredients: [] });
  return totals;
}
