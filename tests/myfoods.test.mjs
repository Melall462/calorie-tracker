// Run with: npm test
// Tests "My foods": the foods someone scanned or typed in, kept for quick access (src/lib/myFoods.js).
import { MAX_SAVED_FOODS, cleanFood, cleanFoods, customProduct, findByCode, forgetFood, pruneFoods, rememberFood, touchFood } from '../src/lib/myFoods.js';
import { parseProduct } from '../src/lib/barcode.js';
import { EMPTY_PREFERENCES, productTags } from '../src/lib/preferences.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };
const P = (o = {}) => ({ ...EMPTY_PREFERENCES, ...o });

const scanned = (code, name = 'Yoghurt', extra = {}) => ({ code, name, brand: 'Brand', unit: 'g', servingText: '170 g', servingAmount: 170, allergens: ['en:milk'], traces: [], analysis: ['en:vegetarian'], hasNutrition: true, per100: { calories: 60, protein: 10, carbs: 4, fat: 0.5 }, perServing: { calories: 102, protein: 17, carbs: 6.8, fat: 0.9 }, ...extra });
const CODE_A = '3017620422003', CODE_B = '5000112637922', CODE_C = '9300675024235';

// ---- saving ----
let foods = rememberFood([], scanned(CODE_A, 'Hazelnut spread'), 1000);
ok('a scanned food is saved with its barcode as the id, marked used now', foods.length === 1 && foods[0].id === CODE_A && foods[0].code === CODE_A && foods[0].lastUsed === 1000 && foods[0].custom === false && foods[0].name === 'Hazelnut spread');
foods = rememberFood(foods, scanned(CODE_B, 'Yoghurt'), 2000);
ok('newest first', foods.map((f) => f.name).join() === 'Yoghurt,Hazelnut spread');
foods = rememberFood(foods, scanned(CODE_A, 'Hazelnut spread (updated)'), 3000);
ok('scanning the same barcode again is one food, refreshed and moved to the top (no duplicates)', foods.length === 2 && foods[0].name === 'Hazelnut spread (updated)' && foods[0].lastUsed === 3000);
foods = touchFood(foods, CODE_B, 4000);
ok('using a food moves it to the top', foods.map((f) => f.id).join() === `${CODE_B},${CODE_A}` || cleanFoods(foods).map((f) => f.id).join() === `${CODE_B},${CODE_A}`);
ok('touching an unknown food changes nothing', touchFood(foods, 'nope', 5000) === foods);
ok('a food can be found by its barcode, and an unknown or blank code finds nothing', findByCode(foods, CODE_A)?.id === CODE_A && findByCode(foods, '123') === null && findByCode(foods, '') === null);
ok('a food can be removed', forgetFood(foods, CODE_A).length === 1 && forgetFood(foods, CODE_A)[0].id === CODE_B && forgetFood(foods, 'nope').length === 2);
ok('a product with no usable nutrition is not saved', rememberFood([], scanned(CODE_C, 'No data', { per100: null, perServing: null, hasNutrition: false })).length === 0);
ok('a nameless or broken product is not saved', rememberFood([], scanned(CODE_C, '   ')).length === 0 && rememberFood([], null).length === 0 && rememberFood([], undefined).length === 0 && rememberFood([], 'x').length === 0);

// ---- foods typed in ----
const mine = customProduct({ name: 'Mum\'s lasagne', calories: 520, protein: 30, carbs: 48, fat: 22, code: CODE_C });
foods = rememberFood([], mine, 10);
ok('a typed-in food keeps its barcode, so scanning that barcode finds it', foods[0].id === CODE_C && foods[0].custom === true && foods[0].perServing.calories === 520 && foods[0].per100 === null && findByCode(foods, CODE_C).name === 'Mum\'s lasagne');
const noCode = rememberFood([], customProduct({ name: 'Leftover rice', calories: 300, protein: 6, carbs: 60, fat: 2 }), 10);
ok('a typed-in food without a barcode gets its own id and is found by name, not code', noCode[0].id.length > 8 && noCode[0].code === '' && findByCode(noCode, '') === null);
const two = rememberFood(noCode, customProduct({ name: 'Leftover rice', calories: 300, protein: 6, carbs: 60, fat: 2 }), 20);
ok('two typed-in foods with the same name are kept separately (the person can delete one)', two.length === 2 && new Set(two.map((f) => f.id)).size === 2);

// ---- cleaning what is in storage ----
ok('a broken list is harmless', cleanFoods(null).length === 0 && cleanFoods('x').length === 0 && cleanFoods({}).length === 0 && cleanFoods([null, 5, 'x', {}, { id: 'a' }, { id: 'b', name: 'N' }]).length === 0);
const dirty = cleanFood({ id: 'x'.repeat(100), code: 'abc', name: ' ' + 'N'.repeat(500), brand: 'B'.repeat(500), unit: 'oz', servingText: 'S'.repeat(500), servingAmount: 99999, allergens: ['EN:MILK', 5, null, ...Array(40).fill('en:x')], perServing: { calories: -5, protein: 'abc', carbs: 1e9, fat: 2.26 }, per100: null, lastUsed: 'yesterday', custom: 'yes' });
ok('a food with no usable id is dropped, a bad barcode is not used as an id', dirty === null && cleanFood({ code: 'abc', name: 'N', perServing: { calories: 5 } }) === null);
const tidy = cleanFood({ id: 'ok', code: 'abc', name: ' ' + 'N'.repeat(500), brand: 'B'.repeat(500), unit: 'oz', servingText: 'S'.repeat(500), servingAmount: 99999, allergens: ['EN:MILK', 5, null, ...Array(40).fill('en:x')], perServing: { calories: -5, protein: 'abc', carbs: 1e9, fat: 2.26 }, per100: null, lastUsed: 'yesterday', custom: 'yes' });
ok('names, brands and texts are cut to length, units and numbers are made safe, tags are lowercased and limited', tidy.name.length === 120 && tidy.brand.length === 80 && tidy.servingText.length === 80 && tidy.unit === 'g' && tidy.servingAmount === null && tidy.allergens[0] === 'en:milk' && tidy.allergens.length === 16 && tidy.perServing.calories === 0 && tidy.perServing.protein === 0 && tidy.perServing.carbs === 2000 && tidy.perServing.fat === 2.3 && tidy.lastUsed === 0 && tidy.custom === false && tidy.code === '');
ok('duplicates in storage keep the most recently used one', cleanFoods([{ ...scanned(CODE_A, 'Old'), lastUsed: 5 }, { ...scanned(CODE_A, 'New'), lastUsed: 9 }, { ...scanned(CODE_A, 'Older'), lastUsed: 1 }]).map((f) => f.name).join() === 'New');
ok('a real parsed Open Food Facts product can be saved as it is', (() => { const prod = parseProduct({ status: 1, product: { code: CODE_A, product_name: 'Spread', brands: 'Nutella, Ferrero', serving_size: '15 g', serving_quantity: 15, nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 }, allergens_tags: ['en:milk', 'en:nuts'], ingredients_analysis_tags: ['en:non-vegan'] } }); const saved = rememberFood([], prod, 7); return saved[0].name === 'Spread' && saved[0].brand === 'Nutella' && saved[0].per100.calories === 539 && saved[0].perServing.calories === 81 && saved[0].allergens.join() === 'en:milk,en:nuts' && saved[0].analysis.join() === 'en:non-vegan' && saved[0].servingAmount === 15; })());

// ---- the list is capped, and keeps the foods that cannot be recovered ----
const many = (n, custom = false, from = 0) => Array.from({ length: n }, (_, i) => ({ ...scanned(String(1000000000000 + from + i), 'Food ' + (from + i)), id: String(1000000000000 + from + i), custom, per100: custom ? null : scanned('x').per100, lastUsed: from + i + 1 }));
const pruned = pruneFoods([...many(100, false, 0), ...many(80, true, 1000)]);
ok('over the cap, the oldest scanned foods go first and every typed-in food stays', pruned.length === MAX_SAVED_FOODS && pruned.filter((f) => f.custom).length === 80 && pruned.filter((f) => !f.custom).length === 70 && !pruned.some((f) => f.name === 'Food 0') && pruned.some((f) => f.name === 'Food 99'));
const allCustom = pruneFoods(many(MAX_SAVED_FOODS + 5, true, 0));
ok('if everything was typed in, the oldest of those go', allCustom.length === MAX_SAVED_FOODS && !allCustom.some((f) => f.name === 'Food 0') && allCustom.some((f) => f.name === 'Food ' + (MAX_SAVED_FOODS + 4)));
ok('saving a new food into a full list keeps the cap and the new food', (() => { const full = pruneFoods(many(MAX_SAVED_FOODS)); const next = rememberFood(full, scanned(CODE_C, 'Brand new'), 99999); return next.length === MAX_SAVED_FOODS && next[0].name === 'Brand new'; })());
ok('a list in storage is capped too, however big it is', cleanFoods(many(1000)).length === MAX_SAVED_FOODS);
ok('a full list is a safe size to sync (well under 256 KB)', JSON.stringify(cleanFoods(many(MAX_SAVED_FOODS).map((f) => ({ ...f, allergens: Array(16).fill('en:allergen-tag-example'), traces: Array(16).fill('en:trace-tag-example'), analysis: Array(16).fill('en:analysis-tag-example'), brand: 'B'.repeat(80), servingText: 'S'.repeat(80) })))).length < 256 * 1024);

// ---- short tags for the list ----
const dairyPrefs = P({ avoid: ['dairy', 'peanut'], diets: ['vegan'] });
let t = productTags(scanned(CODE_A, 'x', { allergens: ['en:milk'], traces: ['en:peanuts'], analysis: ['en:non-vegan'] }), dairyPrefs);
ok('tags say what the database lists against the person\'s rules, and traces only as "may contain"', t.flags.join() === 'Contains dairy,Not vegan' && t.traces.join() === 'May contain peanuts');
t = productTags(scanned(CODE_A, 'x', { allergens: [], traces: [], analysis: [] }), dairyPrefs);
ok('a product the database says nothing about gets no tags (the app still reminds people to check the label)', t.flags.length === 0 && t.traces.length === 0);
t = productTags(scanned(CODE_A, 'x', { analysis: ['en:non-vegetarian', 'en:non-vegan'] }), P({ diets: ['vegetarian'] }));
ok('vegetarian people are told "Not vegetarian" (and not twice)', t.flags.join() === 'Not vegetarian');
ok('with no preferences there are no tags', productTags(scanned(CODE_A), P()).flags.length === 0);
ok('custom foods have nothing to flag', productTags(customProduct({ name: 'x', calories: 1, protein: 0, carbs: 0, fat: 0 }), dairyPrefs).flags.length === 0);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
