# Nutrily

A calorie, macro, water and weight tracker. Set daily goals, log what you eat and drink, see what you have left.

This is the first version: React only, no backend. Data is saved in your browser's localStorage.

## Run it

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173). Needs Node 18 or newer.

## What it does

- **Today:** calories eaten, left or over, plus protein, carbs and fat against your goals. A water tracker with quick +250 ml and +500 ml buttons. Entries grouped by meal, each with Edit and Remove. Step back through past days.
- **Add food:** pick from a built-in list of about 40 foods (with macros) and a servings amount, or enter a custom food. Leave custom calories blank and they are worked out from the macros.
- **Edit entry:** change an entry's name, serving note, meal, date (to move it to another day), calories and macros. Clear the calories to work them out from the macros.
- **Weight:** log your weight in kg by date (one per day), see the latest weight, the change since your first entry and a trend chart. Edit or remove any weigh-in.
- **Calculate for me (Goals tab):** enter sex, age, height, weight, optional body fat %, activity level, your aim (lose, keep or gain), goal weight and pace. Nutrily works out resting burn (BMR), maintenance calories, a daily target, macros, the expected pace and roughly when you'll reach your goal. One tap applies the targets. Your stats are saved on the device, and the Weight tab shows how far you are from your goal weight.
- **My targets (Goals tab):** daily calories, protein, carbs, fat and water. A button fills the macros from your calories (30% protein, 40% carbs, 30% fat).

## Project structure

```
src/
  App.jsx                  state and tab navigation
  components/
    Today.jsx              day navigation, summary, water, entries by meal
    Summary.jsx            calories and macro totals vs goals
    Water.jsx              water progress and quick-add buttons
    AddFood.jsx            meal selector, Search and Custom tabs
    EditEntry.jsx          edit a logged food
    Weight.jsx             log weight, trend chart, history
    Goals.jsx              My targets and Calculate for me
    BodyStats.jsx          body stats form and the calculated plan
  lib/
    useLocalStorage.js     saves state to the browser
    nutrition.js           goals, limits, totals and macro maths
    dates.js               date helpers ("YYYY-MM-DD" strings)
    foods.js               built-in food list
    calculator.js          BMR, maintenance, target, macros and safety limits
    meals.js               meal names and small helpers
docs/MVP.md                the plan for this version
```

## Data

Stored in the browser under five keys:

- `nutrily:goals`: `{ calories, protein, carbs, fat, water }` (water in ml)
- `nutrily:entries`: a list of `{ id, date, name, serving, calories, protein, carbs, fat, meal, source }`
- `nutrily:water`: millilitres per day, e.g. `{ "2026-11-10": 1250 }`
- `nutrily:weights`: kilograms per day, e.g. `{ "2026-11-10": 72.4 }`
- `nutrily:profile`: body stats and aim for the calculator, kept as text so it works with form inputs

Version 1 stored a single number under `nutrily:goal`. It is carried over automatically, and entries saved before macros existed count as 0 g.

Clearing your browser data deletes the log, and it doesn't sync between devices.

## Deliberately left out (for now)

Accounts and a database, deploying online, AI food estimates, meal planning. See `docs/MVP.md` for the roadmap.

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
