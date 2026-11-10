// Barcode lookup against Open Food Facts (a free, community-built food database, no API key).
// Pure functions plus one fetch call, so the parsing and maths are easy to test.
import { round1 } from './nutrition.js';

const API = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';
const TIMEOUT_MS = 12000;

// Barcodes are 8, 12, 13 or 14 digits and the last digit is a check digit. Checking it catches typos.
export function isValidGtin(code) {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, d, i) => total + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// Read the digits out of whatever a scanner or a person gave us ("3017 6204 22003" becomes "3017620422003").
export const digitsOnly = (text) => String(text ?? '').replace(/\D/g, '');

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Turn the API reply into the small shape the app needs. Returns null when the product is not in the database.
// The database holds nutrition per 100 g (or 100 ml) and, when the pack lists it, per serving. Any field can be
// missing, so everything is optional. The result has:
//   per100      nutrition per 100 g/ml, or null if it cannot be worked out
//   perServing  nutrition for one serving as printed on the pack, or null if there is no serving size
//   servingText the serving size exactly as the pack says it (for example "2 biscuits (25 g)")
//   servingAmount the serving in g or ml, when known
export function parseProduct(json) {
  const p = json?.product;
  if (!json || json.status !== 1 || !p) return null;
  const n = p.nutriments || {};

  const energy = (kcalKey, kjKey) => {
    const kcal = num(n[kcalKey]);
    if (kcal !== null) return kcal;
    const kj = num(n[kjKey]); // some products only list kilojoules
    return kj === null ? null : kj / 4.184;
  };

  let cal100 = energy('energy-kcal_100g', 'energy_100g');
  let protein100 = num(n.proteins_100g);
  let carbs100 = num(n.carbohydrates_100g);
  let fat100 = num(n.fat_100g);

  let calServing = energy('energy-kcal_serving', 'energy_serving');
  const proteinServing = num(n.proteins_serving);
  const carbsServing = num(n.carbohydrates_serving);
  const fatServing = num(n.fat_serving);

  const servingText = String(p.serving_size ?? '').trim();
  const servingQty = num(p.serving_quantity);
  const servingAmount = servingQty !== null && servingQty > 0 && servingQty <= 2000 ? servingQty : null;

  // A pack that only lists per-serving values: work the per-100 values back from the serving size.
  if (servingAmount !== null) {
    const up = 100 / servingAmount;
    if (cal100 === null && calServing !== null) cal100 = calServing * up;
    if (protein100 === null && proteinServing !== null) protein100 = proteinServing * up;
    if (carbs100 === null && carbsServing !== null) carbs100 = carbsServing * up;
    if (fat100 === null && fatServing !== null) fat100 = fatServing * up;
  }
  if (cal100 === null && (protein100 !== null || carbs100 !== null || fat100 !== null)) {
    cal100 = (protein100 ?? 0) * 4 + (carbs100 ?? 0) * 4 + (fat100 ?? 0) * 9;
  }

  const per100 =
    cal100 === null ? null : { calories: Math.round(cal100), protein: round1(protein100 ?? 0), carbs: round1(carbs100 ?? 0), fat: round1(fat100 ?? 0) };

  // Per serving: use the pack's own serving values when it has them, otherwise scale the per-100 values.
  let perServing = null;
  if (calServing !== null) {
    const down = servingAmount !== null ? servingAmount / 100 : null;
    perServing = {
      calories: Math.round(calServing),
      protein: round1(proteinServing ?? (down !== null && protein100 !== null ? protein100 * down : 0)),
      carbs: round1(carbsServing ?? (down !== null && carbs100 !== null ? carbs100 * down : 0)),
      fat: round1(fatServing ?? (down !== null && fat100 !== null ? fat100 * down : 0)),
    };
  } else if (servingAmount !== null && cal100 !== null) {
    const down = servingAmount / 100;
    perServing = {
      calories: Math.round(cal100 * down),
      protein: round1((protein100 ?? 0) * down),
      carbs: round1((carbs100 ?? 0) * down),
      fat: round1((fat100 ?? 0) * down),
    };
  }

  return {
    code: String(p.code ?? json.code ?? ''),
    name: String(p.product_name ?? '').trim() || 'Unnamed product',
    brand: String(p.brands ?? '').split(',')[0].trim(),
    unit: /ml\b/i.test(servingText) ? 'ml' : 'g',
    servingText,
    servingAmount,
    hasNutrition: per100 !== null || perServing !== null,
    per100,
    perServing,
  };
}

const scaleBy = (values, k) => ({
  calories: Math.round(values.calories * k),
  protein: round1(values.protein * k),
  carbs: round1(values.carbs * k),
  fat: round1(values.fat * k),
});

// Nutrition for eating `amount` grams (or ml) of a product. Needs per100.
export const scaleProduct = (product, amount) => scaleBy(product.per100, amount / 100);

// Nutrition for eating `servings` servings, using the serving size on the pack. Needs perServing.
export const scaleServings = (product, servings) => scaleBy(product.perServing, servings);

const cache = new Map(); // remembers answers for this visit, so scanning the same pack twice is instant

// Returns a parsed product, or null if the barcode is not in the database. Throws an Error with a plain message
// for network and server problems.
export async function lookupBarcode(code, fetchImpl = fetch) {
  if (cache.has(code)) return cache.get(code);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetchImpl(`${API}${code}.json?fields=${FIELDS}`, { signal: controller.signal });
  } catch (e) {
    throw new Error(
      e?.name === 'AbortError'
        ? 'Open Food Facts took too long to answer. Try again.'
        : "Couldn't reach Open Food Facts. Check your connection and try again."
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 404) {
    cache.set(code, null);
    return null;
  }
  if (!res.ok) throw new Error('Open Food Facts is having a problem. Try again in a moment.');

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Open Food Facts sent a reply we could not read. Try again.');
  }
  const product = parseProduct(json);
  cache.set(code, product);
  return product;
}
