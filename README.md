# Nutrily

A calorie, macro, water and weight tracker, in forest green and oat. Set daily goals, log what you eat and drink, see what you have left.

This is the first version: React only, no backend. Data is saved in your browser's localStorage.

## Run it

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173). Needs Node 18 or newer.

## What it does

- **Today:** a scrollable strip of the last 60 days (tap one to view it, a dot means something was logged), a headline calories-left number with a progress ring, plus protein, carbs and fat against your goals. A water tracker with quick +250 ml and +500 ml buttons. Entries grouped by meal, each with Edit and Remove. Step back through past days.
- **Scan (Add food tab):** scan a product's barcode with the camera, or type the number under it. Nutrily looks it up in [Open Food Facts](https://world.openfoodfacts.org) (a free, community-built food database, no API key) and shows the name, brand and nutrition per 100 g or 100 ml. You enter how much you ate (it starts at the serving size on the pack) and add it. The same Scan option is available when adding an ingredient to a saved meal.
- **Meals (Add food tab):** a recipe book. Tap **Add meal** to build a meal from ingredients (from the food list or custom), say how many servings it makes, and add optional method notes. Nutrition per serving is worked out for you. Later, open a saved meal, choose how many servings you ate (1.5 works) and log it to a meal slot in one tap. Meals can be edited and deleted, and editing a recipe never changes entries you already logged.
- **Add food:** pick from a built-in list of about 40 foods (with macros) and a servings amount, or enter a custom food. Leave custom calories blank and they are worked out from the macros.
- **Edit entry:** change an entry's name, serving note, meal, date (to move it to another day), calories and macros. Clear the calories to work them out from the macros.
- **Weight:** log your weight in kg by date (one per day), see the latest weight, the change since your first entry and a trend chart. Edit or remove any weigh-in.
- **Calculate for me (Goals tab):** enter sex, age, height, weight, optional body fat %, activity level, your aim (lose, keep or gain), goal weight and pace. Nutrily works out resting burn (BMR), maintenance calories, a daily target, macros, the expected pace and roughly when you'll reach your goal. One tap applies the targets. Your stats are saved on the device, and the Weight tab shows how far you are from your goal weight.
- **My targets (Goals tab):** daily calories, protein, carbs, fat and water. A button fills the macros from your calories (30% protein, 40% carbs, 30% fat).

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
    Weight.jsx             log weight, trend chart, history
    Goals.jsx              My targets and Calculate for me
    BodyStats.jsx          body stats form and the calculated plan
  lib/
    useLocalStorage.js     saves state to the browser
    barcode.js             barcode check digits, Open Food Facts lookup and parsing
    scanner.js             camera barcode reading and camera error messages
    recipes.js             saved meals: per-serving maths and cleaning stored data
    nutrition.js           goals, limits, totals and macro maths
    dates.js               date helpers ("YYYY-MM-DD" strings)
    foods.js               built-in food list
    calculator.js          BMR, maintenance, target, macros and safety limits
    meals.js               meal names and small helpers
docs/MVP.md                the plan for this version
```

## Data

Stored in the browser under six keys:

- `nutrily:goals`: `{ calories, protein, carbs, fat, water }` (water in ml)
- `nutrily:entries`: a list of `{ id, date, name, serving, calories, protein, carbs, fat, meal, source }`
- `nutrily:water`: millilitres per day, e.g. `{ "2026-11-10": 1250 }`
- `nutrily:weights`: kilograms per day, e.g. `{ "2026-11-10": 72.4 }`
- `nutrily:meals`: the recipe book, a list of `{ id, name, servings, notes, ingredients: [{ id, name, serving, calories, protein, carbs, fat }] }`. Ingredient numbers are for the whole amount in the recipe, and per-serving values are calculated from them.
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
- **Missing data:** Open Food Facts is community-built, so a product may not exist, or may have no calories listed. Both cases show a plain message and an **Add it as a custom food** button that opens the Custom form (with the product's name filled in when it was found but had no calories). The same button appears after a typo in the barcode, a network error, or a blocked camera, so a failed scan never leaves a dead end. Nutrition is per 100 g (or ml), so the amount you ate is used to scale it, and the app tells people to check it against the pack.
- **Licence and fair use:** Open Food Facts asks apps to credit them (the product card does) and to identify themselves. Browsers do not let a page set its own `User-Agent`, so check their current API guidelines before a public launch.
- **Testing notes:** the lookup, parsing and scaling are unit tested, and the whole flow was tested in a real browser using a fake camera, a mocked detector and a mocked API. The ZXing fallback needs a real device test (an iPhone is a good one), because it could not be exercised without network access.
