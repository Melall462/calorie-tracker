// Run with: npm test
// Tests the recipe helpers: reading instructions, scaling ingredient amounts, and keeping the recipe book a safe size.
import { MAX_MEALS, MAX_NOTES, cleanMeals, scaleAmount, stepsOf } from '../src/lib/recipes.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };

// ---- instructions ----
ok('numbered lines are read as a list of steps', stepsOf('1. Boil water.\n2. Add rice.\n3) Serve.').join('|') === 'Boil water.|Add rice.|Serve.');
ok('a single line, or text that is not numbered, is shown as written (null)', stepsOf('Cook it.') === null && stepsOf('1. Only one') === null && stepsOf('Boil water.\nAdd rice.') === null && stepsOf('1. Boil.\nthen add rice') === null);
ok('empty and odd values are harmless', stepsOf('') === null && stepsOf(undefined) === null && stepsOf(null) === null && stepsOf(42) === null);
ok('blank lines in between are ignored', stepsOf('1. A\n\n2. B\n\n').join('|') === 'A|B');

// ---- scaling amounts ----
ok('a whole recipe (x1) is returned as written', scaleAmount('60 g', 1) === '60 g' && scaleAmount('  1 tbsp ', 1) === '1 tbsp');
ok('numbers are multiplied, units kept ("60 g" x1.5 = "90 g", "2 eggs" x2 = "4 eggs")', scaleAmount('60 g', 1.5) === '90 g' && scaleAmount('2 eggs', 2) === '4 eggs' && scaleAmount('100g', 0.5) === '50g');
ok('decimals, fractions and mixed numbers work', scaleAmount('0.5 cup', 3) === '1.5 cup' && scaleAmount('1/2 tsp', 2) === '1 tsp' && scaleAmount('1 1/2 cups', 2) === '3 cups' && scaleAmount('1/3 cup', 3) === '1 cup');
ok('awkward rounding is tidied to two places', scaleAmount('100 g', 1 / 3) === '33.33 g' && scaleAmount('1 tsp', 1.5) === '1.5 tsp');
ok('amounts that are not plain numbers are not guessed at ("a pinch", "to taste", "1-2 cloves", "1 or 2")', scaleAmount('a pinch', 2) === 'a pinch (x2)' && scaleAmount('to taste', 0.5) === 'to taste (x0.5)' && scaleAmount('1-2 cloves', 2) === '1-2 cloves (x2)' && scaleAmount('1 or 2 limes', 2) === '1 or 2 limes (x2)' && scaleAmount('1 to 2 cloves', 2) === '1 to 2 cloves (x2)');
ok('empty amounts and bad factors are harmless', scaleAmount('', 2) === '' && scaleAmount(undefined, 2) === '' && scaleAmount('60 g', 0) === '60 g' && scaleAmount('60 g', -1) === '60 g' && scaleAmount('60 g', NaN) === '60 g');

// ---- the recipe book stays a safe size ----
const recipe = (i, notes = '') => ({ id: 'm' + i, name: 'Meal ' + i, servings: 1, notes, ingredients: [{ id: 'i' + i, name: 'Rice', serving: '100 g', calories: 130, protein: 3, carbs: 28, fat: 0 }] });
ok('the recipe book holds at most 300 recipes (so it always fits in one synced record)', MAX_MEALS === 300 && cleanMeals(Array.from({ length: 400 }, (_, i) => recipe(i))).length === 300);
ok('instructions are kept up to 2,000 characters', MAX_NOTES === 2000 && cleanMeals([recipe(1, 'x'.repeat(5000))])[0].notes.length === 2000 && cleanMeals([recipe(1, '1. Boil.\n2. Serve.')])[0].notes === '1. Boil.\n2. Serve.');
const full = cleanMeals(Array.from({ length: 300 }, (_, i) => ({ ...recipe(i, 'x'.repeat(2000)), ingredients: Array.from({ length: 15 }, (_, k) => ({ id: `i${i}-${k}`, name: 'Ingredient number ' + k, serving: '100 g of something', calories: 100, protein: 5, carbs: 10, fat: 3 })) })));
ok('even a full recipe book of long, detailed recipes stays under the 2 MB sync limit', JSON.stringify({ meals: full }).length < 2 * 1024 * 1024, String(JSON.stringify({ meals: full }).length));

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
