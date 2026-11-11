// My foods: the foods someone has scanned or entered themselves, kept for quick access in Add food > Search.
// Pure functions, no React.
//
// A saved food is the same shape lib/barcode.js returns for a scanned product, plus an id and when it was last used:
//   { id, code, name, brand, unit, servingText, servingAmount, allergens, traces, analysis, hasNutrition,
//     per100, perServing, custom, lastUsed }
// `code` is the barcode (or '' for a food typed in without one), and it is also the id when there is one, so scanning
// the same barcode twice is one food. `custom` is true for foods the person typed in, which only have per-serving numbers.
import { newId } from './id.js';
import { round1 } from './nutrition.js';

// The whole list syncs as one record. 150 foods is about 90 KB, well inside the limit, and plenty for the foods a
// person really eats. When it is full the oldest scanned food goes first (it can be scanned again); foods the person
// typed in go last because those cannot be recovered.
export const MAX_SAVED_FOODS = 150;

const num = (v, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

const cleanValues = (v) =>
  v && typeof v === 'object'
    ? { calories: Math.round(num(v.calories, 10000)), protein: round1(num(v.protein, 1000)), carbs: round1(num(v.carbs, 2000)), fat: round1(num(v.fat, 1000)) }
    : null;

const tags = (value) =>
  Array.isArray(value) ? value.filter((t) => typeof t === 'string').map((t) => t.toLowerCase().slice(0, 60)).slice(0, 16) : [];

// One saved food, cleaned. Returns null when it is not usable (no name, nothing to say about nutrition, no id).
export function cleanFood(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = /^\d{8,14}$/.test(String(raw.code ?? '')) ? String(raw.code) : '';
  const id = typeof raw.id === 'string' && raw.id !== '' && raw.id.length <= 64 ? raw.id : code;
  const name = String(raw.name ?? '').trim().slice(0, 120);
  const per100 = cleanValues(raw.per100);
  const perServing = cleanValues(raw.perServing);
  if (!id || !name || (!per100 && !perServing)) return null;
  const amount = Number(raw.servingAmount);
  const last = Number(raw.lastUsed);
  return {
    id,
    code,
    name,
    brand: String(raw.brand ?? '').trim().slice(0, 80),
    unit: raw.unit === 'ml' ? 'ml' : 'g',
    servingText: String(raw.servingText ?? '').trim().slice(0, 80),
    servingAmount: Number.isFinite(amount) && amount > 0 && amount <= 2000 ? amount : null,
    allergens: tags(raw.allergens),
    traces: tags(raw.traces),
    analysis: tags(raw.analysis),
    hasNutrition: true,
    per100,
    perServing,
    custom: raw.custom === true,
    lastUsed: Number.isFinite(last) && last >= 0 ? last : 0,
  };
}

// Make room: drop the oldest scanned foods first, then the oldest typed-in ones. Newest first on the way out.
export function pruneFoods(foods, max = MAX_SAVED_FOODS) {
  const byRecent = [...foods].sort((a, b) => b.lastUsed - a.lastUsed);
  if (byRecent.length <= max) return byRecent;
  const drop = new Set();
  const oldestFirst = [...byRecent].reverse();
  for (const f of oldestFirst.filter((x) => !x.custom)) {
    if (byRecent.length - drop.size <= max) break;
    drop.add(f.id);
  }
  for (const f of oldestFirst.filter((x) => x.custom)) {
    if (byRecent.length - drop.size <= max) break;
    drop.add(f.id);
  }
  return byRecent.filter((f) => !drop.has(f.id));
}

// Whatever is in storage, made safe. Broken foods are dropped, duplicates keep the most recently used.
export function cleanFoods(saved) {
  if (!Array.isArray(saved)) return [];
  const byId = new Map();
  for (const raw of saved.slice(0, MAX_SAVED_FOODS * 2)) {
    const food = cleanFood(raw);
    if (!food) continue;
    const existing = byId.get(food.id);
    if (!existing || food.lastUsed > existing.lastUsed) byId.set(food.id, food);
  }
  return pruneFoods([...byId.values()]);
}

// A food the person typed in becomes a product with one serving's worth of numbers.
export function customProduct({ name, calories, protein, carbs, fat, code = '' }) {
  return {
    code,
    name,
    brand: '',
    unit: 'g',
    servingText: '',
    servingAmount: null,
    allergens: [],
    traces: [],
    analysis: [],
    hasNutrition: true,
    per100: null,
    perServing: { calories, protein, carbs, fat },
    custom: true,
  };
}

// Save a food (or refresh one that is already saved) and mark it as just used. Returns the new list.
export function rememberFood(foods, product, now = Date.now()) {
  const code = /^\d{8,14}$/.test(String(product?.code ?? '')) ? String(product.code) : '';
  const food = cleanFood({ ...product, id: code || product?.id || newId(), lastUsed: now });
  if (!food) return foods;
  return pruneFoods([food, ...foods.filter((f) => f.id !== food.id)]);
}

export const touchFood = (foods, id, now = Date.now()) => (foods.some((f) => f.id === id) ? foods.map((f) => (f.id === id ? { ...f, lastUsed: now } : f)) : foods);
export const forgetFood = (foods, id) => foods.filter((f) => f.id !== id);
export const findByCode = (foods, code) => foods.find((f) => f.code !== '' && f.code === code) ?? null;
