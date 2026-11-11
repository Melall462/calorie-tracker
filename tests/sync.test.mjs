import { FakeServer } from './fakeServer.mjs';
import { runSync } from '../src/lib/sync.js';
import { applyUnits, cleanUnit, collectUnits, emptyUnit, same } from '../src/lib/units.js';
import { mergeById, mergeSet, mergeUnit, scalar } from '../src/lib/merge.js';
import { sanitizeGoals } from '../src/lib/nutrition.js';
import { cleanProfile } from '../src/lib/calculator.js';
import { cleanPreferences } from '../src/lib/preferences.js';

// Run with: npm test
// Tests the sync engine (src/lib/sync.js, merge.js, units.js) against an in-memory stand-in for the cloud.
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };

const blank = () => ({ entries: [], plan: [], water: {}, weights: {}, goals: sanitizeGoals(null), profile: cleanProfile(null), preferences: cleanPreferences(null), onboarded: false, meals: [], foods: [] });
const D1 = '2026-11-10', D2 = '2026-11-11', D3 = '2026-11-09';
const entry = (id, date, name = 'Food', calories = 100, meal = 'lunch') => ({ id, date, name, serving: '', calories, protein: 5, carbs: 10, fat: 2, meal, source: 'manual' });

class Device {
  constructor(server, email = 'a@x.com', password = 'secret1') {
    this.server = server;
    const session = server.users.has(email) ? server.signIn(email, password) : server.signUp(email, password);
    this.token = session.token; this.userId = session.user.id;
    this.state = blank();
    this.meta = { userId: null, cursor: null, base: {} };
    this.store = { load: () => structuredClone(this.meta), save: (m) => { this.meta = structuredClone(m); } };
  }
  units() { return collectUnits(this.state); }
  sync(duringSync) {
    let calls = 0;
    return runSync({
      backend: this.server.backendFor(this.token), userId: this.userId, store: this.store,
      getUnits: () => { calls += 1; if (calls === 2 && duringSync) duringSync(this.state); return this.units(); },
      applyUnits: (map) => { this.state = applyUnits(this.state, map); },
    });
  }
  ids(date) { return this.state.entries.filter((e) => e.date === date).map((e) => e.id).sort(); }
  entry(id) { return this.state.entries.find((e) => e.id === id); }
}
const equalState = (a, b) => same(a.units(), b.units());

// ============ basics ============
{
  const s = new FakeServer(); const A = new Device(s);
  A.state.entries = [entry('e1', D1, 'Banana', 105), entry('e2', D1, 'Rice', 200), entry('e3', D2, 'Toast', 120)];
  A.state.water = { [D1]: 750 }; A.state.weights = { [D1]: 72.4 };
  A.state.goals = { ...A.state.goals, calories: 1800 }; A.state.onboarded = true;
  A.state.meals = [{ id: 'm1', name: 'Bowl', servings: 2, notes: '', ingredients: [{ id: 'i1', name: 'Rice', serving: '', calories: 400, protein: 8, carbs: 80, fat: 1 }] }];
  const r = await A.sync();
  const keys = [...s.table(A.userId).keys()].sort();
  ok('first sync uploads each day, the settings and the recipe book', JSON.stringify(keys) === JSON.stringify([`day:${D1}`, `day:${D2}`, 'meals', 'settings']), JSON.stringify(keys));
  ok('one request per unit, and nothing pulled', r.pushed === 4 && r.pulled === 0 && s.log.filter((l) => l.startsWith('insert:')).length === 4);
  ok('the device remembers who it synced as and a version for every unit', A.meta.userId === A.userId && Object.keys(A.meta.base).length === 4 && A.meta.base[`day:${D1}`].version === 1);
  ok('the day unit holds entries, planned meals, water and weight together', same(s.table(A.userId).get(`day:${D1}`).value, { entries: A.state.entries.filter((e) => e.date === D1), plan: [], water: 750, weight: 72.4 }));

  const B = new Device(s);
  const rb = await B.sync();
  ok('a second device with nothing gets everything', equalState(A, B) && rb.pushed === 0 && rb.pulled === 4 && B.state.goals.calories === 1800 && B.state.onboarded === true && B.state.meals.length === 1);
  ok('and it does not upload anything back', s.log.filter((l) => l.startsWith('update:')).length === 0);

  ok('after the next sync it also has a cursor, so later fetches only ask for what changed', (await A.sync(), A.meta.cursor !== null));
  const before = s.log.length;
  const again = await A.sync();
  ok('syncing with nothing changed pushes and applies nothing', again.pushed === 0 && again.applied.length === 0 && s.log.slice(before).every((l) => l.startsWith('fetchChanged')));

  // an edit travels
  A.state.entries = A.state.entries.map((e) => (e.id === 'e1' ? { ...e, calories: 130 } : e));
  const ra = await A.sync();
  ok('editing one entry updates just that day', ra.pushed === 1 && s.log.filter((l) => l === `update:day:${D1}`).length === 1);
  const rb2 = await B.sync();
  ok('the other device picks up only that day', rb2.applied.length === 1 && rb2.applied[0] === `day:${D1}` && B.entry('e1').calories === 130 && equalState(A, B));

  // accounts are private
  const other = new Device(s, 'b@x.com');
  const ro = await other.sync();
  ok("a different account sees none of this data and shares nothing", ro.applied.length === 0 && other.state.entries.length === 0 && [...s.table(other.userId).keys()].length === 0);
}

// ============ concurrent edits ============
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.entries = [entry('e1', D1), entry('e2', D1)]; await A.sync(); await B.sync();

  A.state.entries.push(entry('a3', D1, 'From A'));
  B.state.entries.push(entry('b4', D1, 'From B'));
  await A.sync(); await B.sync(); await A.sync();
  ok('entries added on two devices at once are both kept', JSON.stringify(A.ids(D1)) === JSON.stringify(['a3', 'b4', 'e1', 'e2']) && equalState(A, B));

  A.state.entries = A.state.entries.filter((e) => e.id !== 'e1');
  await A.sync(); await B.sync();
  ok('a deletion reaches the other device', !B.entry('e1') && B.ids(D1).length === 3);
  await B.sync(); await A.sync(); await B.sync();
  ok('and the deleted entry never comes back', !A.entry('e1') && !B.entry('e1') && [...s.table(A.userId).get(`day:${D1}`).value.entries].every((e) => e.id !== 'e1'));

  A.state.entries = A.state.entries.filter((e) => e.id !== 'e2');
  B.state.entries = B.state.entries.map((e) => (e.id === 'e2' ? { ...e, name: 'Edited on B' } : e));
  await A.sync(); await B.sync(); await A.sync();
  ok('deleted on one device, edited on the other: the edit is kept', A.entry('e2')?.name === 'Edited on B' && B.entry('e2')?.name === 'Edited on B');

  A.state.goals = { ...A.state.goals, calories: 1900 };
  B.state.goals = { ...B.state.goals, calories: 2100 };
  await A.sync(); await B.sync(); await A.sync();
  ok('the same target changed on both: the device that syncs last (the edit you just made) wins', B.state.goals.calories === 2100 && A.state.goals.calories === 2100);

  A.state.goals = { ...A.state.goals, protein: 150 };
  B.state.goals = { ...B.state.goals, carbs: 250 };
  await A.sync(); await B.sync(); await A.sync();
  ok('different targets changed on each device are both kept', A.state.goals.protein === 150 && A.state.goals.carbs === 250 && equalState(A, B));

  A.state.preferences = { ...A.state.preferences, likes: ['rice'] }; B.state.preferences = { ...B.state.preferences, likes: ['salmon'], diets: ['vegan'] };
  await A.sync(); await B.sync(); await A.sync();
  ok('food likes and diets from two devices are combined', same(A.state.preferences.likes.slice().sort(), ['rice', 'salmon']) && A.state.preferences.diets[0] === 'vegan' && equalState(A, B));
  A.state.preferences = { ...A.state.preferences, likes: A.state.preferences.likes.filter((x) => x !== 'rice') };
  await A.sync(); await B.sync();
  ok('removing a like on one device removes it on the other', same(B.state.preferences.likes, ['salmon']));

  A.state.water = { [D1]: 500 }; B.state.water = { [D1]: 750 };
  await A.sync(); await B.sync(); await A.sync();
  ok('water added on both devices keeps the larger total', A.state.water[D1] === 750 && B.state.water[D1] === 750);

  A.state.weights = { [D1]: 70 }; await A.sync(); await B.sync();
  ok('a weigh-in syncs', B.state.weights[D1] === 70);
  B.state.weights = {}; await B.sync(); await A.sync();
  ok('removing a weigh-in syncs', A.state.weights[D1] === undefined);

  A.state.entries = A.state.entries.filter((e) => e.date !== D1); A.state.water = {}; A.state.weights = {};
  await A.sync(); await B.sync();
  ok('emptying a whole day empties it on the other device too', B.state.entries.every((e) => e.date !== D1) && B.state.water[D1] === undefined && B.state.weights[D1] === undefined && equalState(A, B));
}

// ============ planned meals ============
{
  const planItem = (id, date, slot, mealId, extra = {}) => ({ id, date, slot, mealId, servings: 1, done: false, entryId: '', ...extra });
  const recipe = (id, name) => ({ id, name, servings: 1, notes: '', ingredients: [{ id: `${id}-i`, name: 'Thing', serving: '', calories: 400, protein: 20, carbs: 40, fat: 10 }] });
  const FUTURE = '2026-11-14';
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.meals = [recipe('m1', 'Oats'), recipe('m2', 'Curry')];
  A.state.plan = [planItem('p1', FUTURE, 'breakfast', 'm1'), planItem('p2', FUTURE, 'dinner', 'm2')];
  await A.sync(); await B.sync();
  ok('planned meals and their recipes reach another device', B.state.plan.length === 2 && B.state.meals.length === 2 && equalState(A, B));
  ok('a future day with only a plan still gets its own day unit', s.table(A.userId).get(`day:${FUTURE}`).value.plan.length === 2 && s.table(A.userId).get(`day:${FUTURE}`).value.entries.length === 0);

  A.state.plan.push(planItem('a3', FUTURE, 'lunch', 'm1'));
  B.state.plan.push(planItem('b4', FUTURE, 'snack', 'm2'));
  await A.sync(); await B.sync(); await A.sync();
  ok('meals planned on two devices at once are both kept', A.state.plan.map((p) => p.id).sort().join() === 'a3,b4,p1,p2' && equalState(A, B));

  A.state.plan = A.state.plan.map((p) => (p.id === 'p1' ? { ...p, done: true, entryId: 'entry-9' } : p));
  await A.sync(); await B.sync();
  ok('logging a planned meal on one device marks it logged on the other', B.state.plan.find((p) => p.id === 'p1').done === true && B.state.plan.find((p) => p.id === 'p1').entryId === 'entry-9');

  B.state.plan = B.state.plan.filter((p) => p.id !== 'p2');
  await B.sync(); await A.sync();
  ok('removing a planned meal removes it everywhere and it stays removed', !A.state.plan.some((p) => p.id === 'p2') && !B.state.plan.some((p) => p.id === 'p2'));
  await A.sync(); await B.sync();

  // a row written before plans existed (no "plan" field) still loads
  s.table(A.userId).set('day:2026-10-01', { key: 'day:2026-10-01', version: 1, updated_at: s.stamp(), value: { entries: [entry('old1', '2026-10-01')], water: 250, weight: null } });
  const C = new Device(s); await C.sync();
  ok('days saved before planning existed still load, with an empty plan', C.state.entries.some((e) => e.id === 'old1') && C.state.plan.every((p) => p.date !== '2026-10-01'));

  // hostile plan items from the cloud
  s.table(A.userId).set('day:2026-10-02', { key: 'day:2026-10-02', version: 1, updated_at: s.stamp(), value: { entries: [], plan: [
    { id: 'ok', date: '1999-01-01', slot: 'brunch', mealId: 'm1', servings: -3, done: 'yes', entryId: 7 },
    { id: '', mealId: 'm1' }, { id: 'noMeal' }, null, 'x', { id: 'ok', mealId: 'dupe' }, { id: 'big', mealId: 'm1', servings: 9999 } ], water: 0, weight: null } });
  const D = new Device(s); await D.sync();
  const got = D.state.plan.filter((p) => p.date === '2026-10-02');
  ok('malformed plan items are dropped and the rest are cleaned (date forced, slot defaulted, servings limited)', got.length === 2 && got[0].id === 'ok' && got[0].slot === 'snack' && got[0].servings === 1 && got[0].done === false && got[0].entryId === '' && got[1].servings === 50);
}

// ============ first sync on a device that already has data ============
{
  const s = new FakeServer(); const A = new Device(s); const C = new Device(s);
  A.state.goals = { ...A.state.goals, calories: 2200 }; A.state.entries = [entry('a1', D1)]; await A.sync();
  C.state.goals = { ...C.state.goals, calories: 1500 }; C.state.entries = [entry('c1', D1)];
  await C.sync();
  ok('first sync of a device with its own data: the account wins a clash on targets', C.state.goals.calories === 2200);
  ok('but nothing logged on either side is lost', JSON.stringify(C.ids(D1)) === JSON.stringify(['a1', 'c1']));
  await A.sync();
  ok('and the other device then receives the extra entry', JSON.stringify(A.ids(D1)) === JSON.stringify(['a1', 'c1']));
  const F = new Device(s); F.state.onboarded = true; await F.sync();
  ok('setup done on any device counts everywhere', (await new Device(s).sync(), true) && s.table(F.userId).get('settings').value.onboarded === true);
  const G = new Device(s); await G.sync();
  ok('a fresh device learns that setup is already done', G.state.onboarded === true);
}

// ============ races ============
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.entries = [entry('e1', D1)]; await A.sync(); await B.sync();
  A.state.entries.push(entry('a2', D1, 'A edit'));
  s.beforeUpdate = (srv, userId, key) => { const row = srv.table(userId).get(key); row.value.entries.push(entry('b9', D1, 'Saved by B just before')); row.version += 1; row.updated_at = srv.stamp(); };
  const r = await A.sync();
  ok('someone saving at the worst moment makes the update retry, not fail', s.log.includes(`update-conflict:day:${D1}`) && r.pushed === 1);
  ok('and the retry keeps both devices\' work', JSON.stringify(A.ids(D1)) === JSON.stringify(['a2', 'b9', 'e1']) && same(s.table(A.userId).get(`day:${D1}`).value.entries.map((e) => e.id), ['a2', 'b9', 'e1']));
  await B.sync();
  ok('the other device converges', equalState(A, B));
}
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.entries = [entry('a1', D3)]; await A.sync();
  B.state.entries = [entry('b1', D3)];
  s.hideRowsOnce = true; // B is out of date: it does not see A's row, so it tries to create it
  await B.sync();
  ok('creating a unit that someone else just created merges instead of failing', s.log.includes(`insert-conflict:day:${D3}`) && JSON.stringify(B.ids(D3)) === JSON.stringify(['a1', 'b1']) && s.table(A.userId).get(`day:${D3}`).value.entries.length === 2);
}
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.entries = [entry('e1', D1)]; await A.sync(); await B.sync();
  B.state.entries.push(entry('b2', D1, 'From B'));
  A.state.entries.push(entry('a2', D1, 'From A'));
  await B.sync();
  // A keeps logging while its sync is talking to the cloud
  await A.sync((state) => { state.entries.push(entry('a3', D1, 'Added mid-sync')); });
  ok('food logged while a sync is in progress is kept alongside what arrived', JSON.stringify(A.ids(D1)) === JSON.stringify(['a2', 'a3', 'b2', 'e1']), JSON.stringify(A.ids(D1)));
  await A.sync(); await B.sync();
  ok('and it reaches the other device on the next sync', equalState(A, B) && A.ids(D1).length === 4);
}

// ============ scale, quiet, safety ============
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  for (let i = 0; i < 60; i++) { const d = `2026-09-${String((i % 28) + 1).padStart(2, '0')}`; A.state.entries.push(entry(`e${i}`, d, 'Item', 100 + i)); }
  const days = new Set(A.state.entries.map((e) => e.date)).size;
  await A.sync(); await B.sync();
  ok(`${days} days upload and download correctly in parallel`, s.table(A.userId).size === days + 0 && equalState(A, B) && B.state.entries.length === 60);

  for (let round = 0; round < 3; round++) { var qa = await A.sync(); var qb = await B.sync(); }
  ok('once converged, repeated syncs change nothing and push nothing', qa.pushed === 0 && qb.pushed === 0 && qa.applied.length === 0 && qb.applied.length === 0);
}
{
  const s = new FakeServer(); const A = new Device(s);
  A.state.entries = [entry('e1', D1)];
  s.down = true;
  const err = await A.sync().then(() => null, (e) => e.message);
  ok('when the cloud is unreachable the sync fails cleanly', err === 'Failed to fetch' && A.meta.cursor === null && Object.keys(A.meta.base).length === 0 && A.state.entries.length === 1);
  s.down = false; await A.sync();
  ok('and works once it is back, without losing anything', s.table(A.userId).has(`day:${D1}`) && A.entry('e1'));
}
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.entries = [entry('e1', D1)]; await A.sync();
  const err = await runSync({ backend: B.server.backendFor(B.token), userId: B.userId, store: { load: () => ({ userId: 'someone-else', cursor: null, base: {} }), save() {} }, getUnits: () => ({}), applyUnits() {} }).then(() => null, (e) => e.message);
  ok('a device holding another account\'s notes refuses to sync', err === 'This device has data from another account.');
}
{
  // hostile or damaged data coming down from the cloud
  const s = new FakeServer(); const A = new Device(s);
  const t = s.table(A.userId);
  t.set(`day:${D1}`, { key: `day:${D1}`, version: 1, updated_at: s.stamp(), value: { entries: [
    { id: 'ok1', date: '1999-01-01', name: 'Wrong date', calories: '250', protein: -5, carbs: 'abc', fat: 1e9, meal: 'brunch', source: 'hacked' },
    { id: '', name: 'No id' }, { id: 'x'.repeat(80), name: 'Long id' }, { id: 'ok2', name: '   ' }, null, 'string', { id: 'ok1', name: 'Duplicate id' },
    { id: 'ok3', name: 'N'.repeat(500), calories: 1e12 } ], water: 99999999, weight: 7 } });
  t.set('evil', { key: 'evil', version: 1, updated_at: s.stamp(), value: { anything: true } });
  t.set('day:../../etc', { key: 'day:../../etc', version: 1, updated_at: s.stamp(), value: {} });
  t.set('settings', { key: 'settings', version: 1, updated_at: s.stamp(), value: { goals: { calories: 'lots', protein: -1 }, profile: 'nope', preferences: { diets: ['vegan', 'bogus'], likes: 5 }, onboarded: 'yes' } });
  t.set('meals', { key: 'meals', version: 1, updated_at: s.stamp(), value: { meals: [{ id: 'm', name: 'No ingredients', servings: 2, ingredients: [] }, 7] } });
  await A.sync();
  const e = A.state.entries;
  ok('malformed entries are dropped, the good one is cleaned (date forced to its day, numbers coerced and capped)', e.length === 2 && e[0].id === 'ok1' && e[0].date === D1 && e[0].calories === 250 && e[0].protein === 0 && e[0].carbs === 0 && e[0].fat === 1000 && e[0].meal === 'snack' && e[0].source === 'manual');
  ok('names and numbers are capped', e[1].id === 'ok3' && e[1].name.length === 120 && e[1].calories === 10000);
  ok('absurd water and weight are limited', A.state.water[D1] === 10000 && A.state.weights[D1] === undefined);
  ok('unknown or sneaky keys are ignored completely', !('evil' in A.meta.base) && ![...Object.keys(A.meta.base)].some((k) => k.includes('..')));
  ok('settings of the wrong type fall back to safe defaults', A.state.goals.calories === 2000 && A.state.goals.protein === 120 && A.state.preferences.diets.join() === 'vegan' && A.state.onboarded === false);
  ok('broken recipes are dropped', A.state.meals.length === 0);
}
{
  const state = blank();
  state.entries = [entry('e1', D1), entry('e2', D2)]; state.water = { [D1]: 250 }; state.weights = { [D2]: 71 };
  const units = collectUnits(state);
  const back = applyUnits(blank(), Object.fromEntries(Object.entries(units).filter(([k]) => k.startsWith('day:'))));
  ok('app state to units and back again is lossless', same(collectUnits({ ...state, ...back, goals: state.goals }), units));
  ok('collectUnits skips empty days and bad dates', Object.keys(collectUnits({ ...blank(), water: { [D1]: 0, 'junk': 5 }, weights: { 'not-a-date': 80 } })).sort().join() === 'meals,settings');
  const x = applyUnits(state, {});
  ok('applying nothing keeps every reference', x.entries === state.entries && x.goals === state.goals);
}

// ============ the merge rules on their own ============
ok('scalar: only-remote and only-local changes', scalar(1, 1, 2) === 2 && scalar(1, 2, 1) === 2 && scalar(1, 2, 2) === 2);
ok('scalar: both changed, local or remote wins as told', scalar(1, 2, 3) === 2 && scalar(1, 2, 3, { preferRemote: true }) === 3);
ok('mergeById: no base means everything is an addition', mergeById([], [{ id: 'a' }], [{ id: 'b' }]).length === 2);
ok('mergeById: identical lists stay as they are', mergeById([{ id: 'a', v: 1 }], [{ id: 'a', v: 1 }], [{ id: 'a', v: 1 }]).length === 1);
ok('mergeById: an unchanged item deleted remotely goes, a changed one stays', mergeById([{ id: 'a', v: 1 }, { id: 'b', v: 1 }], [{ id: 'a', v: 1 }, { id: 'b', v: 2 }], []).map((x) => x.id).join() === 'b');
ok('mergeSet: adds from both, removals from either', mergeSet(['a', 'b'], ['a', 'c'], ['b', 'd']).sort().join() === 'c,d');
ok('same() ignores order of lists but not of values', same({ a: [1, 2] }, { a: [2, 1] }) && !same({ a: [1, 2] }, { a: [1, 3] }) && same(emptyUnit('settings'), emptyUnit('settings')));
ok('cleanUnit rejects unknown keys', cleanUnit('nope', {}) === null && cleanUnit('day:2026-13-99x', {}) === null);
const mu = mergeUnit(`day:${D1}`, emptyUnit(`day:${D1}`), { entries: [entry('1', D1)], water: 250, weight: null }, { entries: [], water: 500, weight: 70 });
ok('mergeUnit combines a day field by field', mu.entries.length === 1 && mu.water === 500 && mu.weight === 70);


// ============ My foods (scanned and typed-in foods) ============
{
  const food = (code, name, lastUsed = 1, extra = {}) => ({ id: code, code, name, brand: '', unit: 'g', servingText: '', servingAmount: null, allergens: [], traces: [], analysis: [], hasNutrition: true, per100: { calories: 100, protein: 5, carbs: 10, fat: 2 }, perServing: null, custom: false, lastUsed, ...extra });
  const C1 = '3017620422003', C2 = '5000112637922', C3 = '9300675024235';
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  A.state.foods = [food(C1, 'Spread', 10)];
  await A.sync();
  ok('saved foods are their own unit, uploaded once there is one', [...s.table(A.userId).keys()].includes('foods') && s.table(A.userId).get('foods').value.foods.length === 1);
  await B.sync();
  ok('another device gets the saved foods', B.state.foods.length === 1 && B.state.foods[0].name === 'Spread' && equalState(A, B));

  A.state.foods = [food(C2, 'Yoghurt', 20), ...A.state.foods];
  B.state.foods = [food(C3, 'Lasagne', 30, { custom: true, per100: null, perServing: { calories: 520, protein: 30, carbs: 48, fat: 22 } }), ...B.state.foods];
  await A.sync(); await B.sync(); await A.sync();
  ok('foods added on two devices are both kept', A.state.foods.map((f) => f.id).sort().join() === [C1, C2, C3].sort().join() && equalState(A, B));
  ok('a typed-in food arrives intact, with its barcode and per-serving numbers', A.state.foods.find((f) => f.id === C3).custom === true && A.state.foods.find((f) => f.id === C3).perServing.calories === 520);

  A.state.foods = A.state.foods.filter((f) => f.id !== C1);
  await A.sync(); await B.sync();
  ok('removing a food on one device removes it on the other (and it does not come back)', !B.state.foods.some((f) => f.id === C1) && (await B.sync(), await A.sync(), !A.state.foods.some((f) => f.id === C1)) && equalState(A, B));

  A.state.foods = A.state.foods.map((f) => (f.id === C2 ? { ...f, lastUsed: 900 } : f));
  B.state.foods = B.state.foods.map((f) => (f.id === C3 ? { ...f, name: 'Mum\'s lasagne' } : f));
  await A.sync(); await B.sync(); await A.sync();
  ok('different edits to different foods are both kept (used-today on one, renamed on the other)', A.state.foods.find((f) => f.id === C2).lastUsed === 900 && A.state.foods.find((f) => f.id === C3).name === 'Mum\'s lasagne' && equalState(A, B));

  A.state.foods = [];
  await A.sync(); await B.sync();
  ok('removing every saved food syncs too (an empty list is not "nothing to do")', B.state.foods.length === 0 && equalState(A, B));
}
{
  const s = new FakeServer(); const A = new Device(s); const B = new Device(s);
  ok('with no saved foods there is no foods unit at all, so nothing else about syncing changed', !('foods' in A.units()) && collectUnits({ ...blank(), foods: [{ id: 'x' }] }).foods.foods.length === 1);
  const t = s.table(A.userId);
  t.set('foods', { key: 'foods', version: 1, updated_at: s.stamp(), value: { foods: [{ id: 'bad' }, 7, { id: C0(), name: 'N', code: '3017620422003', perServing: { calories: 5 }, lastUsed: 1 }] } });
  await A.sync();
  ok('hostile saved foods from the cloud are cleaned (broken ones dropped, good ones kept)', A.state.foods.length === 1 && A.state.foods[0].name === 'N');
  ok('the foods unit is cleaned like any other (cleanUnit and emptyUnit know it)', same(cleanUnit('foods', { foods: 5 }), { foods: [] }) && same(emptyUnit('foods'), { foods: [] }));
  function C0() { return '3017620422003'; }
}

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
