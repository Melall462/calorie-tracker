# Nutrily

A calorie, macro, water and weight tracker, in forest green and oat. Set daily goals, log what you eat and drink, see what you have left.

This is the first version: React only, no backend. Data is saved in your browser's localStorage.

## Run it

```bash
npm install
npm run dev      # the app
npm test         # the sync engine tests
```

Then open the address Vite prints (usually http://localhost:5173). Needs Node 18 or newer.

## What it does

- **Today:** a scrollable strip of the last 60 days (tap one to view it, a dot means something was logged), a headline calories-left number with a progress ring, plus protein, carbs and fat against your goals. A water tracker with quick +250 ml and +500 ml buttons. Entries grouped by meal, each with Edit and Remove. Step back through past days.
- **Scan (Add food tab):** scan a product's barcode with the camera, or type the number under it. Nutrily looks it up in [Open Food Facts](https://world.openfoodfacts.org) (a free, community-built food database, no API key) and shows the name, brand and a nutrition panel laid out like the pack's: one column **per serving** (using the pack's own serving size, such as "2 biscuits (25 g)") and one **per 100 g or 100 ml**. It starts at 1 serving, and you can enter servings (0.5, 2, 3...) or switch to grams/millilitres. Entries are logged as, for example, "2 servings (30 g)". The same Scan option is available when adding an ingredient to a saved meal.
- **Meals (Add food tab):** a recipe book. Tap **Add meal** to build a meal from ingredients (from the food list or custom), say how many servings it makes, and add optional method notes. Nutrition per serving is worked out for you. Later, open a saved meal, choose how many servings you ate (1.5 works) and log it to a meal slot in one tap. Meals can be edited and deleted, and editing a recipe never changes entries you already logged.
- **Add food:** pick from a built-in list of about 40 foods (with macros) and a servings amount, or enter a custom food. Leave custom calories blank and they are worked out from the macros.
- **Edit entry:** change an entry's name, serving note, meal, date (to move it to another day), calories and macros. Clear the calories to work them out from the macros.
- **First-run setup:** new visitors get a welcome screen and five short steps (About you, Activity, Your goal, Food preferences, Your plan). It uses the calorie calculator, so the same safety rules apply. Finishing saves your targets, your body stats, your food preferences and today's weight as the first weigh-in. People can skip it, and anyone who already has saved data goes straight to the app. Account has a **Run setup again** link.
- **Meal planner (Meals > Planner):** plan meals onto days and meal times from your recipe book, week by week, with each day's planned calories and macros against your targets. **Log** puts a planned meal in that day's food diary in one tap (and **Undo** takes it back). With an account, **Plan with AI** can write whole days or a whole week of meals, or a few separate meals, around your targets, diet, allergies and likes, plus cuisines and a budget. See *AI meal planner* below.
- **Accounts and sync (optional):** with Supabase configured, people can create an account and their data syncs between devices. Without it, everything stays on the device exactly as before. See *Cloud sync* below.
- **Navigation:** four tabs, Today, Add food, Meals and Account.
- **Meals tab:** your recipe book as a page of its own. Build meals from ingredients, edit or delete them, and log one to a meal time in one tap (the same recipe book is also reachable from Add food > Meals).
- **Account tab:** four sections. **Targets** (daily calories, protein, carbs, fat and water), **Calculator** (body stats and the calorie calculator), **Weight**, and **Food** (food preferences). Everything is saved on the device.
- **Weight (Account > Weight):** log your weight in kg by date (one per day), see the latest weight, the change since your first entry, how far you are from your goal weight, and a trend chart. Edit or remove any weigh-in.
- **Calculator (Account > Calculator):** enter sex, age, height, weight, optional body fat %, activity level, your aim (lose, keep or gain), goal weight and pace. Nutrily works out resting burn (BMR), maintenance calories, a daily target, macros, the expected pace and roughly when you'll reach your goal. One tap applies the targets. Your stats are saved on the device, and Account > Weight shows how far you are from your goal weight.
- **Targets (Account > Targets):** daily calories, protein, carbs, fat and water. A button fills the macros from your calories (30% protein, 40% carbs, 30% fat).

## Project structure

```
src/
  styles.css               the whole look: colour tokens at the top
  App.jsx                  state and tab navigation
  components/
    Today.jsx              day strip, summary, water, entries by meal
    DayStrip.jsx           scrollable row of days
    Summary.jsx            calorie ring and macro bars
    Icon.jsx               navigation icons
    Water.jsx              water progress and quick-add buttons
    AddFood.jsx            meal slot selector and the Search, Custom and Meals tabs
    FoodPicker.jsx         food list search and custom entry, reused for ingredients
    ScanPane.jsx           barcode scanning, lookup and choosing an amount
    MealsPane.jsx          the recipe book: saved meals, log, edit, delete
    MealBuilder.jsx        create or edit a saved meal
    EditEntry.jsx          edit a logged food
    Weight.jsx             log weight, trend chart, history (shown inside Account)
    Onboarding.jsx         the first-run setup flow
    FoodPreferences.jsx    diet, allergies, foods you love and avoid (setup and Account > Food)
    Planner.jsx            the week planner: days, meal times, logging
    PlanGenerator.jsx      the Plan with AI screen
    TagInput.jsx           type-and-Enter tags (food preferences, cuisines)
    CloudCard.jsx          the account and sync panel on the Account page
    AuthForm.jsx           sign in or create an account
    Account.jsx            the Account page: Targets, Calculator and Weight sections
    MealsPage.jsx          the Meals tab: the recipe book as a page
    BodyStats.jsx          body stats form and the calculated plan
  lib/
    useLocalStorage.js     saves state to the browser
    barcode.js             barcode check digits, Open Food Facts lookup and parsing
    scanner.js             camera barcode reading and camera error messages
    plan.js                planner data: weeks, plan items, day totals
    planAi.js              runs AI planning day by day and turns replies into safe recipes
    mealSafety.js          allergy and diet screen for meals
    backend.js             the only file that talks to Supabase (auth and the sync table)
    sync.js                the sync engine: compare, push, pull, retry on conflict
    merge.js               three-way merge of two copies of the data
    units.js               cuts the app's data into syncable pieces and cleans downloaded data
    useCloudSync.js        React hook: session, scheduling and status
    CloudContext.js        shares account and sync state with screens
    preferences.js         food preferences: cleaning, diet and allergen flags, scan warnings
    PreferencesContext.js  shares the preferences with the search and scan screens
    onboarding.js          detects people who already have saved data, so they skip setup
    recipes.js             saved meals: per-serving maths and cleaning stored data
    nutrition.js           goals, limits, totals and macro maths
    dates.js               date helpers ("YYYY-MM-DD" strings)
    foods.js               built-in food list
    calculator.js          BMR, maintenance, target, macros and safety limits
    meals.js               meal names and small helpers
docs/MVP.md                the plan for this version
```

## Data

Stored in the browser under ten keys:

- `nutrily:goals`: `{ calories, protein, carbs, fat, water }` (water in ml)
- `nutrily:entries`: a list of `{ id, date, name, serving, calories, protein, carbs, fat, meal, source }`
- `nutrily:water`: millilitres per day, e.g. `{ "2026-11-10": 1250 }`
- `nutrily:weights`: kilograms per day, e.g. `{ "2026-11-10": 72.4 }`
- `nutrily:meals`: the recipe book, a list of `{ id, name, servings, notes, ingredients: [{ id, name, serving, calories, protein, carbs, fat }] }`. Ingredient numbers are for the whole amount in the recipe, and per-serving values are calculated from them.
- `nutrily:onboarded`: `true` once setup is finished or skipped. If it is missing but other Nutrily data exists, the app treats the person as an existing user.
- `nutrily:preferences`: `{ diets, avoid, likes, dislikes }`. Diets and allergies are lists of fixed ids; likes and dislikes are short free-text terms.
- `nutrily:sync`: sync notes (which account this device synced as, a cursor, and the last-synced copy of each piece of data). Only exists once someone has signed in.
- `nutrily:plan`: planned meals, `{ id, date, slot, mealId, servings, done, entryId }`. With an account these sync inside each day's record.
- `nutrily:profile`: body stats and aim for the calculator, kept as text so it works with form inputs

Version 1 stored a single number under `nutrily:goal`. It is carried over automatically, and entries saved before macros existed count as 0 g.

Clearing your browser data deletes the log, and it doesn't sync between devices.

## Deliberately left out (for now)

Accounts and a database, deploying online, AI food estimates, meal planner and shopping list. See `docs/MVP.md` for the roadmap.

## How the calorie calculator works

1. **Resting burn (BMR):** Mifflin-St Jeor, or Katch-McArdle if body fat % is entered.
2. **Maintenance (TDEE)** = BMR x activity multiplier (1.2 to 1.9).
3. **Target** = maintenance, minus or plus about 1,100 kcal a day per kg-a-week of pace (roughly 7,700 kcal per kg), rounded to the nearest 10.
4. **Macros:** protein by body weight (2 g/kg when losing, 1.8 gaining, 1.6 keeping, capped at 35% of calories), 25% of calories from fat, the rest carbs.

Safety limits, all in `src/lib/calculator.js`:

- Adults only (18 to 100). Under 18 gets a message pointing to a doctor or dietitian instead of a number.
- Weight loss is never planned faster than 1% of body weight a week.
- Weight-loss targets never go below 1,200 kcal (female), 1,350 (average) or 1,500 (male), and the plan says when this slows the pace.
- No weight-loss plan if the current BMI or the goal weight's BMI is under 18.5.
- Every result carries a not-medical-advice note.

These are estimates. The numbers are a starting point to adjust from real weigh-ins.

## Design

Forest green is for things you act on (the daily hero, buttons, the nav, the selected day). Oat is the page, linen is a raised surface, and pistachio is the one bright note, used only on forest. All colours are variables at the top of `src/styles.css`, so changing the theme means editing about a dozen lines. The font is DM Sans.

## Barcode scanning

- **Reading the barcode:** if the browser has the built-in `BarcodeDetector`, Nutrily uses it. Otherwise it loads the ZXing library (`@zxing/browser`) on demand, so people on browsers without `BarcodeDetector` can still scan. Only product barcodes (8, 12, 13 or 14 digits) are accepted, and anything else the camera sees is ignored.
- **Camera access** needs `https://` or `localhost`. If the camera is blocked or missing, the typed-number box still works. The camera is switched off after a scan, when you press Stop, and when you leave the tab.
- **Typed numbers** are checked with the barcode check digit before any request is made, which catches most typos.
- **Missing data:** Open Food Facts is community-built, so a product may not exist, or may have no calories listed. Both cases show a plain message and an **Add it as a custom food** button that opens the Custom form (with the product's name filled in when it was found but had no calories). The same button appears after a typo in the barcode, a network error, or a blocked camera, so a failed scan never leaves a dead end. The database holds per-100 g values and, when the pack prints them, per-serving values. Nutrily uses the pack's own per-serving numbers when they exist, works one set out from the other when only one is listed, and falls back to grams alone if a product has no serving size. The app tells people to check it against the pack.
- **Licence and fair use:** Open Food Facts asks apps to credit them (the product card does) and to identify themselves. Browsers do not let a page set its own `User-Agent`, so check their current API guidelines before a public launch.
- **Testing notes:** the lookup, parsing and scaling are unit tested, and the whole flow was tested in a real browser using a fake camera, a mocked detector and a mocked API. The ZXing fallback needs a real device test (an iPhone is a good one), because it could not be exercised without network access.

## Food preferences

People can record an eating style (vegetarian, vegan, pescatarian, halal, kosher), allergies and intolerances (gluten, dairy, eggs, peanuts, tree nuts, soy, fish, shellfish, sesame), and foods they love or would rather avoid. It is asked during setup and can be edited in Account > Food. It is saved on the device only.

What it does:

- **Search:** when a diet or allergy can be checked, foods that do not fit are hidden by default (with a count, and a switch to show them). Foods that are shown carry tags such as "Not vegan" or "Contains gluten". Foods you love come first and foods you would rather avoid come last. Likes and dislikes match by word ("bananas" finds Banana).
- **Scan:** products are checked against the allergen, trace and vegan/vegetarian information in Open Food Facts. An allergen the database lists is a strong alert, traces are noted separately, and a note appears when the database does not say whether something is vegan or vegetarian. Foods on your avoid list are noted.
- **Meal builder:** ingredient search and scanning use the same preferences.

What it cannot do, and says so in the app:

- It cannot promise a food is safe. The built-in tags describe the usual version of each food (oats, for example, are tagged as containing gluten because of cross-contamination), and Open Food Facts is community-entered, with inconsistently named allergen tags and missing data. Anyone who lists an allergy sees a reminder to read the label on every scan, including when the database lists no allergens.
- It cannot check halal, kosher or pescatarian status. Those are saved, but they do not filter or flag anything.

## Cloud sync (optional, Supabase)

Nutrily is **local-first**: it always works from the data saved on the device, with or without an account. Signing in adds a copy in the cloud and keeps your devices in step. If Supabase is not configured, nothing about this appears in the app.

### Set it up

1. **Create a Supabase project** (a separate one from any other app). When creating it, leave **Enable Data API** on, leave **Enable automatic RLS** on, and switch **Automatically expose new tables** off. The migration grants access explicitly.
2. **Create the table.** In the Supabase dashboard open **SQL Editor**, paste `supabase/migrations/20261112000000_sync_units.sql` and run it. Then run `supabase/verify.sql`: every row should say `ok = true`.
3. **Authentication settings** (dashboard > Authentication): keep the Email provider on. Under **URL Configuration**, set the **Site URL** to your deployed address (for example your Vercel URL) so confirmation emails link to the right place, and add `http://localhost:5173` to the redirect URLs for local development. "Confirm email" can stay on; for quick testing you can switch it off.
4. **Give the app the project details.** Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Project Settings > API). Restart `npm run dev`. On Vercel, add the same two variables under Project Settings > Environment Variables and redeploy. Use the **publishable** key only. The secret or `service_role` key must never go in the app.
5. **Try it.** Open Account, tap **Sign in or create account**, then check the `sync_units` table in the Table Editor. Open the app in a second browser, sign in at the welcome screen, and your data should arrive.

### How it works

- **Units.** Data is cut into pieces: one per **day** (its food entries, water and weigh-in), one for **settings** (targets, body stats, food preferences, setup done) and one for the **recipe book**. Each piece is one row in `sync_units`, with a version number. Only pieces that changed are sent.
- **Three-way merge.** The app remembers what each piece looked like at the last sync. At the next sync it compares current data and the cloud's data against that, so it can tell "deleted here" from "added there". Things added on two devices are both kept, a deletion on one device reaches the other and stays deleted, different edits are combined, and food preferences are merged as sets.
- **Conflicts.** If both devices changed the very same thing, the edit you just made wins. The one exception is a device's first-ever sync (it holds data from before it joined the account), where the account's data wins a clash, but nothing logged on either side is lost. Water added on two devices keeps the larger total. Setup, once done anywhere, counts as done everywhere.
- **Safe saving.** A change is saved only if the stored version is still the one the device last saw. If another device saved first, the app fetches that version, merges and tries again. Food logged while a sync is running is kept.
- **When it syncs.** Shortly after any change, when the app is opened again or the device comes back online, and from the **Sync now** button. It works offline and catches up later.
- **Different accounts never mix.** If someone signs in on a device that last synced as a different account, the device's local data is cleared first. **Sign out and clear this device** (for shared devices) backs everything up first and clears nothing if the backup fails.
- **Untrusted data.** Everything downloaded is cleaned before use (types, limits, dates, ids), unknown keys are ignored, and a malformed row can never crash the app.

### Security

- Row-level security: every row belongs to the user who created it and only they can read or change it. Signed-out visitors have no access to the table at all.
- The browser only ever holds the publishable key, which is safe by design because of the rules above.
- Passwords are handled by Supabase Auth. Nutrily never sees or stores them.

### Known limits (worth fixing before a public launch)

- No **password reset** and no **delete my account** yet. Both are needed for a public app, and because this is health-related data a privacy policy is too.
- Syncing happens while the app is open (no background sync).
- Email and password only. No social sign-in.
- The browser's storage (about 5 MB) holds the data plus a copy of the last-synced version, which is plenty for years of normal use.

### How it was tested

`npm test` runs 57 checks of the sync engine against an in-memory stand-in for the cloud: two devices, concurrent edits, deletions, a device saving at the worst moment, an unreachable server, hostile data, and more. The screens were also tested in a real browser against the same stand-in. **Not yet tested against a real Supabase project:** the SQL itself and `src/lib/backend.js` (the thin layer that calls the Supabase library). Run `supabase/verify.sql`, then use the checklist above with two browsers and two different accounts.

## AI meal planner

**Meals > Planner > Plan with AI.** Pick **Whole days** (1 to 7 days, a start date, and which meal times) or **Some meals** (1 to 8, saved to the recipe book). Optionally add cuisines or themes and a budget. The AI is told your Account targets, diet, allergies and the foods you love and avoid. You review the result before anything is saved, then **Save to my planner**.

### How it works

- The app calls a Supabase **Edge Function** (`supabase/functions/plan-meals`), which holds the Anthropic API key and calls the model. The key never reaches the browser.
- A week is **one request per day**. That keeps each answer small, lets the AI vary meals day to day (it is told which meals already exist), and means a failure part-way keeps the days that worked. **Stop** ends a run early and keeps what is done.
- Each meal comes back as one serving with its ingredients. The app adds the ingredients up itself, so a meal's calories are always the sum of its ingredients.

### Safety

- The AI is told your allergies and diet, but it is not trusted. **Every meal is screened in the app** against your allergies and diet before it can be saved, using word lists that understand things like "coconut milk is not dairy" and "peanut butter is still a peanut". A meal that breaks a rule is **removed**, and the review lists which one and why. Foods you only dislike are not blocked.
- Meals with unbelievable numbers (more than 3,500 kcal in a serving, or calories that do not match the protein, carbs and fat) are skipped rather than saved.
- AI-written recipes are labelled **AI-written**, with a reminder to check the ingredients. The same screen tags any recipe in the book that conflicts with your preferences, including ones you wrote yourself.
- This is a keyword screen, not a guarantee. It cannot see inside "sauce", and the lists are not complete. Halal and kosher are only partly screened (pork, alcohol, shellfish, meat with dairy). The app always tells people to check ingredients themselves, especially with an allergy.
- Only signed-in accounts can use it, each is limited to **40 AI requests a day** (a week uses 7), and the request is validated and trimmed on the server before it reaches the model.

### Set it up

1. **Get an Anthropic API key.** At console.anthropic.com create an account, add a small amount of credit, **set a monthly spend limit** (do this first), and create an API key. This is separate from a Claude chat subscription. Cost is per request, typically cents per plan: check the pricing page for current prices.
2. **Run the database migration.** Paste `supabase/migrations/20261113000000_ai_usage.sql` into the Supabase SQL Editor and run it, then run the second query in `supabase/verify.sql`. Every row should say `ok = true`.
3. **Add the key as a secret.** Supabase dashboard > Edge Functions > Secrets: add `ANTHROPIC_API_KEY`. (Optional: `ANTHROPIC_MODEL` to change the model.)
4. **Deploy the function.** With the Supabase CLI: `supabase functions deploy plan-meals`. Or in the dashboard, create a function called `plan-meals` and paste in `index.ts` and `plan.js`.
5. Open Meals > Planner > Plan with AI while signed in. Until the key is set, the app says "AI planning is not set up yet" and everything else keeps working.

### Known limits

- One person per plan (every meal is one serving; you can change servings in the planner).
- AI nutrition numbers are estimates and can be wrong. Everything is editable in the recipe book.
- No shopping list yet: that is the natural next step, built from the planned meals' ingredients.
- Planned meals can be logged on the day or after it, not before.

### How it was tested

`npm test` includes checks of the safety screen (28), the planner data (14), the AI orchestration (30) and the Edge Function's request checking and prompt (23): hostile and malformed replies, allergens leaking through, failures part-way, cancelling, and prompt injection through cuisines or likes. The screens were tested in a real browser against a fake AI service, including generating a week, separate meals, allergen removal, a limit reached, the AI not being set up, Stop, and the plan syncing between two devices. **Not yet tested:** the real Edge Function (Deno) calling the real Anthropic API. Once it is deployed, generate a one-day plan first and check the result.
