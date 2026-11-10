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
