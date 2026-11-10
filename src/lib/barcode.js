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
// Nutrition in the database is per 100 g (or 100 ml). Any field can be missing, so everything is optional.
export function parseProduct(json) {
  const p = json?.product;
  if (!json || json.status !== 1 || !p) return null;
  const n = p.nutriments || {};

  let calories = num(n['energy-kcal_100g']);
  if (calories === null) {
    const kj = num(n['energy_100g']); // some products only list kilojoules
    if (kj !== null) calories = kj / 4.184;
  }
  const protein = num(n.proteins_100g);
  const carbs = num(n.carbohydrates_100g);
  const fat = num(n.fat_100g);
  if (calories === null && (protein !== null || carbs !== null || fat !== null)) {
    calories = (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;
  }

  const servingText = String(p.serving_size ?? '').trim();
  const servingQty = num(p.serving_quantity);

  return {
    code: String(p.code ?? json.code ?? ''),
    name: String(p.product_name ?? '').trim() || 'Unnamed product',
    brand: String(p.brands ?? '').split(',')[0].trim(),
    unit: /ml\b/i.test(servingText) ? 'ml' : 'g',
    servingText,
    servingAmount: servingQty !== null && servingQty > 0 && servingQty <= 2000 ? servingQty : null,
    hasNutrition: calories !== null,
    per100: {
      calories: Math.round(calories ?? 0),
      protein: round1(protein ?? 0),
      carbs: round1(carbs ?? 0),
      fat: round1(fat ?? 0),
    },
  };
}

// Nutrition for eating `amount` grams (or ml) of a product.
export function scaleProduct(product, amount) {
  const k = amount / 100;
  return {
    calories: Math.round(product.per100.calories * k),
    protein: round1(product.per100.protein * k),
    carbs: round1(product.per100.carbs * k),
    fat: round1(product.per100.fat * k),
  };
}

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
