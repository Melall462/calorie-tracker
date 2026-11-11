// Run with: npm test
// Tests how the app turns AI replies into recipes and runs multi-day plans (src/lib/planAi.js).
import { REUSE_LEVELS, buildContext, cleanAiMeals, dayCalories, pickBookMeals, planDays, planMeals, recipeCalories, reusableRecipes } from '../src/lib/planAi.js';
import { EMPTY_PREFERENCES } from '../src/lib/preferences.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };
const P = (o = {}) => ({ ...EMPTY_PREFERENCES, ...o });
// Sample ingredients are internally consistent: calories are about 4 x protein + 4 x carbs + 9 x fat.
const ing = (name, calories, protein, carbs, fat, amount = '100 g') => ({ name, amount, calories, protein: protein ?? Math.round(calories * 0.2 / 4), carbs: carbs ?? Math.round(calories * 0.5 / 4), fat: fat ?? Math.round(calories * 0.3 / 9), ...{} });
const meal = (slot, name, ...ingredients) => ({ slot, name, notes: 'Cook it.', ingredients: ingredients.length ? ingredients : [ing('Rice', 300)] });
const DATES = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
const SLOTS = ['breakfast', 'lunch', 'dinner'];

// ---- cleaning one reply ----
let r = cleanAiMeals([meal('dinner', 'Chicken rice', ing('Chicken breast', 250, 40, 10, 5), ing('Rice', 200, 4, 44, 1))], P(), SLOTS);
ok('a good meal becomes a one-serving recipe made by the AI', r.accepted.length === 1 && r.accepted[0].recipe.servings === 1 && r.accepted[0].recipe.ai === true && r.accepted[0].slot === 'dinner' && r.removed.length === 0);
ok('the meal\'s calories are the sum of its ingredients (450)', recipeCalories(r.accepted[0].recipe) === 450);
ok('every ingredient gets an id and the amount becomes its serving', r.accepted[0].recipe.ingredients.every((i) => i.id && i.serving === '100 g') && new Set(r.accepted[0].recipe.ingredients.map((i) => i.id)).size === 2);

r = cleanAiMeals([meal('dinner', 'Mac and cheese', ing('Macaroni pasta', 300), ing('Cheddar cheese', 200))], P({ avoid: ['dairy', 'gluten'] }), SLOTS);
ok('a meal with an avoided allergen is REMOVED and the reasons are reported', r.accepted.length === 0 && r.removed.length === 1 && r.removed[0].name === 'Mac and cheese' && r.removed[0].reasons.includes('Contains dairy') && r.removed[0].reasons.includes('Contains gluten'));
r = cleanAiMeals([meal('lunch', 'Chicken salad', ing('Chicken', 300), ing('Lettuce', 20))], P({ diets: ['vegetarian'] }), SLOTS);
ok('a meal that breaks the diet is removed', r.accepted.length === 0 && r.removed[0].reasons.includes('Not vegetarian'));
r = cleanAiMeals([meal('lunch', 'Mushroom soup', ing('Mushrooms', 100))], P({ dislikes: ['mushroom'] }), SLOTS);
ok('a disliked food is not blocked (it is only a preference)', r.accepted.length === 1 && r.removed.length === 0);
r = cleanAiMeals([meal('brunch', 'Brunch', ing('Rice', 300)), meal('dinner', 'Ok', ing('Rice', 300))], P(), SLOTS);
ok('a meal time that was not asked for is dropped', r.accepted.length === 1 && r.dropped === 1);
r = cleanAiMeals([meal('lunch', 'Tiny', ing('Salt', 3)), meal('lunch', 'Huge', ing('Everything', 9000)), meal('lunch', '   ', ing('Rice', 300)), { slot: 'lunch', name: 'No ingredients', ingredients: [] }, { slot: 'lunch', name: 'Bad', ingredients: 'rice' }, null, 'x', 7], P(), SLOTS);
ok('unbelievable or broken meals are dropped (too small, absurdly large, no name, no ingredients, wrong shape)', r.accepted.length === 0 && r.dropped === 8, JSON.stringify({ a: r.accepted.length, d: r.dropped }));
r = cleanAiMeals([meal('lunch', 'Liar', { name: 'Mystery', amount: '1', calories: 100, protein: 0, carbs: 0, fat: 40 })], P(), SLOTS);
ok('calories that do not match the macros (100 kcal but 40 g fat = 360 kcal) are not trusted', r.accepted.length === 0 && r.dropped === 1);
r = cleanAiMeals([meal('lunch', 'Fine', { name: 'Oats', amount: '60 g', calories: 228, protein: 8, carbs: 40, fat: 4 })], P(), SLOTS);
ok('calories that match the macros are accepted (228 kcal vs 228 from macros)', r.accepted.length === 1);
r = cleanAiMeals([{ slot: 'lunch', name: 'N'.repeat(500), notes: 'x'.repeat(5000), ingredients: [{ name: 'A'.repeat(500), amount: 'z'.repeat(500), calories: '250', protein: -5, carbs: 30, fat: 12 }, { name: '', calories: 100 }] }], P(), SLOTS);
const rec = r.accepted[0]?.recipe;
ok('names, notes and amounts are trimmed, numbers coerced (negative protein becomes 0, text becomes numbers), nameless ingredients dropped', rec && rec.name.length === 120 && rec.notes.length === 2000 && rec.ingredients.length === 1 && rec.ingredients[0].name.length === 120 && rec.ingredients[0].serving.length === 80 && rec.ingredients[0].calories === 250 && rec.ingredients[0].protein === 0 && rec.ingredients[0].carbs === 30 && rec.ingredients[0].fat === 12, JSON.stringify(rec?.ingredients));
ok('not a list means no meals and no crash', cleanAiMeals(undefined, P(), SLOTS).accepted.length === 0 && cleanAiMeals('hi', P(), SLOTS).dropped === 0 && cleanAiMeals({}, P(), SLOTS).accepted.length === 0);
ok('at most 12 meals are read from one reply', cleanAiMeals(Array.from({ length: 30 }, (_, i) => meal('lunch', `Meal ${i}`)), P(), SLOTS).accepted.length === 12);

// ---- context ----
const ctx = buildContext({ goals: { calories: 2300, protein: 160, carbs: 250, fat: 70, water: 2000 }, preferences: { diets: ['vegan'], avoid: ['soy'], likes: ['rice'], dislikes: ['liver'] }, cuisines: ['Thai'], budget: 'low' });
ok('the context carries targets, diet, allergies, likes, dislikes, cuisines and budget (but not water)', ctx.targets.calories === 2300 && !('water' in ctx.targets) && ctx.diets[0] === 'vegan' && ctx.avoid[0] === 'soy' && ctx.likes[0] === 'rice' && ctx.dislikes[0] === 'liver' && ctx.cuisines[0] === 'Thai' && ctx.budget === 'low');

// ---- a week, one request per day ----
const calls = [];
const planner = async (payload) => {
  calls.push(payload);
  const d = payload.dayIndex;
  return { meals: SLOTS.map((slot) => meal(slot, `${slot} ${d}`, ing('Rice', 600))) };
};
let progress = [];
let w = await planDays({ planner, dates: DATES, slots: SLOTS, context: ctx, prefs: P(), onProgress: (p) => progress.push(p.done) });
ok('a week makes one request per day (7)', calls.length === 7 && w.daysDone === 7 && w.error === null);
ok('every request carries the person\'s context, the meal times, and which day it is', calls.every((c, i) => c.mode === 'day' && c.dayIndex === i && c.slots.join() === 'breakfast,lunch,dinner' && c.targets.calories === 2300 && c.diets[0] === 'vegan' && c.budget === 'low'));
ok('later requests are told which meals already exist, so the AI varies them', calls[0].avoidNames.length === 0 && calls[1].avoidNames.length === 3 && calls[6].avoidNames.length === 18);
ok('21 meals, each placed on the right day and meal time', w.recipes.length === 21 && w.items.length === 21 && DATES.every((d) => w.items.filter((i) => i.date === d).map((i) => i.slot).join() === 'breakfast,lunch,dinner'));
ok('every plan item points at a recipe that was created, one serving, not logged', w.items.every((i) => w.recipes.some((r) => r.id === i.mealId) && i.servings === 1 && i.done === false && i.entryId === '' && i.id));
ok('progress is reported as days complete', progress[0] === 0 && progress.at(-1) === 7);
const cals = dayCalories(w.recipes, w.items);
ok('day totals are computed from the recipes (3 x 600 = 1800)', cals[DATES[0]] === 1800);

// the same dish on two days is one recipe
calls.length = 0;
w = await planDays({ planner: async () => ({ meals: [meal('dinner', 'Chicken curry', ing('Chicken', 400))] }), dates: DATES.slice(0, 3), slots: ['dinner'], context: ctx, prefs: P() });
ok('the same dish on three days is saved once and planned three times', w.recipes.length === 1 && w.items.length === 3 && new Set(w.items.map((i) => i.mealId)).size === 1);

// one meal per meal time per day
w = await planDays({ planner: async () => ({ meals: [meal('dinner', 'A', ing('Rice', 300)), meal('dinner', 'B', ing('Rice', 300))] }), dates: DATES.slice(0, 1), slots: ['dinner'], context: ctx, prefs: P() });
ok('if the AI sends two meals for one meal time, only the first is used', w.items.length === 1 && w.recipes.length === 1 && w.dropped === 1);

// safety leaks are removed and reported per day
w = await planDays({ planner: async (p) => ({ meals: [meal('breakfast', p.dayIndex === 1 ? 'Cheese omelette' : 'Oats', p.dayIndex === 1 ? ing('Cheddar cheese', 300) : ing('Oats', 300)), meal('dinner', 'Rice bowl', ing('Rice', 500))] }), dates: DATES.slice(0, 3), slots: ['breakfast', 'dinner'], context: ctx, prefs: P({ avoid: ['dairy'] }) });
ok('a meal with an allergen on day 2 is removed and reported with its date', w.items.length === 5 && w.removed.length === 1 && w.removed[0].date === DATES[1] && w.removed[0].reasons.includes('Contains dairy') && !w.recipes.some((r) => /cheese/i.test(r.name)));

// failure part-way keeps the days that worked
let n = 0;
w = await planDays({ planner: async (p) => { n++; if (n === 3) throw new Error('You have used all 40 AI requests for today.'); return { meals: [meal('dinner', `Dinner ${p.dayIndex}`, ing('Rice', 500))] }; }, dates: DATES, slots: ['dinner'], context: ctx, prefs: P() });
ok('if a day fails, the days before it are kept and the error is returned', w.daysDone === 2 && w.items.length === 2 && w.recipes.length === 2 && w.error?.message === 'You have used all 40 AI requests for today.' && n === 3);

// cancel
n = 0; let stop = false;
w = await planDays({ planner: async () => { n++; if (n === 2) stop = true; return { meals: [meal('dinner', `D${n}`, ing('Rice', 500))] }; }, dates: DATES, slots: ['dinner'], context: ctx, prefs: P(), isCancelled: () => stop });
ok('cancelling stops further requests and keeps what finished', n === 2 && w.items.length === 2 && w.error === null);
w = await planDays({ planner: async () => ({}), dates: DATES.slice(0, 2), slots: ['dinner'], context: ctx, prefs: P() });
ok('an empty or odd reply for a day just plans nothing for that day', w.items.length === 0 && w.error === null && w.daysDone === 2);

// ---- separate meals ----
let m = await planMeals({ planner: async () => ({ meals: [meal('dinner', 'A', ing('Rice', 400)), meal('dinner', 'a', ing('Rice', 400)), meal('lunch', 'B', ing('Rice', 400)), meal('lunch', 'C', ing('Rice', 400))] }), count: 3, slots: ['lunch', 'dinner'], context: ctx, prefs: P(), existingNames: ['Old meal'] });
ok('separate meals: duplicates by name and anything over the count are dropped', m.recipes.length === 3 && m.recipes.map((r) => r.name).join() === 'A,B,C' && m.dropped === 1 && m.error === null);
let seenPayload;
await planMeals({ planner: async (p) => { seenPayload = p; return { meals: [] }; }, count: 4, slots: ['dinner'], context: ctx, prefs: P(), existingNames: ['Old meal'] });
ok('separate meals: one request with the count and the existing recipe names', seenPayload.mode === 'meals' && seenPayload.count === 4 && seenPayload.avoidNames[0] === 'Old meal');
m = await planMeals({ planner: async () => { throw new Error('boom'); }, count: 3, slots: ['dinner'], context: ctx, prefs: P() });
ok('separate meals: an error is returned, not thrown', m.error?.message === 'boom' && m.recipes.length === 0);
m = await planMeals({ planner: async () => ({ meals: [meal('dinner', 'Cheesy', ing('Cheddar', 300))] }), count: 1, slots: ['dinner'], context: ctx, prefs: P({ avoid: ['dairy'] }) });
ok('separate meals are screened too', m.recipes.length === 0 && m.removed.length === 1);

// ---- instructions: the AI's steps become numbered lines in the recipe's notes ----
r = cleanAiMeals([{ slot: 'dinner', name: 'Steps', steps: ['Boil the water.', '2) Add the rice.', '  ', 7, null, 'Serve hot.'], ingredients: [ing('Rice', 300)] }], P(), SLOTS);
ok('steps become numbered lines (stray numbering removed, blanks and junk skipped)', r.accepted[0].recipe.notes === '1. Boil the water.\n2. Add the rice.\n3. Serve hot.', JSON.stringify(r.accepted[0]?.recipe.notes));
r = cleanAiMeals([{ slot: 'dinner', name: 'Long', steps: Array.from({ length: 20 }, (_, i) => `Step ${i} ${'x'.repeat(400)}`), ingredients: [ing('Rice', 300)] }], P(), SLOTS);
const longNotes = r.accepted[0].recipe.notes;
ok('at most 12 steps, each cut to 300 characters, and the whole method to 2,000', longNotes.split('\n').length <= 12 && longNotes.length <= 2000 && longNotes.split('\n')[0].length <= 303);
r = cleanAiMeals([{ slot: 'dinner', name: 'Old', notes: 'Just cook it.', ingredients: [ing('Rice', 300)] }, { slot: 'lunch', name: 'None', ingredients: [ing('Rice', 300)] }], P(), SLOTS);
ok('an older-style single note still works, and no instructions at all gives an empty method', r.accepted[0].recipe.notes === 'Just cook it.' && r.accepted[1].recipe.notes === '');

// ---- borrowing meals from the recipe book ----
const bookRecipe = (id, name, kcal, ingName = 'Rice') => ({ id, name, servings: 1, notes: '', ingredients: [{ id: id + '-i', name: ingName, serving: '100 g', calories: kcal, protein: Math.round((kcal * 0.2) / 4), carbs: Math.round((kcal * 0.5) / 4), fat: Math.round((kcal * 0.3) / 9) }] });
const zero = () => 0; // always picks the first option, and always passes the chance roll
ok('there are three levels, and "never" borrows nothing', REUSE_LEVELS.map((l) => l.id).join() === 'never,sometimes,often' && REUSE_LEVELS[0].chance === 0);

const book = [bookRecipe('b-cheese', 'Cheese toastie', 600, 'Cheddar cheese'), bookRecipe('b-mush', 'Mushroom soup', 600, 'Mushrooms'), bookRecipe('b-ok', 'Lentil soup', 600, 'Lentils'), bookRecipe('b-tiny', 'Pinch of salt', 10, 'Salt')];
const usable = reusableRecipes(book, P({ avoid: ['dairy'], dislikes: ['mushroom'] }));
ok('recipes that break an allergy, are disliked, or are tiny are never borrowed', usable.map((u) => u.recipe.id).join() === 'b-ok' && usable[0].nutrition.calories === 600);
ok('a bad or empty book is harmless', reusableRecipes(null, P()).length === 0 && reusableRecipes([null, { id: 'x' }, { id: 'y', ingredients: [] }], P()).length === 0);

const all = reusableRecipes([bookRecipe('a', 'A', 600), bookRecipe('b', 'B', 700), bookRecipe('c', 'C', 800)], P());
const T = { calories: 2300, protein: 160, carbs: 250, fat: 70 };
ok('"never" and an empty book pick nothing', pickBookMeals({ usable: all, slots: SLOTS, targets: T, level: REUSE_LEVELS[0], random: zero }).length === 0 && pickBookMeals({ usable: [], slots: SLOTS, targets: T, level: REUSE_LEVELS[2], random: zero }).length === 0);
ok('"sometimes" borrows at most one meal a day, "often" at most two', pickBookMeals({ usable: all, slots: SLOTS, targets: T, level: REUSE_LEVELS[1], random: zero }).length === 1 && pickBookMeals({ usable: all, slots: SLOTS, targets: T, level: REUSE_LEVELS[2], random: zero }).length === 2);
ok('the chance roll is respected (a roll of 0.99 borrows nothing)', pickBookMeals({ usable: all, slots: SLOTS, targets: T, level: REUSE_LEVELS[1], random: () => 0.99 }).length === 0);
const snackPick = pickBookMeals({ usable: reusableRecipes([bookRecipe('big', 'Big dinner', 900), bookRecipe('small', 'Little snack', 120)], P()), slots: ['snack'], targets: T, level: { chance: 1, maxPerDay: 1 }, random: zero });
ok('a recipe only goes in a meal time it suits (a 900 kcal meal is not a snack, a 120 kcal snack is)', snackPick.length === 1 && snackPick[0].recipe.id === 'small');
const dinnerPick = pickBookMeals({ usable: reusableRecipes([bookRecipe('small', 'Little snack', 120)], P()), slots: ['dinner'], targets: T, level: { chance: 1, maxPerDay: 1 }, random: zero });
ok('a 120 kcal snack is not offered as dinner', dinnerPick.length === 0);
ok('recipes used on recent days are skipped', pickBookMeals({ usable: all, slots: ['dinner'], targets: T, level: { chance: 1, maxPerDay: 1 }, avoidIds: ['a', 'b'], random: zero })[0].recipe.id === 'c');
const squeeze = pickBookMeals({ usable: reusableRecipes([bookRecipe('s1', 'S1', 450), bookRecipe('s2', 'S2', 450), bookRecipe('s3', 'S3', 450)], P()), slots: SLOTS, targets: { calories: 1000, protein: 80, carbs: 100, fat: 30 }, level: { chance: 1, maxPerDay: 3 }, random: zero });
ok('it always leaves at least 150 kcal for each meal time the AI still has to write', squeeze.length === 1);

// a week that borrows from the book
const bookWeek = [bookRecipe('b-ok', 'Lentil soup', 600, 'Lentils'), bookRecipe('b-cheese', 'Cheese toastie', 600, 'Cheddar cheese')];
const callsB = [];
const plannerB = async (p) => { callsB.push(p); return { meals: p.slots.map((slot) => meal(slot, `${slot} ${p.dayIndex}`, ing('Rice', 600))) }; };
let wb = await planDays({ planner: plannerB, dates: DATES.slice(0, 4), slots: SLOTS, context: ctx, prefs: P({ avoid: ['dairy'] }), book: bookWeek, reuse: REUSE_LEVELS[1], random: zero });
const first = callsB[0];
ok('a day that borrows asks the AI only for the other meal times, marked as a partial day', first.partial === true && first.slots.join() === 'breakfast,dinner' && first.mode === 'day' && first.dayIndex === 0);
ok('the target the AI is given is what is left after the borrowed meal (2300 - 600 = 1700 kcal)', first.targets.calories === 1700 && first.targets.protein === 130 && first.targets.carbs === 250 - 75 && first.targets.fat === 70 - 20);
ok('the AI is told which meal is already planned', first.existing.length === 1 && first.existing[0].slot === 'lunch' && first.existing[0].name === 'Lentil soup' && first.existing[0].calories === 600);
ok('the AI is also told not to repeat borrowed meals', first.avoidNames.length === 0 && callsB[1].avoidNames.includes('Lentil soup'));
ok('the same recipe is not borrowed again on the next two days, then can come back (days 1 and 4)', callsB.length === 4 && !('partial' in callsB[1]) && !('partial' in callsB[2]) && callsB[3].partial === true && wb.reused === 2);
ok('the borrowed meal is planned on its own meal time using the existing recipe, not a copy', wb.items.filter((i) => i.mealId === 'b-ok').length === 2 && wb.items.filter((i) => i.mealId === 'b-ok').every((i) => i.slot === 'lunch') && !wb.recipes.some((r) => r.id === 'b-ok' || r.name === 'Lentil soup'));
ok('the dairy recipe was never borrowed (the person avoids dairy)', !wb.items.some((i) => i.mealId === 'b-cheese'));
ok('every borrowed day still has all three meal times', DATES.slice(0, 4).every((d) => wb.items.filter((i) => i.date === d).map((i) => i.slot).sort().join() === 'breakfast,dinner,lunch'));
ok('only the new recipes are returned to be saved (the book already has the others)', wb.recipes.length === 10 && wb.recipes.every((r) => r.ai === true));
const withBook = dayCalories([...wb.recipes, ...bookWeek], wb.items);
ok('day totals count borrowed meals too (600 + 600 + 600 = 1800)', withBook[DATES[0]] === 1800);

// a day made only of borrowed meals needs no AI request at all
callsB.length = 0;
wb = await planDays({ planner: plannerB, dates: DATES.slice(0, 1), slots: SLOTS, context: ctx, prefs: P(), book: [bookRecipe('a', 'A', 600), bookRecipe('b', 'B', 700), bookRecipe('c', 'C', 800)], reuse: { id: 'x', chance: 1, maxPerDay: 3 }, random: zero });
ok('a day made entirely of borrowed meals makes no AI request, and uses three different recipes', callsB.length === 0 && wb.items.length === 3 && new Set(wb.items.map((i) => i.mealId)).size === 3 && wb.recipes.length === 0 && wb.reused === 3 && wb.daysDone === 1 && wb.error === null);

// failures and odd replies on a borrowing day
callsB.length = 0;
wb = await planDays({ planner: async () => { throw new Error('AI is down'); }, dates: DATES.slice(0, 2), slots: SLOTS, context: ctx, prefs: P(), book: bookWeek, reuse: REUSE_LEVELS[1], random: zero });
ok('if the AI fails on a day that borrowed a meal, nothing from that day is kept', wb.error?.message === 'AI is down' && wb.items.length === 0 && wb.daysDone === 0);
wb = await planDays({ planner: async (p) => ({ meals: [meal('lunch', 'Sneaky lunch', ing('Rice', 600)), ...p.slots.map((slot) => meal(slot, `${slot} x`, ing('Rice', 600)))] }), dates: DATES.slice(0, 1), slots: SLOTS, context: ctx, prefs: P(), book: bookWeek, reuse: REUSE_LEVELS[1], random: zero });
ok('if the AI sends a meal for a time that was borrowed, it is dropped', wb.items.filter((i) => i.slot === 'lunch').length === 1 && wb.items.find((i) => i.slot === 'lunch').mealId === 'b-ok' && wb.dropped === 1);
wb = await planDays({ planner: plannerB, dates: DATES.slice(0, 3), slots: SLOTS, context: ctx, prefs: P(), book: bookWeek, reuse: REUSE_LEVELS[0], random: zero });
ok('with "never", nothing is borrowed and every request is a normal whole-day one', wb.reused === 0 && callsB.slice(-3).every((c) => !('partial' in c) && c.slots.length === 3 && c.targets.calories === 2300));
ok('with no book passed (as before), planning works exactly as it did', (await planDays({ planner: plannerB, dates: DATES.slice(0, 1), slots: SLOTS, context: ctx, prefs: P() })).items.length === 3);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
