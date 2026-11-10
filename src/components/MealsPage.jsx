import { useState } from 'react';
import { MEALS, defaultMeal } from '../lib/meals.js';
import MealsPane from './MealsPane.jsx';
import MealBuilder from './MealBuilder.jsx';

// Your recipe book as a page of its own: browse saved meals, build new ones, and log them to a meal time.
export default function MealsPage({ dayLabel, meals, onAdd, onSaveMeal, onDeleteMeal }) {
  const [slot, setSlot] = useState(defaultMeal()); // breakfast, lunch, dinner or snack
  const [building, setBuilding] = useState(undefined); // undefined: not building, null: a new meal, object: editing that meal

  if (building !== undefined) {
    return (
      <MealBuilder
        meal={building}
        onCancel={() => setBuilding(undefined)}
        onSave={(meal) => {
          onSaveMeal(meal);
          setBuilding(undefined);
        }}
      />
    );
  }

  const slotLabel = MEALS.find((m) => m.id === slot).label;

  return (
    <>
      <h1>Meals</h1>
      <p className="muted">Your saved meals. Adding to {dayLabel}.</p>

      <label className="field">
        <span>Meal time</span>
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          {MEALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <MealsPane
        meals={meals}
        slotLabel={slotLabel}
        onNew={() => setBuilding(null)}
        onEdit={(meal) => setBuilding(meal)}
        onDelete={onDeleteMeal}
        onLog={(item) => onAdd({ ...item, meal: slot, source: 'meal' })}
      />
    </>
  );
}
