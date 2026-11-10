# Nutrily

A calorie, macro and water tracker. Set daily goals, log what you eat and drink, see what you have left.

This is the first version: React only, no backend. Data is saved in your browser's localStorage.

## Run it

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173). Needs Node 18 or newer.

## What it does

- **Today:** calories eaten, left or over, plus protein, carbs and fat against your goals. A water tracker with quick +250 ml and +500 ml buttons. Entries grouped by meal. Step back through past days.
- **Add food:** pick from a built-in list of about 40 foods (with macros) and a servings amount, or enter a custom food. Leave custom calories blank and they are worked out from the macros.
- **Goals:** daily calories, protein, carbs, fat and water. A button fills the macros from your calories (30% protein, 40% carbs, 30% fat).

## Project structure

```
src/
  App.jsx                  state and tab navigation
  components/
    Today.jsx              day navigation, summary, water, entries by meal
    Summary.jsx            calories and macro totals vs goals
    Water.jsx              water progress and quick-add buttons
    AddFood.jsx            meal selector, Search and Custom tabs
    Goals.jsx              set calorie, macro and water goals
  lib/
    useLocalStorage.js     saves state to the browser
    nutrition.js           goals, limits, totals and macro maths
    dates.js               date helpers ("YYYY-MM-DD" strings)
    foods.js               built-in food list
    meals.js               meal names and small helpers
docs/MVP.md                the plan for this version
```

## Data

Stored in the browser under three keys:

- `nutrily:goals`: `{ calories, protein, carbs, fat, water }` (water in ml)
- `nutrily:entries`: a list of `{ id, date, name, serving, calories, protein, carbs, fat, meal, source }`
- `nutrily:water`: millilitres per day, e.g. `{ "2026-11-10": 1250 }`

Version 1 stored a single number under `nutrily:goal`. It is carried over automatically, and entries saved before macros existed count as 0 g.

Clearing your browser data deletes the log, and it doesn't sync between devices.

## Deliberately left out (for now)

Accounts and a database, deploying online, AI food estimates, weight tracking, editing entries, meal planning. See `docs/MVP.md` for the roadmap.
