// Sync units: the app's data, cut into pieces that can be saved to the cloud and merged independently.
//
//   day:YYYY-MM-DD   everything for one day: its food entries, planned meals, water and weigh-in
//   settings         targets, body stats, food preferences and whether setup is done
//   meals            the recipe book
//   foods            the foods scanned or typed in (My foods)
//
// A day is the natural unit: two devices rarely edit the same day at the same moment, and a sync only has to move
// the days that changed. Pure functions, no React.
import { DEFAULT_GOALS, WATER_MAX, WEIGHT_LIMITS, round1, sanitizeGoals } from './nutrition.js';
import { DEFAULT_PROFILE, cleanProfile } from './calculator.js';
import { EMPTY_PREFERENCES, cleanPreferences } from './preferences.js';
import { cleanMeals } from './recipes.js';
import { cleanFoods } from './myFoods.js';
import { MEALS } from './meals.js';
import { cleanPlanItem, MAX_PLAN_PER_DAY } from './plan.js';

const MEAL_IDS = MEALS.map((m) => m.id);
const SOURCES = ['search', 'manual', 'meal', 'scan', 'ai'];

export const isDayKey = (key) => /^day:\d{4}-\d{2}-\d{2}$/.test(key);
export const dayKey = (date) => `day:${date}`;
export const dateOf = (key) => key.slice(4);
export const isKnownKey = (key) => key === 'settings' || key === 'meals' || key === 'foods' || isDayKey(key);

// What a unit looks like before anything has been saved. A unit equal to this has "no changes".
export function emptyUnit(key) {
  if (key === 'settings') {
    return {
      goals: { ...DEFAULT_GOALS },
      profile: { ...DEFAULT_PROFILE },
      preferences: { diets: [...EMPTY_PREFERENCES.diets], avoid: [...EMPTY_PREFERENCES.avoid], likes: [], dislikes: [] },
      onboarded: false,
    };
  }
  if (key === 'meals') return { meals: [] };
  if (key === 'foods') return { foods: [] };
  return { entries: [], plan: [], water: 0, weight: null };
}

/* ---------- Comparing ---------- */

// A canonical string for any value. Arrays are compared without regard to order, so two devices holding the same
// entries in a different order do not look like a change.
function canon(v) {
  if (v === undefined) return 'u';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).sort().join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}
export const same = (a, b) => canon(a) === canon(b);

/* ---------- Cleaning (never trust stored or downloaded data) ---------- */

const num = (v, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

function cleanEntry(e, date) {
  if (!e || typeof e !== 'object' || typeof e.id !== 'string' || e.id === '' || e.id.length > 64) return null;
  const name = String(e.name ?? '').trim().slice(0, 120);
  if (!name) return null;
  return {
    id: e.id,
    date,
    name,
    serving: String(e.serving ?? '').slice(0, 80),
    calories: Math.round(num(e.calories, 10000)),
    protein: round1(num(e.protein, 1000)),
    carbs: round1(num(e.carbs, 2000)),
    fat: round1(num(e.fat, 1000)),
    meal: MEAL_IDS.includes(e.meal) ? e.meal : 'snack',
    source: SOURCES.includes(e.source) ? e.source : 'manual',
  };
}

// Returns a safe unit, or null if the key is not one we know.
export function cleanUnit(key, value) {
  const v = value && typeof value === 'object' ? value : {};
  if (key === 'settings') {
    return {
      goals: sanitizeGoals(v.goals),
      profile: cleanProfile(v.profile),
      preferences: cleanPreferences(v.preferences),
      onboarded: v.onboarded === true,
    };
  }
  if (key === 'meals') return { meals: cleanMeals(v.meals) };
  if (key === 'foods') return { foods: cleanFoods(v.foods) };
  if (!isDayKey(key)) return null;
  const date = dateOf(key);
  const seen = new Set();
  const entries = [];
  for (const raw of Array.isArray(v.entries) ? v.entries.slice(0, 300) : []) {
    const entry = cleanEntry(raw, date);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      entries.push(entry);
    }
  }
  const planSeen = new Set();
  const plan = [];
  for (const raw of Array.isArray(v.plan) ? v.plan.slice(0, MAX_PLAN_PER_DAY) : []) {
    const item = cleanPlanItem(raw, date);
    if (item && !planSeen.has(item.id)) {
      planSeen.add(item.id);
      plan.push(item);
    }
  }
  const weight = Number(v.weight);
  return {
    entries,
    plan,
    water: Math.round(num(v.water, WATER_MAX)),
    weight: v.weight !== null && v.weight !== undefined && Number.isFinite(weight) && weight >= WEIGHT_LIMITS[0] && weight <= WEIGHT_LIMITS[1] ? round1(weight) : null,
  };
}

/* ---------- App state <-> units ---------- */

// Cut the app's state into units. Only days with something in them are included.
export function collectUnits({ entries, plan = [], water, weights, goals, profile, preferences, onboarded, meals, foods = [] }) {
  const days = {};
  const day = (date) => (days[date] ??= { entries: [], plan: [], water: 0, weight: null });
  for (const e of entries) if (e && typeof e.date === 'string') day(e.date).entries.push(e);
  for (const p of plan) if (p && typeof p.date === 'string') day(p.date).plan.push(p);
  for (const [date, ml] of Object.entries(water)) if (Number(ml) > 0) day(date).water = Number(ml);
  for (const [date, kg] of Object.entries(weights)) day(date).weight = kg;

  const units = {};
  for (const [date, value] of Object.entries(days)) if (/^\d{4}-\d{2}-\d{2}$/.test(date)) units[dayKey(date)] = value;
  units.settings = { goals, profile, preferences, onboarded: onboarded === true };
  units.meals = { meals };
  if (foods.length > 0) units.foods = { foods }; // like an empty day: nothing to send until there is something (a missing unit counts as empty)
  return units;
}

// Write units into the app's data. Pure: returns new state and keeps the same reference for anything untouched.
export function applyUnits(state, units) {
  let { entries, plan = [], water, weights, goals, profile, preferences, onboarded, meals, foods = [] } = state;
  for (const [key, value] of Object.entries(units)) {
    if (isDayKey(key)) {
      const date = dateOf(key);
      entries = [...entries.filter((e) => e.date !== date), ...value.entries];
      plan = [...plan.filter((p) => p.date !== date), ...value.plan];
      water = { ...water };
      if (value.water > 0) water[date] = value.water;
      else delete water[date];
      weights = { ...weights };
      if (value.weight !== null) weights[date] = value.weight;
      else delete weights[date];
    } else if (key === 'settings') {
      goals = value.goals;
      profile = value.profile;
      preferences = value.preferences;
      if (value.onboarded) onboarded = true;
    } else if (key === 'meals') {
      meals = value.meals;
    } else if (key === 'foods') {
      foods = value.foods;
    }
  }
  return { entries, plan, water, weights, goals, profile, preferences, onboarded, meals, foods };
}
