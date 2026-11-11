// The meal planner's data. A plan item puts one saved meal (from the recipe book) into a meal time on a day:
//   { id, date: 'YYYY-MM-DD', slot: 'breakfast'|'lunch'|'dinner'|'snack', mealId, servings, done, entryId }
// `done` means it has been logged to that day's food diary, and `entryId` is the diary entry it created, so logging
// can be undone. Pure functions, no React.
import { MEALS } from './meals.js';
import { fromKey, shiftDay, toKey } from './dates.js';
import { round1 } from './nutrition.js';
import { portion } from './recipes.js';

export const SLOT_IDS = MEALS.map((m) => m.id);
export const MAX_PLAN_PER_DAY = 100;
export const SERVING_CHOICES = [0.5, 1, 1.5, 2, 3];

// Weeks run Monday to Sunday.
export function mondayOf(key) {
  const d = fromKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toKey(d);
}
export const weekDates = (start) => Array.from({ length: 7 }, (_, i) => shiftDay(start, i));

export const cleanPlanItem = (p, date = p?.date) => {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || p.id === '' || p.id.length > 64) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof p.mealId !== 'string' || p.mealId === '' || p.mealId.length > 64) return null;
  const servings = Number(p.servings);
  return {
    id: p.id,
    date,
    slot: SLOT_IDS.includes(p.slot) ? p.slot : 'snack',
    mealId: p.mealId,
    servings: Number.isFinite(servings) && servings > 0 ? Math.min(servings, 50) : 1,
    done: p.done === true,
    entryId: typeof p.entryId === 'string' ? p.entryId.slice(0, 64) : '',
  };
};

// Clean whatever is in storage so a bad value can never crash the app.
export function cleanPlan(saved) {
  if (!Array.isArray(saved)) return [];
  const out = [];
  const seen = new Set();
  const perDay = {};
  for (const raw of saved.slice(0, 5000)) {
    const item = cleanPlanItem(raw);
    if (!item || seen.has(item.id)) continue;
    perDay[item.date] = (perDay[item.date] ?? 0) + 1;
    if (perDay[item.date] > MAX_PLAN_PER_DAY) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

// A day's planned meals in meal-time order (breakfast first).
export const dayPlan = (plan, date) =>
  plan.filter((p) => p.date === date).sort((a, b) => SLOT_IDS.indexOf(a.slot) - SLOT_IDS.indexOf(b.slot));

// Calories and macros planned for a day. Meals that have been deleted from the recipe book count for nothing.
export function dayTotals(plan, meals, date) {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of plan) {
    if (item.date !== date) continue;
    const meal = meals.find((m) => m.id === item.mealId);
    if (!meal) continue;
    const p = portion(meal, item.servings);
    total.calories += p.calories;
    total.protein += p.protein;
    total.carbs += p.carbs;
    total.fat += p.fat;
  }
  return { calories: Math.round(total.calories), protein: round1(total.protein), carbs: round1(total.carbs), fat: round1(total.fat) };
}

// The food diary entry that logging a planned meal creates.
export function entryForPlanItem(item, meal, id) {
  return {
    id,
    date: item.date,
    name: meal.name,
    serving: item.servings === 1 ? '1 serving' : `${item.servings} servings`,
    ...portion(meal, item.servings),
    meal: item.slot,
    source: 'meal',
  };
}
