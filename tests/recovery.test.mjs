// Run with: npm test
// Tests the forgot-password pieces that need no browser: reading the link from the address bar, and the calls
// Nutrily makes to Supabase for sending a reset email and choosing a new password.
import { readEmailLink } from '../src/lib/recoveryLink.js';
import { wrap } from '../src/lib/backend.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };

// ---- reading the address bar ----
ok('a password-reset link is recognised', readEmailLink('#access_token=abc&refresh_token=r&expires_in=3600&token_type=bearer&type=recovery', '') === 'recovery');
ok('with or without the leading # or ?', readEmailLink('access_token=abc&type=recovery', '') === 'recovery' && readEmailLink('', '?type=recovery&code=xyz') === 'recovery' && readEmailLink('', 'type=recovery&token_hash=h') === 'recovery');
ok('a recovery type with nothing to sign in with is ignored', readEmailLink('#type=recovery', '') === null && readEmailLink('', '?type=recovery') === null);
ok('a link that is used up or too old is recognised', readEmailLink('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', '') === 'expired' && readEmailLink('', '?error_code=otp_expired') === 'expired' && readEmailLink('#error=access_denied&error_description=Something', '') === 'expired');
ok('anything else is not a reset link (sign-up confirmations, ordinary pages, junk)', readEmailLink('', '') === null && readEmailLink('#access_token=abc&type=signup', '') === null && readEmailLink('#/meals', '') === null && readEmailLink('#error=server_error', '') === null && readEmailLink(undefined, undefined) === null && readEmailLink(null, null) === null && readEmailLink('%%%', '%%%') === null);
ok('a bare error without a reason is not treated as an expired link', readEmailLink('#error=access_denied', '') === null);

// ---- the Supabase calls ----
globalThis.window = { location: { origin: 'https://nutrily.example' } };
const calls = [];
const client = (over = {}) => ({
  auth: {
    resetPasswordForEmail: async (email, options) => { calls.push(['reset', email, options]); return over.reset ?? { data: {}, error: null }; },
    updateUser: async (attrs) => { calls.push(['update', attrs]); return over.update ?? { data: {}, error: null }; },
    onAuthStateChange: (cb) => { client.last = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    getSession: async () => ({ data: { session: null } }),
  },
});
let b = wrap(client());
let r = await b.resetPassword('me@example.com');
ok('asking for a reset email sends the address and returns people to this site', JSON.stringify(r) === '{}' && calls[0][0] === 'reset' && calls[0][1] === 'me@example.com' && calls[0][2].redirectTo === 'https://nutrily.example');
r = await wrap(client({ reset: { error: { message: 'email rate limit exceeded' } } })).resetPassword('me@example.com');
ok('hitting the email limit says to wait a while (not "a minute")', r.error === 'Too many reset emails were requested. Wait a while and try again.');
r = await wrap(client({ reset: { error: { message: 'For security purposes, you can only request this after 52 seconds.' } } })).resetPassword('me@example.com');
ok('the "only once every N seconds" reply is also explained', r.error === 'Too many reset emails were requested. Wait a while and try again.');
r = await wrap(client({ reset: { error: { message: 'Failed to fetch' } } })).resetPassword('me@example.com');
ok('being offline gives the usual plain message', r.error === "Couldn't reach the server. Check your connection and try again.");
r = await wrap(client({ reset: { error: { message: 'Error sending recovery email' } } })).resetPassword('me@example.com');
ok('any other problem is passed on as written', r.error === 'Error sending recovery email');

calls.length = 0;
r = await b.setPassword('new-secret-1');
ok('choosing a new password updates the signed-in account', JSON.stringify(r) === '{}' && calls[0][0] === 'update' && calls[0][1].password === 'new-secret-1');
const msg = async (message) => (await wrap(client({ update: { error: { message } } })).setPassword('x')).error;
ok('the same password as before is explained', (await msg('New password should be different from the old password.')) === 'Your new password must be different from your old one.');
ok('a link that has run out is explained', (await msg('Auth session missing!')) === 'That link has expired. Go back and ask for a new one.' && (await msg('JWT expired')) === 'That link has expired. Go back and ask for a new one.');
ok('a too-short password is explained', (await msg('Password should be at least 6 characters.')) === 'Use a password with at least 6 characters.');
ok('a weak or leaked password is explained', (await msg('Password is known to be weak and easy to guess, please choose a different one.')) === 'That password is too easy to guess. Try a longer one, or mix in numbers.' && (await msg('Password has been found in a data breach (pwned)')) === 'That password is too easy to guess. Try a longer one, or mix in numbers.');
ok('being offline is explained', (await msg('Failed to fetch')) === "Couldn't reach the server. Check your connection and try again.");

// ---- sign-in events reach the app with their name ----
const seen = [];
b.onAuthChange((session, event) => seen.push([session, event]));
client.last('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'me@example.com' } });
client.last('SIGNED_OUT', null);
ok('the app is told which event happened, so it can spot a password-reset sign-in', seen[0][1] === 'PASSWORD_RECOVERY' && seen[0][0].user.email === 'me@example.com' && seen[1][1] === 'SIGNED_OUT' && seen[1][0] === null);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
