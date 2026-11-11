// Run with: npm test
// Tests the app's side of deleting an account (the call to the server, and what happens to the sign-in on failure)
// and the copy of the person's data offered before deleting.
import { wrap } from '../src/lib/backend.js';
import { EXPORT_KEYS, buildExport, exportFilename } from '../src/lib/exportData.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };

// ---- deleting: the call to the server ----
const make = ({ invoke, signOutThrows = false } = {}) => {
  const calls = { invoke: [], signOut: [] };
  const client = {
    functions: { invoke: async (name, options) => { calls.invoke.push([name, options]); return invoke ?? { data: { ok: true }, error: null }; } },
    auth: { signOut: async (options) => { calls.signOut.push(options); if (signOutThrows) throw new Error('403'); return { error: null }; } },
  };
  return { backend: wrap(client), calls };
};
const failure = (body, message = 'Edge Function returned a non-2xx status code') => ({ data: null, error: { message, context: { json: async () => body } } });

let { backend, calls } = make();
let r = await backend.deleteAccount('secret1');
ok('deleting calls the delete-account function with the typed password', JSON.stringify(r) === '{}' && calls.invoke[0][0] === 'delete-account' && calls.invoke[0][1].body.password === 'secret1');
ok('and then forgets the sign-in on this device only (the login no longer exists on the server)', calls.signOut.length === 1 && calls.signOut[0].scope === 'local');

({ backend, calls } = make({ signOutThrows: true }));
r = await backend.deleteAccount('secret1');
ok('if forgetting the sign-in fails, the account is still reported as deleted', JSON.stringify(r) === '{}');

({ backend, calls } = make({ invoke: failure({ error: 'That password is not right.' }) }));
r = await backend.deleteAccount('wrong');
ok('a wrong password shows the server\'s own words, and the person stays signed in', r.error === 'That password is not right.' && calls.signOut.length === 0);

({ backend, calls } = make({ invoke: failure({ error: 'Too many attempts. Wait a minute and try again.' }) }));
r = await backend.deleteAccount('x');
ok('too many attempts is passed on, still signed in', r.error === 'Too many attempts. Wait a minute and try again.' && calls.signOut.length === 0);

({ backend, calls } = make({ invoke: { data: null, error: { message: 'Failed to send a request to the Edge Function', context: { json: async () => { throw new Error('no body'); } } } } }));
r = await backend.deleteAccount('x');
ok('an unreadable error gives the general "nothing was changed" message, still signed in', r.error === "Your account couldn't be deleted. Nothing was changed, so try again in a moment." && calls.signOut.length === 0);

({ backend, calls } = make({ invoke: { data: null, error: { message: 'Failed to fetch', context: { json: async () => { throw new Error('no body'); } } } } }));
r = await backend.deleteAccount('x');
ok('being offline says so, nothing changed, still signed in', r.error === "Couldn't reach the server. Nothing was changed. Check your connection and try again." && calls.signOut.length === 0);

({ backend, calls } = make({ invoke: failure({}) }));
r = await backend.deleteAccount('x');
ok('an error with no explanation gets the general message', r.error === "Your account couldn't be deleted. Nothing was changed, so try again in a moment." && calls.signOut.length === 0);

// ---- the copy of the person's data ----
const store = (entries) => ({ getItem: (k) => (Object.prototype.hasOwnProperty.call(entries, k) ? entries[k] : null) });
const NOW = new Date(2026, 10, 12, 9, 30);
const everything = {
  'nutrily:entries': JSON.stringify([{ id: 'e1', name: 'Toast', calories: 160 }]),
  'nutrily:goals': JSON.stringify({ calories: 2000 }),
  'nutrily:water': JSON.stringify({ '2026-11-12': 500 }),
  'nutrily:weights': JSON.stringify({ '2026-11-12': 80 }),
  'nutrily:profile': JSON.stringify({ age: '30' }),
  'nutrily:preferences': JSON.stringify({ diets: ['vegan'] }),
  'nutrily:meals': JSON.stringify([{ id: 'm1', name: 'Bowl' }]),
  'nutrily:plan': JSON.stringify([{ id: 'p1' }]),
  'nutrily:foods': JSON.stringify([{ id: 'f1', name: 'Yoghurt' }]),
  'nutrily:sync': JSON.stringify({ userId: 'user-1', cursor: 'abc', versions: { a: 1 } }),
  'nutrily:onboarded': 'true',
  'sb-project-auth-token': JSON.stringify({ access_token: 'SECRET-TOKEN', refresh_token: 'SECRET-REFRESH' }),
  'fake:session': JSON.stringify({ token: 'SECRET' }),
};
const out = buildExport(store(everything), NOW);
ok('the copy has the app name, the time, and each kind of data the person has', out.app === 'Nutrily' && out.exportedAt === NOW.toISOString() && EXPORT_KEYS.every((k) => k in out.data) && out.data.entries[0].name === 'Toast' && out.data.weights['2026-11-12'] === 80 && out.data.foods[0].name === 'Yoghurt');
const text = JSON.stringify(out);
ok('it never includes sign-in tokens, the sync bookkeeping, or other apps\' data', !text.includes('SECRET') && !text.includes('user-1') && !text.includes('cursor') && !text.includes('access_token') && !('sync' in out.data) && !('onboarded' in out.data));
ok('a person with nothing yet gets an empty but valid copy', JSON.stringify(buildExport(store({}), NOW).data) === '{}');
ok('a damaged entry is left out instead of breaking the whole copy', (() => { const o = buildExport(store({ 'nutrily:entries': '{not json', 'nutrily:goals': JSON.stringify({ calories: 1 }) }), NOW); return !('entries' in o.data) && o.data.goals.calories === 1; })());
ok('storage that throws does not break it either', JSON.stringify(buildExport({ getItem: () => { throw new Error('blocked'); } }, NOW).data) === '{}');
ok('the file is named with the local date', exportFilename(NOW) === 'nutrily-data-2026-11-12.json' && exportFilename(new Date(2027, 0, 5)) === 'nutrily-data-2027-01-05.json');

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
