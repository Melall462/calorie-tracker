// Run with: npm test
// Tests the planner's data helpers (src/lib/plan.js).
import { cleanPlan, dayPlan, dayTotals, entryForPlanItem, mondayOf, weekDates } from '../src/lib/plan.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };
const item = (id, date, slot, mealId, extra = {}) => ({ id, date, slot, mealId, servings: 1, done: false, entryId: '', ...extra });
const meal = (id, kcal, p = 10, c = 20, f = 5) => ({ id, name: id, servings: 1, notes: '', ingredients: [{ id: id + 'i', name: 'x', serving: '', calories: kcal, protein: p, carbs: c, fat: f }] });

// 2026-11-09 is a Monday
ok('monday of a Monday is itself', mondayOf('2026-11-09') === '2026-11-09');
ok('monday of a Wednesday and a Saturday', mondayOf('2026-11-11') === '2026-11-09' && mondayOf('2026-11-14') === '2026-11-09');
ok('monday of a Sunday is the Monday before (weeks run Monday to Sunday)', mondayOf('2026-11-15') === '2026-11-09');
ok('monday works across month and year ends', mondayOf('2026-12-01') === '2026-11-30' && mondayOf('2027-01-01') === '2026-12-28');
ok('a week has seven consecutive days starting Monday', weekDates('2026-11-09').join() === '2026-11-09,2026-11-10,2026-11-11,2026-11-12,2026-11-13,2026-11-14,2026-11-15' && weekDates('2026-12-28').at(-1) === '2027-01-03');

const cleaned = cleanPlan([item('a', '2026-11-10', 'lunch', 'm1'), item('a', '2026-11-10', 'dinner', 'dupe'), { id: '', mealId: 'm' }, null, 'x', item('b', 'not-a-date', 'lunch', 'm1'), item('c', '2026-11-10', 'brunch', 'm1', { servings: -2, done: 'yes', entryId: 7 }), item('d', '2026-11-10', 'dinner', 'm1', { servings: 999 }), { id: 'e', date: '2026-11-10', slot: 'lunch' }]);
ok('cleanPlan drops broken and duplicate items', cleaned.map((p) => p.id).join() === 'a,c,d');
ok('cleanPlan fixes slot, servings, done and entryId', cleaned[1].slot === 'snack' && cleaned[1].servings === 1 && cleaned[1].done === false && cleaned[1].entryId === '' && cleaned[2].servings === 50);
ok('cleanPlan survives junk', cleanPlan(null).length === 0 && cleanPlan({}).length === 0 && cleanPlan('x').length === 0);
ok('cleanPlan limits one day to 100 items', cleanPlan(Array.from({ length: 150 }, (_, i) => item(`p${i}`, '2026-11-10', 'lunch', 'm'))).length === 100);

const plan = [item('1', '2026-11-10', 'dinner', 'm2'), item('2', '2026-11-10', 'breakfast', 'm1'), item('3', '2026-11-11', 'lunch', 'm1'), item('4', '2026-11-10', 'snack', 'm1', { servings: 2 }), item('5', '2026-11-10', 'lunch', 'gone')];
ok('a day\'s plan is in meal-time order', dayPlan(plan, '2026-11-10').map((p) => p.slot).join() === 'breakfast,lunch,dinner,snack');
const meals = [meal('m1', 300, 20, 30, 10), meal('m2', 600, 40, 50, 20)];
const t = dayTotals(plan, meals, '2026-11-10');
ok('day totals add up servings (300 + 600 + 2 x 300 = 1500)', t.calories === 1500 && t.protein === 100 && t.carbs === 140 && t.fat === 50, JSON.stringify(t));
ok('a deleted recipe counts for nothing and does not crash', dayTotals([item('x', '2026-11-10', 'lunch', 'gone')], meals, '2026-11-10').calories === 0 && dayTotals([], meals, '2026-11-10').calories === 0);
ok('half servings scale (0.5 x 600 = 300)', dayTotals([item('h', '2026-11-12', 'lunch', 'm2', { servings: 0.5 })], meals, '2026-11-12').calories === 300);

const e = entryForPlanItem(item('p', '2026-11-10', 'lunch', 'm2', { servings: 1.5 }), meals[1], 'entry-1');
ok('logging builds a diary entry with the right day, meal time, name and scaled numbers', e.id === 'entry-1' && e.date === '2026-11-10' && e.meal === 'lunch' && e.name === 'm2' && e.serving === '1.5 servings' && e.calories === 900 && e.protein === 60 && e.source === 'meal');
ok('one serving reads "1 serving"', entryForPlanItem(item('p', '2026-11-10', 'lunch', 'm1'), meals[0], 'e').serving === '1 serving');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
