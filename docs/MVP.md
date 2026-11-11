# Nutrily MVP: calorie tracking, React only

The smallest useful version of Nutrily. One thing done well: log what you eat and see how many calories you have left today.

No backend, no accounts, no hosting. Just a React app running locally.

## Goal

A person can set a daily calorie goal, log food in a few taps, and see at a glance how the day is going.

Success looks like: you can log a full day of food in under a minute per meal, reload the page, and everything is still there.

## Scope

### In

1. **Daily calorie goal**
   - A single number the user can change at any time.
   - Default of 2,000 kcal.
2. **Food logging** (two ways)
   - **Search:** pick from a built-in list of common foods, choose the number of servings.
   - **Custom:** enter a name and calories by hand.
   - Every entry belongs to a meal: breakfast, lunch, dinner or snack.
3. **Today view**
   - Calories eaten, calories left (or over), and a progress bar.
   - Entries grouped by meal, with meal subtotals.
   - Remove an entry.
4. **Past days**
   - Step back and forward through days to review or add forgotten meals. You can't go into the future.

### Out (later phases)

- Accounts, login and syncing across devices (Supabase)
- Deploying online (Vercel)
- AI meal description and estimation
- Protein, carbs and fat tracking
- Weight tracking
- Calorie goal calculator
- Editing existing entries, saved meals and favourites
- Meal planner, shopping list and AI meal maker
- Barcode scanning, reminders, export

## Screens

| Screen | Purpose |
| --- | --- |
| Today | Calories eaten and left, progress bar, entries grouped by meal, day navigation |
| Add food | Meal selector, then a Search tab and a Custom tab |
| Goal | Set the daily calorie goal |

Navigation is a three-tab bar at the bottom. Mobile first.

## Key flows

**First run**
1. Open the app and land on Today with the default 2,000 kcal goal and an empty log.
2. Open Goal, type a new number, save.

**Log a known food**
1. Add food, then Search, find "Banana".
2. Choose servings, tap Add food.
3. Return to Today with the totals updated.

**Log something not in the list**
1. Add food, then Custom.
2. Enter a name and calories, tap Add food.

**Review a past day**
1. On Today, tap the back arrow.
2. See that day's entries and totals, add or remove entries as needed.

## Data

Stored in the browser's localStorage under two keys. Nothing leaves the device.

```
nutrily:goal     -> number                         e.g. 2000
nutrily:entries  -> [ {
                       id,                         unique string
                       date: "YYYY-MM-DD",         local date
                       name,                       "Banana"
                       serving,                    "1 medium" (may be empty)
                       calories,                   whole number
                       meal: breakfast | lunch | dinner | snack,
                       source: search | manual
                     } ]
```

All reading and writing goes through one small hook, `useLocalStorage`, so it can be replaced with a database later without touching the screens.

Known limitation: clearing browser data deletes the log, and data does not move between devices. That is acceptable for this phase.

## Tech approach

- React with Vite, JavaScript, plain CSS. No UI library, no router, no state library.
- State lives in the top-level `App` component and is passed down as props.
- A built-in list of roughly 40 common foods with calories per serving, kept in its own file.
- Date helpers work on local `YYYY-MM-DD` strings, to avoid timezone bugs.

Suggested structure:

```
src/
  App.jsx                  state, tab navigation
  components/
    Today.jsx              summary, day navigation, entries by meal
    AddFood.jsx            meal selector, Search and Custom tabs
    Goal.jsx               set the calorie goal
  lib/
    useLocalStorage.js     the persistence hook
    dates.js               date helpers
    foods.js               built-in food list
  styles.css
```

## Behaviour details

- Calories remaining is `goal - eaten`. When negative, show "X kcal over" and change the bar colour.
- Servings accept decimals (0.5, 1.5). Calories are rounded to whole numbers.
- Custom entries require a name and calories above zero.
- The goal must be a sensible number (800 to 6,000) so a typo can't produce nonsense.
- Removing an entry takes effect immediately.
- Empty days show a short message and a button to add food.

## Non-functional requirements

- Works on a phone-sized screen, with large tap targets and no sideways scrolling.
- Accessible: labelled inputs, visible keyboard focus, progress bar exposed to screen readers.
- Instant: no network, so every action responds immediately.
- Survives a page reload with all data intact.

## Test checklist

- [ ] First load shows an empty Today with 2,000 kcal left.
- [ ] Adding a Search food updates eaten and left correctly.
- [ ] Adding a Custom food works; blank name or zero calories is rejected.
- [ ] Servings of 0.5 and 2 give the right calories.
- [ ] Going over the goal shows "over" and changes the bar.
- [ ] Removing an entry updates totals.
- [ ] Changing the goal updates Today straight away.
- [ ] Reloading keeps the goal and all entries.
- [ ] Past days show their own entries and totals; the next-day button is disabled on today.
- [ ] Usable on a phone-width screen.

## Build order

Commit after each step with a clear message.

1. Create the Vite React project and commit the empty scaffold.
2. `useLocalStorage` hook and date helpers.
3. Today view with hard-coded sample data, to get the layout right.
4. Custom logging, wired to real state.
5. Food list and Search logging.
6. Goal screen.
7. Past-day navigation.
8. Styling pass, empty states, accessibility check.
9. Work through the test checklist, fix what breaks, write the README.

## Definition of done

- Everything in "In" works and the test checklist passes.
- You can explain every file and how data flows from a tap to localStorage and back.
- The repo has a README with a screenshot, how to run it, and a list of what's deliberately left out.

## What comes next

Each later phase is its own set of commits:

1. Macros and weight tracking
2. Supabase accounts and a real database
3. Deploy and test with friends
4. AI meal estimation
5. Saved meals, meal planner, shopping list, AI meal maker


---

## Update: macros and water (version 0.2)

Added after the first version, still React only with localStorage.

- **Macros:** every entry stores protein, carbs and fat (grams). Today shows each against a daily goal. Search foods include macros. Custom foods take macros, and blank calories are worked out as protein x 4 + carbs x 4 + fat x 9.
- **Water:** logged per day in millilitres with +250 ml, +500 ml and -250 ml buttons. A daily water goal (default 2,000 ml) shows progress.
- **Goals screen:** replaces the single calorie goal. Calories, protein, carbs, fat and water, each with a sensible range check. One button fills the macros from the calorie goal (30 / 40 / 30).
- **Storage:** `nutrily:goals` (object), `nutrily:water` (object by date). The old `nutrily:goal` number is migrated, and older entries without macros count as 0.

Still out: weight tracking, editing entries, accounts, AI features.


---

## Update: editing entries and weight (version 0.3)

- **Editing entries:** every logged food has an Edit button. The form changes name, serving note, meal, date, calories and macros. Changing the date moves the entry to that day (not the future). Cancel leaves the entry untouched.
- **Weight:** a Weight tab logs kilograms by date, one per day (saving the same day replaces it). Valid range 20 to 500 kg. Shows the latest weight, change since the first entry and an SVG trend chart once there are two or more weigh-ins. Each weigh-in can be edited or removed.
- **Storage:** new key `nutrily:weights`, an object of `{ "YYYY-MM-DD": kg }`. Invalid saved values are ignored on load.

Tested in a real browser: add, edit (rename, recalculate, change meal, move day, cancel), weigh-in add, replace and remove, and persistence after reload.

Still out: accounts, AI features, meal planner and shopping list.


---

## Update: body stats and calorie calculator (version 0.4)

- **Body stats:** sex (female, male or average of the two), age, height, current weight, optional body fat %, activity level, aim (lose, keep, gain), goal weight and pace in kg a week.
- **Plan:** BMR, maintenance, daily target, macros, expected pace and an estimated time and month to reach the goal. "Use these targets" saves the calories and macros to the daily goals (water is left alone).
- **Weight tab:** shows kilograms to go toward the goal weight.
- **Safety rules:** adults only, loss capped at 1% of body weight a week, minimum calorie floors, no loss plan for BMI under 18.5 (current or goal), and a not-medical-advice note. Details are in the README.
- **Storage:** new key `nutrily:profile`.

Tested: calculator maths against hand-worked reference values (including the floors, caps and blocks), plus a real-browser run of the whole flow, persistence and applying targets.

Still out: accounts, AI features, meal planner and shopping list.


---

## Update: new look (version 0.5)

- **Day strip:** a horizontally scrolling row of the last 60 days at the top of Today. The selected day is centred, days with entries show a dot, and "Back to today" appears when viewing another day. It replaces the previous/next arrows.
- **Hero:** the day's calories left (or over) as the headline number with a progress ring, plus goal and eaten.
- **Cards and nav:** macros and water as soft cards, meals as flat rows, and a floating bottom bar with icons.
- **Colour:** forest green and oat, with pistachio as the single bright accent. Dark mode was removed so the palette stays consistent.

No data or behaviour changed. Tested in a real browser, including the day strip, over-goal state, editing, water, weight and the calculator.


---

## Update: recipe book (version 0.6)

- **Meals tab in Add food:** a third tab beside Search and Custom. An **Add meal** button opens the meal builder.
- **Meal builder:** name, how many servings the recipe makes, ingredients (from the built-in food list or custom, with macros) and optional method notes. It shows the per-serving calories and macros live.
- **Using a saved meal:** open it to see the ingredients and notes, enter how many servings you ate (decimals allowed), and add it to the chosen meal slot. It is logged as one entry, so Today stays tidy.
- **Managing meals:** edit and delete (with a confirmation). Editing a recipe does not rewrite entries already logged.
- **Storage:** new key `nutrily:meals`. Per-serving nutrition is always calculated from the ingredient totals, never stored twice, and bad stored data is cleaned or dropped on load.

Tested: the per-serving and scaling maths, cleaning of corrupted data, and a real-browser run of building a meal, logging it, editing, cancelling, deleting, reloading, and checking that Search and Custom logging still work.

Next steps this enables: a meal planner (assign saved meals to days) and a shopping list built from their ingredients.


---

## Update: barcode scanning (version 0.7)

- **Scan tab in Add food:** scan a barcode with the camera or type the number. The product is looked up in Open Food Facts, and you choose how much you ate (it starts at the pack's serving size) before adding it. Entries from this tab are saved with `source: "scan"`.
- **In the meal builder:** a third ingredient source, Scan, so a saved meal can be built from real packaged products.
- **Safety and manners:** typed numbers are check-digit validated, requests time out after 12 seconds, errors are plain-language, and results are cached for the visit. The camera always turns off, even if Stop is pressed while it is still starting.
- **Not found / no calories:** the app says so and points to the Custom tab. Data is credited to Open Food Facts on the product card.
- **New dependencies:** `@zxing/browser` and `@zxing/library`, loaded only when the browser has no built-in `BarcodeDetector`. Run `npm install` after pulling this change.

Tested: barcode validation, parsing (including kJ-only and missing data), scaling and every error path; a real-browser run with a fake camera and mocked API; camera cleanup; scanning inside the meal builder. A bug found by the tests (the camera staying on if stopped while starting) is fixed.

**Follow-up: failed scans.** When a scan cannot give a result (not found, no calories listed, typo, network error, blocked camera) the Scan tab shows an "Add it as a custom food" button that switches to the Custom form. If the product was found but had no calories, its name is carried across. In the meal builder the same button says "custom ingredient". A second timing bug was also fixed: the camera is now always released if playback fails while it is starting.

**Follow-up: serving sizes.** The Scan result now shows the pack's serving size and nutrition per serving beside per 100 g (or 100 ml). It starts at 1 serving and can switch between servings and grams, keeping the same amount when switching. The pack's printed per-serving values are used when available; otherwise they are worked out from the per-100 values and the serving weight, and the reverse for packs that only list per-serving values. Products with no serving size stay in grams. Log entries read like "2 servings (30 g)". A crash found by the tests (a product with no nutrition data at all) is fixed.


---

## Update: Account and Meals pages (version 0.8)

- **Goals became Account.** The page has three sections: **Targets** (the daily calorie, macro and water targets), **Calculator** (body stats and the calorie calculator) and **Weight** (weigh-ins, trend chart and progress toward the goal weight). It says plainly that everything is saved on this device, since there are no logins yet.
- **Weight moved into Account** so weight tracking is kept, and the old Weight tab is now **Meals**: the recipe book as a page of its own, with a meal time selector, the meal builder, edit, delete and one-tap logging. The Meals section inside Add food still works the same way.
- **Navigation** is now Today, Add food, Meals, Account. No stored data changed, so existing targets, weights, meals and entries load as before.
- Button and message wording changed from "goals" to "targets" ("Save targets", "Targets saved.").

Tested in a real browser: the new navigation, building, logging, editing and deleting a meal from the Meals page, every Account section, saving targets, weight add/edit/remove with the chart and goal progress, the calculator and "Use these targets", and persistence after reload. The barcode scanning suite was re-run and still passes.


---

## Update: first-run setup (version 0.9)

- **Welcome screen** with a short description and two choices: **Set up my plan** or **Skip for now**.
- **Four steps** with a progress bar: **About you** (sex, age, height, weight), **Activity** (five choices), **Your goal** (keep, lose or gain, plus goal weight and pace) and **Your plan**. Next stays off until the step is valid, and messages only appear for fields the person has typed in. Back keeps every answer.
- **Your plan** shows the calculated calorie target, macros, expected pace and time to goal, then **Start tracking** saves the targets, the body stats (so Account > Calculator is already filled in) and today's weight as the first weigh-in. Water target is left alone.
- **Safety:** it reuses the calculator, so it is adults only (under 18 sees why and can skip), blocks unhealthy goal weights, caps the pace and applies the calorie floors. When the plan cannot be built it says why and offers Back or Skip, never a number.
- **Who sees it:** only first-time visitors. Anyone with saved Nutrily data from earlier versions is marked as done automatically. Reloading mid-setup starts setup again.
- **Run setup again** (bottom of Account) replays it with the saved answers filled in; Cancel changes nothing, and finishing replaces today's weigh-in rather than duplicating it.
- **Accessibility:** focus moves to each new heading, options are real radio buttons, the whole flow works with the keyboard, and progress is announced as "Step X of 4".
- **Code:** `fieldErrors` in `calculator.js` is now the single source of truth for field validation, shared by the calculator and setup.

Tested: calculator behaviour unchanged after the refactor, field validation and first-run detection (unit), and a real-browser run of skipping, the full flow, every validation and safety case, saved data, replay, existing users and keyboard use. The scanning and navigation suites still pass.


---

## Update: food preferences (version 1.0)

- **Setup asks about food:** a new optional step (Step 4 of 5) covers eating style, allergies and intolerances, foods you love and foods you would rather avoid. Chips switch on and off, and foods are added as tags (Enter or a comma adds one or several, duplicates are ignored, any can be removed). The step never blocks Next. It is also editable later in **Account > Food**, which saves as you go.
- **Search uses it:** foods that break a vegetarian, vegan or pescatarian diet or an allergy are hidden by default, with a count and a switch to show them. Tags explain why ("Not vegan", "Contains peanuts"). Loved foods come first, avoided foods last.
- **Scan uses it:** the barcode lookup now also reads the database's allergen tags, trace tags and vegan/vegetarian analysis. Listed allergens are alerts, traces are mentioned separately, and "the database doesn't say whether this is vegan" is shown instead of assuming. Matching is word-based so messy community tags still match, and peanuts, tree nuts, fish and shellfish are kept apart.
- **Safety wording:** nothing says a food is safe. Anyone who lists an allergy sees "always read the label" on every scan, including when the database lists no allergens, because no warning is not a guarantee. Halal, kosher and pescatarian are stored but cannot be checked, and the app says so.
- **Data and privacy:** saved on the device in `nutrily:preferences`, with bad stored values cleaned on load. Anyone who already has saved data skips setup.

Tested: preference logic against realistic Open Food Facts tags (including messy ones), and a real-browser run of the setup step, search filtering, ordering and tags, scan warnings, the Account section, persistence and the meal builder. The earlier suites still pass.

Next step this enables: the AI meal maker can be told these preferences from the start.


---

## Update: accounts and cloud sync (version 1.1)

- **Optional accounts** with Supabase. Email and password, with the Account page showing "Back up and sync" when signed out, and the email, last-synced time, **Sync now**, **Sign out** and **Sign out and clear this device** when signed in. At first-run setup, **I already have an account** lets someone sign in on a new device, which pulls their data and skips setup.
- **Local-first sync.** The app still runs on the device's own data. Data is cut into units (a day, settings, the recipe book) and merged with a three-way merge, so additions on two devices are both kept and deletions do not come back. Saves are version-checked and retried on conflict.
- **Safety:** different accounts never mix on a device, data downloaded from the cloud is cleaned before use, and clearing a device first backs it up.
- **Database:** one table, `sync_units`, with row-level security and explicit grants (`supabase/migrations/`), plus a self-check script (`supabase/verify.sql`).
- **Without Supabase configured** nothing changes and nothing appears.

Tested: 57 sync engine checks (`npm test`) and a real-browser run of sign-up, confirmation, wrong passwords, two devices, offline edits, deletions, account switching and clearing a device, using an in-memory stand-in for the cloud. Not yet run against a real project: the SQL and `backend.js`.

Next steps: password reset, delete account, a privacy policy, and a real-project test with two accounts.


---

## Update: meal planner and AI planning (version 1.2)

- **Planner (Meals > Planner):** a week at a time (Monday to Sunday). Pick a day, add recipes to breakfast, lunch, dinner or snacks, change servings, remove, or clear the week. Each day shows planned calories and macros against the Account targets. **Log** adds a diary entry on that day and marks the plan item done (disabled for future days), and **Undo** removes the entry again. Deleting a recipe removes its unlogged plan items.
- **Plan with AI:** whole days (1 to 7, one request per day) or a few separate meals (1 to 8, saved to the recipe book). Uses the Account targets, diet, allergies and likes/dislikes, plus cuisines and a budget. A review screen shows the meals and any problems before saving, offers to keep the days that worked if it fails part-way, and has a Stop button.
- **Safety:** every AI meal is screened against allergies and diet in the app, and blocked meals are removed and explained. Unbelievable numbers are skipped. Recipes are labelled AI-written with a reminder to check ingredients, and recipes that conflict with preferences are tagged anywhere they appear.
- **Server:** the `plan-meals` Edge Function keeps the Anthropic key secret, requires sign-in, limits each person to 40 requests a day (`ai_usage` table and function, with a migration), and validates and trims the request.
- **Sync:** planned meals live inside each day's record, so they sync like everything else. Planning ahead creates records for future days. Older records without a plan still load.
- **Tested:** 160 unit checks (`npm test`) and real-browser runs of manual planning and AI generation against a fake AI service, plus two-device sync. Not yet run against the real Edge Function and Anthropic API.

Next step: a shopping list built from the planned meals' ingredients.

**Follow-up: first real run of the AI function.** The first live attempts failed with "Could not read the plan the AI wrote". The function logs showed why: Sonnet 5.5 always thinks first, the thinking counted against a 4,000-token limit, so replies were sometimes empty or cut off. Fixed by allowing 12,000 tokens with a set thinking effort, requesting structured outputs (schema-valid JSON), falling back to plain text once if refused, keeping any complete meals from a damaged reply, and logging the stop reason and reply ends when something still fails. The fix is in the function only, so no app update was needed, and the repo copy matches what is deployed (version 2).

**Follow-up: instructions, details and borrowing.** Tapping a planned meal now shows what you need (amounts follow the servings chosen) and how to make it; AI recipes come with 4 to 8 steps stored as numbered lines in the recipe's notes. Generated recipes were already saved to the recipe book, and that is now stated on screen, with a button to open the recipe. The generator can borrow meals from the recipe book (Never, Sometimes, Often): suitable recipes only, matched to a meal time by calories, not repeated within two days, with the AI asked only for the rest of the day and given the leftover calories and macros. Because the whole recipe book syncs as one record, the book is capped at 300 recipes and the database limit per record rises from 256 KB to 2 MB (a separate migration). Function version 3 is deployed.

**Follow-up: My foods.** The Search tab in Add food no longer lists the 40 built-in foods. It lists the foods the person has scanned or typed in and chosen to save, most recently used first, and asks them to scan something when there is nothing yet. A scan that finds nothing opens Custom with the barcode kept, and saving puts the food in the list under that barcode, so scanning it again finds it instantly and offline. The Meals tab was removed from Add food because Meals has its own page. The built-in list stays in the meal builder as the source of basic ingredients. My foods syncs as its own record (capped at 150 foods, scanned ones dropped before typed-in ones) and keeps each product's allergen tags so the diet and allergy warnings still work.

**Follow-up: saved foods in the meal builder.** The builder has a My foods tab beside the built-in food list, custom and scan. It opens first when there are saved foods, adds an ingredient in servings or grams, and applies the same diet and allergy tags and filter. A scan that finds nothing inside the builder keeps its barcode and can be saved to My foods, as in Add food.
