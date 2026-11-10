import { useState } from 'react';
import { MEALS, defaultMeal } from '../lib/meals.js';
import { SearchPane, CustomPane } from './FoodPicker.jsx';
import ScanPane from './ScanPane.jsx';
import MealsPane from './MealsPane.jsx';
import MealBuilder from './MealBuilder.jsx';

const MODES = [
  { id: 'search', label: 'Search' },
  { id: 'custom', label: 'Custom' },
  { id: 'meals', label: 'Meals' },
  { id: 'scan', label: 'Scan' },
];

export default function AddFood({ dayLabel, onAdd, meals, onSaveMeal, onDeleteMeal }) {
  const [mode, setMode] = useState('search');
  const [slot, setSlot] = useState(defaultMeal()); // breakfast, lunch, dinner or snack
  const [customName, setCustomName] = useState(''); // a name to start the Custom form with (from a scan that found no calories)
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
      <h1>Add food</h1>
      <p className="muted">Adding to {dayLabel}.</p>

      <label className="field">
        <span>Meal</span>
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          {MEALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="segmented" role="group" aria-label="How to add food">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              setCustomName('');
            }}
            aria-pressed={mode === m.id}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'search' && <SearchPane onAdd={(item) => onAdd({ ...item, meal: slot, source: 'search' })} />}
      {mode === 'custom' && <CustomPane initialName={customName} onAdd={(item) => onAdd({ ...item, meal: slot, source: 'manual' })} />}
      {mode === 'scan' && (
        <ScanPane
          onAdd={(item) => onAdd({ ...item, meal: slot, source: 'scan' })}
          onCustom={(name) => {
            setCustomName(name);
            setMode('custom');
          }}
        />
      )}
      {mode === 'meals' && (
        <MealsPane
          meals={meals}
          slotLabel={slotLabel}
          onNew={() => setBuilding(null)}
          onEdit={(meal) => setBuilding(meal)}
          onDelete={onDeleteMeal}
          onLog={(item) => onAdd({ ...item, meal: slot, source: 'meal' })}
        />
      )}
    </>
  );
}
