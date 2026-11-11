// Run with: npm test
// Tests the decisions the delete-account Edge Function makes. The important rule: nothing is deleted unless the person
// is signed in AND the password they typed was checked and is right.
import { deleteAccount } from '../supabase/functions/delete-account/logic.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };

// Options are read with `in`, so passing undefined really means "nothing" rather than falling back to the default.
const DEFAULTS = { user: { id: 'u1', email: 'me@example.com' }, password: 'secret1', check: 'ok', removed: true };
const run = async (opts = {}) => {
  const o = { ...DEFAULTS, ...opts };
  const calls = { check: [], del: [] };
  const result = await deleteAccount({
    user: o.user, password: o.password,
    checkPassword: async (email, pw) => { calls.check.push([email, pw]); return o.check; },
    deleteUser: async (id) => { calls.del.push(id); return o.removed; },
  });
  return { result, calls };
};

let { result, calls } = await run();
ok('with the right password the account is deleted', result.status === 200 && result.ok === true && calls.del.join() === 'u1');
ok('the password is checked against the signed-in person\'s own email (not anything sent by the app)', calls.check.length === 1 && calls.check[0][0] === 'me@example.com' && calls.check[0][1] === 'secret1');

({ result, calls } = await run({ check: 'wrong' }));
ok('a wrong password deletes nothing, and says so', result.status === 403 && result.error === 'That password is not right.' && calls.del.length === 0);
({ result, calls } = await run({ check: 'limited' }));
ok('too many attempts deletes nothing, and says to wait', result.status === 429 && /Wait a minute/.test(result.error) && calls.del.length === 0);
({ result, calls } = await run({ check: 'unavailable' }));
ok('if the password cannot be checked, nothing is deleted and that is said plainly', result.status === 502 && /Nothing was deleted/.test(result.error) && calls.del.length === 0);
({ result, calls } = await run({ check: 'something-unexpected' }));
ok('any unexpected answer from the check counts as "not confirmed", never as a yes', result.status === 403 && calls.del.length === 0);
({ result, calls } = await run({ check: undefined }));
ok('so does no answer at all', result.status === 403 && calls.del.length === 0);

for (const [label, password] of [['no password', undefined], ['an empty password', ''], ['a password that is not text', 12345], ['an object', { a: 1 }], ['an enormous password', 'x'.repeat(201)]]) {
  ({ result, calls } = await run({ password }));
  ok(`${label}: refused before anything is checked or deleted`, result.status === 400 && calls.check.length === 0 && calls.del.length === 0);
}
for (const [label, user] of [['nobody signed in', null], ['no user', undefined], ['a user with no id', { email: 'a@b.c' }], ['a user with no email', { id: 'u1', email: '' }], ['an id that is not text', { id: 5, email: 'a@b.c' }]]) {
  ({ result, calls } = await run({ user }));
  ok(`${label}: refused (401), nothing checked or deleted`, result.status === 401 && calls.check.length === 0 && calls.del.length === 0);
}
({ result, calls } = await run({ removed: false }));
ok('if the delete itself fails, it says nothing changed so they can try again', result.status === 500 && /Nothing was changed/.test(result.error) && result.ok === undefined);
({ result } = await run({ removed: undefined }));
ok('only a clear "true" from the delete counts as deleted', result.status === 500);
({ calls } = await run({ user: { id: 'victim', email: 'victim@example.com' }, password: 'guess' , check: 'wrong' }));
ok('a wrong guess against someone else\'s email never reaches the delete', calls.del.length === 0);
ok('the delete is asked for exactly once, for the signed-in person\'s id only', (await run()).calls.del.length === 1);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
