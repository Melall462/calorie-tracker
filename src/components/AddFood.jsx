import { useState } from 'react';
import { MEALS, defaultMeal } from '../lib/meals.js';
import { customProduct } from '../lib/myFoods.js';
import { useFoods } from '../lib/FoodsContext.js';
import { CustomPane } from './FoodPicker.jsx';
import MyFoodsPane from './MyFoodsPane.jsx';
import ScanPane from './ScanPane.jsx';

const MODES = [
  { id: 'search', label: 'Search' },
  { id: 'scan', label: 'Scan' },
  { id: 'custom', label: 'Custom' },
];

// Add food: your saved foods (Search), a barcode scan, or a food typed in by hand. Meals live in the Meals tab.
export default function AddFood({ dayLabel, onAdd }) {
  const foods = useFoods();
  const [mode, setMode] = useState('search');
  const [slot, setSlot] = useState(defaultMeal()); // breakfast, lunch, dinner or snack
  const [custom, setCustom] = useState({ name: '', code: '' }); // what the Custom form starts with (from a scan that found nothing)
  const [notice, setNotice] = useState('');

  const go = (next) => {
    setMode(next);
    setNotice('');
    if (next !== 'custom') setCustom({ name: '', code: '' });
  };

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
          <button key={m.id} onClick={() => go(m.id)} aria-pressed={mode === m.id}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'search' && (
        <MyFoodsPane
          notice={notice}
          onAdd={(item) => onAdd({ ...item, meal: slot, source: 'search' })}
          onScan={() => go('scan')}
          onCustom={() => go('custom')}
        />
      )}
      {mode === 'scan' && (
        <ScanPane
          onAdd={(item) => onAdd({ ...item, meal: slot, source: 'scan' })}
          onCustom={(name, code) => {
            setCustom({ name, code: code ?? '' });
            setMode('custom');
          }}
        />
      )}
      {mode === 'custom' && (
        <CustomPane
          key={`${custom.code}|${custom.name}`}
          initialName={custom.name}
          barcode={custom.code}
          onAdd={(item) => onAdd({ ...item, meal: slot, source: 'manual' })}
          onSaveFood={(food) => foods.remember(customProduct(food))}
          onSavedOnly={(name) => {
            setNotice(`Saved ${name} to your foods.`);
            setCustom({ name: '', code: '' });
            setMode('search');
          }}
        />
      )}
    </>
  );
}
