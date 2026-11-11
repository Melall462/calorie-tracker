// Run with: npm test
// Tests the privacy policy: that it is well formed, that the settings that go into it are safe, and above all that it
// matches what the app really does (every company the code contacts is mentioned, and the AI request carries only
// what the policy says it carries).
import fs from 'node:fs';
import path from 'node:path';
import { PRIVACY_UPDATED, buildPrivacyPolicy, policyText } from '../src/legal/privacy.js';
import { resolveLegalConfig } from '../src/legal/config.js';
import { buildContext, planDays, planMeals } from '../src/lib/planAi.js';
import { buildPrompt, validateRequest } from '../supabase/functions/plan-meals/plan.js';
import { EXPORT_KEYS } from '../src/lib/exportData.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };

// ---- the settings that go into the policy ----
ok('with nothing set, the operator and email are blank', JSON.stringify(resolveLegalConfig({})) === '{"operator":"","email":""}' && JSON.stringify(resolveLegalConfig()) === '{"operator":"","email":""}');
ok('a normal name and email are used (and trimmed)', JSON.stringify(resolveLegalConfig({ VITE_OPERATOR_NAME: '  Alex Smith ', VITE_CONTACT_EMAIL: ' help@example.co.nz ' })) === '{"operator":"Alex Smith","email":"help@example.co.nz"}');
for (const bad of ['not an email', 'a@b', '@example.com', 'a@@b.com', 'a b@example.com', 'a@example.com, b@example.com', '<script>@x.com', 'javascript:alert(1)//@x.com', 'a@b.com\nBcc: x@y.com', 'mailto:a@b.com', 'a@b.c>', '']) {
  ok(`an email that is not safe or not valid is treated as not set: ${JSON.stringify(bad)}`, resolveLegalConfig({ VITE_CONTACT_EMAIL: bad }).email === '');
}
ok('an email with a hidden character or angle brackets is rejected whole, not tidied into a different address', resolveLegalConfig({ VITE_CONTACT_EMAIL: 'a\u0000@b.com' }).email === '' && resolveLegalConfig({ VITE_CONTACT_EMAIL: '<x>@b.com' }).email === '' && resolveLegalConfig({ VITE_CONTACT_EMAIL: 'x@b.com' }).email === 'x@b.com');
ok('odd values are ignored rather than crashing', resolveLegalConfig({ VITE_CONTACT_EMAIL: 5, VITE_OPERATOR_NAME: { a: 1 } }).email === '' && resolveLegalConfig({ VITE_OPERATOR_NAME: null }).operator === '');
ok('the name loses angle brackets and control characters and is cut to 80 characters', resolveLegalConfig({ VITE_OPERATOR_NAME: 'A<b>l\u0000ex' }).operator === 'Ablex' && resolveLegalConfig({ VITE_OPERATOR_NAME: 'x'.repeat(200) }).operator.length === 80);

// ---- the policy is well formed ----
const blank = buildPrivacyPolicy({});
const full = buildPrivacyPolicy({ operator: 'Alex Smith', email: 'help@example.co.nz' });
const text = policyText(blank);
ok('it has a title, a date written out in words, and an introduction', blank.title === 'Privacy policy' && /^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(PRIVACY_UPDATED) && blank.updated === PRIVACY_UPDATED && blank.intro.length > 80);
ok('every section has a unique id, a title and some content', new Set(blank.sections.map((s) => s.id)).size === blank.sections.length && blank.sections.every((s) => /^[a-z-]+$/.test(s.id) && s.title.length > 3 && s.blocks.length > 0));
ok('no leftover template marks or placeholders in the words', !/\$\{|undefined|\[object|TODO|FIXME|lorem|\{\{|XXX/i.test(text) && !/\[[A-Z ]+\]/.test(text));
ok('the operator falls back to plain words when not set, and is named when set', policyText(blank).includes('the person who runs Nutrily') && policyText(full).includes('run by Alex Smith in New Zealand') && !policyText(full).includes('the person who runs Nutrily'));
ok('with no email, the contact section says contact details have not been added (rather than showing a blank or fake address)', blank.contact === "Contact details haven't been added to this copy of Nutrily yet." && blank.contactEmail === '' && !/@/.test(policyText(blank)));
ok('with an email, the contact section gives it', full.contactEmail === 'help@example.co.nz' && policyText(full).includes('help@example.co.nz'));
ok('the last section is the contact section', blank.sections.at(-1).id === 'contact' && blank.sections.at(-1).blocks[0].contact === true);

// ---- it says what a good policy has to say ----
for (const [label, re] of [
  ['it names Supabase', /Supabase/], ['it names Vercel', /Vercel/], ['it names Anthropic', /Anthropic/], ['it names Open Food Facts', /Open Food Facts/], ['it names Google Fonts', /Google Fonts/],
  ['it says where the cloud data is (Singapore)', /Singapore/], ['it says it does not sell information', /never sell your information|do not sell your information/],
  ['it says there are no ads, analytics or tracking', /no ads, no analytics and no tracking/], ['it is honest that the operator can see cloud data and that it is not end-to-end encrypted', /not end-to-end encrypted/],
  ['it names the New Zealand Privacy Act 2020 and the Privacy Commissioner', /Privacy Act 2020/], ['it points to privacy.org.nz', /privacy\.org\.nz/],
  ['it says how to delete the account', /Delete my account/], ['it says how to get a copy of the data', /Download a copy of my data first/], ['it says it is for people 18 and over', /18 and over/],
  ['it says health information is not medical advice', /not medical or dietary advice/], ['it says to read allergy labels', /read the label/],
  ['it says the camera image stays on the device', /processed on your device and is not uploaded or stored/],
]) ok(label, re.test(text));

// ---- what the policy says is true of the app ----
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
ok('the buttons the policy points people to really exist, with those names', read('src/components/CloudCard.jsx').includes('Delete my account') && read('src/components/CloudCard.jsx').includes('Sign out and clear this device') && read('src/components/DeleteAccount.jsx').includes('Download a copy of my data first'));
ok('the kinds of data the policy lists match what the app keeps and exports', ['entries', 'water', 'weights', 'goals', 'profile', 'preferences', 'meals', 'plan', 'foods'].every((k) => EXPORT_KEYS.includes(k)) && /food diary/i.test(text) && /Water and weight/.test(text) && /allergies/.test(text) && /recipes, meal plans, and My foods/.test(text));

// Every company the code contacts must be named in the policy. A new one makes this fail until the policy is updated.
const DISCLOSED = { 'world.openfoodfacts.org': 'Open Food Facts', 'fonts.googleapis.com': 'Google Fonts', 'fonts.gstatic.com': 'Google Fonts', 'api.anthropic.com': 'Anthropic' };
const NOT_A_SERVICE = new Set(['localhost', '127.0.0.1', 'www.w3.org']);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(dir, e.name))) : /\.(jsx?|tsx?|html|css)$/.test(e.name) ? [path.join(dir, e.name)] : []));
const files = [...walk('src'), ...walk('supabase/functions'), 'index.html'];
const hosts = new Set();
for (const f of files) for (const m of read(f).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase());
const unknown = [...hosts].filter((h) => !DISCLOSED[h] && !NOT_A_SERVICE.has(h));
ok('the code only contacts services the policy discloses', unknown.length === 0, 'not in the policy: ' + unknown.join(', '));
ok('and every one of them is named in the policy', [...new Set(Object.values(DISCLOSED))].every((name) => text.includes(name)));
ok('the checker really is looking at the code (it finds the known services)', hosts.has('world.openfoodfacts.org') && hosts.has('fonts.googleapis.com') && hosts.has('api.anthropic.com'), [...hosts].join(','));
ok('no analytics or tracking tools are in the app or its dependencies (the policy file is skipped: it says there are none)', !/analytics|gtag|sentry|posthog|mixpanel|plausible|hotjar|segment\.com|facebook\.net|doubleclick/i.test(files.filter((f) => !f.includes('legal')).map(read).join('\n') + read('package.json')));

// What the AI request carries: only what the policy lists, whatever the app's data holds.
const ALLOWED = new Set(['mode', 'dayIndex', 'slots', 'targets', 'diets', 'avoid', 'likes', 'dislikes', 'cuisines', 'budget', 'avoidNames', 'partial', 'existing', 'count']);
const goals = { calories: 2000, protein: 120, carbs: 200, fat: 60, water: 2500, email: 'me@example.com' };
const preferences = { diets: ['vegan'], avoid: ['peanut'], likes: ['rice'], dislikes: ['liver'], email: 'me@example.com', weightKg: 80, profile: { age: '30' } };
const context = buildContext({ goals, preferences, cuisines: ['Thai'], budget: 'low' });
ok('the app builds the AI request from targets, eating style, allergies, likes, dislikes, cuisines and budget only', Object.keys(context).sort().join() === 'avoid,budget,cuisines,diets,dislikes,likes,targets' && Object.keys(context.targets).sort().join() === 'calories,carbs,fat,protein');
ok('no email, weight, age or water goal gets in even if the data holds them', !JSON.stringify(context).includes('me@example.com') && !JSON.stringify(context).includes('weightKg') && !JSON.stringify(context).includes('"age"') && !('water' in context.targets));
const sent = [];
const planner = async (payload) => { sent.push(payload); return { meals: [] }; };
await planDays({ planner, dates: ['2026-11-12', '2026-11-13'], slots: ['breakfast', 'lunch', 'dinner'], context, prefs: { ...preferences }, book: [{ id: 'r1', name: "Mum's lasagne", servings: 1, notes: 'private note', ingredients: [{ id: 'i', name: 'Pasta', serving: '100 g', calories: 600, protein: 20, carbs: 80, fat: 20 }] }], reuse: { id: 'x', chance: 1, maxPerDay: 1 }, random: () => 0 });
await planMeals({ planner, count: 3, slots: ['lunch'], context, prefs: { ...preferences } });
ok('every request the app sends to the AI function uses only the listed fields', sent.length >= 3 && sent.every((p) => Object.keys(p).every((k) => ALLOWED.has(k))), sent.map((p) => Object.keys(p).join('/')).join(' | '));
ok('a borrowed recipe contributes only its name and calories, not its notes or ingredients', JSON.stringify(sent).includes("Mum's lasagne") && !JSON.stringify(sent).includes('private note') && !JSON.stringify(sent).includes('Pasta'));
ok('and nothing sent contains the email address', !JSON.stringify(sent).includes('me@example.com'));

// The server side drops anything else, so even a modified app cannot send more.
const hostile = { mode: 'day', slots: ['lunch'], targets: { calories: 2000, protein: 100, carbs: 200, fat: 60 }, email: 'secret@example.com', name: 'Sam Jones', userId: 'u-123', token: 'tok-999', password: 'hunter2', weightKg: 83, diary: [{ name: 'Secret snack' }], profile: { age: 41 }, dayIndex: 0 };
const checked = validateRequest(hostile);
const prompt = buildPrompt(checked.value);
const everything = JSON.stringify(checked.value) + prompt.system + prompt.user;
ok('the server keeps only the listed fields from a request', checked.ok && Object.keys(checked.value).every((k) => ALLOWED.has(k)), Object.keys(checked.value).join());
ok('so an email, name, user id, token, password, weight, diary or age never reaches the AI prompt', !/secret@example|Sam Jones|u-123|tok-999|hunter2|83|Secret snack|"age"|41/.test(everything.replace(/\b2000\b|\b100\b|\b200\b|\b60\b/g, '')), everything);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
