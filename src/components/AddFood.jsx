import { useState } from 'react';
import { FOODS } from '../lib/foods.js';
import { MEALS, defaultMeal, toNumber } from '../lib/meals.js';
import { round1 } from '../lib/nutrition.js';

const MODES = [
  { id: 'search', label: 'Search' },
  { id: 'custom', label: 'Custom' },
];

export default function AddFood({ dayLabel, onAdd }) {
  const [mode, setMode] = useState('search');
  const [meal, setMeal] = useState(defaultMeal());

  return (
    <>
      <h1>Add food</h1>
      <p className="muted">Adding to {dayLabel}.</p>

      <label className="field">
        <span>Meal</span>
        <select value={meal} onChange={(e) => setMeal(e.target.value)}>
          {MEALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="segmented" role="group" aria-label="How to add food">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'search' ? <SearchPane meal={meal} onAdd={onAdd} /> : <CustomPane meal={meal} onAdd={onAdd} />}
    </>
  );
}

function SearchPane({ meal, onAdd }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [servings, setServings] = useState('1');

  const q = query.trim().toLowerCase();
  const results = FOODS.filter((f) => f.name.toLowerCase().includes(q));
  const amount = toNumber(servings);

  function add(food) {
    if (!amount) return;
    onAdd({
      name: food.name,
      serving: amount === 1 ? food.serving : `${amount} × ${food.serving}`,
      calories: Math.round(food.calories * amount),
      protein: round1(food.protein * amount),
      carbs: round1(food.carbs * amount),
      fat: round1(food.fat * amount),
      meal,
      source: 'search',
    });
  }

  return (
    <div className="pane">
      <label className="field">
        <span>Search foods</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Banana, chicken, rice…" />
      </label>

      {results.length === 0 ? (
        <p className="muted">No match. Try the Custom tab.</p>
      ) : (
        <ul className="list">
          {results.map((food) => {
            const open = openId === food.id;
            return (
              <li key={food.id} className="result">
                <button
                  className="result-btn"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenId(open ? null : food.id);
                    setServings('1');
                  }}
                >
                  <span>
                    <span className="entry-name">{food.name}</span>
                    <span className="muted small block">{food.serving}</span>
                  </span>
                  <strong>{food.calories} kcal</strong>
                </button>
                {open && (
                  <div className="result-panel">
                    <label className="field compact">
                      <span>Servings</span>
                      <input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} />
                    </label>
                    <p className="muted small">
                      {Math.round(food.calories * amount)} kcal &nbsp; P {round1(food.protein * amount)} g &nbsp; C{' '}
                      {round1(food.carbs * amount)} g &nbsp; F {round1(food.fat * amount)} g
                    </p>
                    <button className="btn" onClick={() => add(food)} disabled={!amount}>
                      Add food
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CustomPane({ meal, onAdd }) {
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const protein = toNumber(form.protein);
  const carbs = toNumber(form.carbs);
  const fat = toNumber(form.fat);
  const fromMacros = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const calories = Math.round(toNumber(form.calories)) || fromMacros; // blank calories are worked out from the macros
  const canAdd = form.name.trim() !== '' && calories > 0;

  function submit(e) {
    e.preventDefault();
    if (!canAdd) return;
    onAdd({
      name: form.name.trim(),
      serving: '',
      calories,
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
      meal,
      source: 'manual',
    });
  }

  return (
    <form className="pane" onSubmit={submit}>
      <label className="field">
        <span>Food name</span>
        <input value={form.name} onChange={set('name')} placeholder="Leftover lasagne" maxLength={120} required />
      </label>
      <div className="numgrid">
        <label className="field compact">
          <span>kcal</span>
          <input inputMode="numeric" value={form.calories} onChange={set('calories')} placeholder={fromMacros ? String(fromMacros) : ''} />
        </label>
        <label className="field compact">
          <span>Protein g</span>
          <input inputMode="decimal" value={form.protein} onChange={set('protein')} />
        </label>
        <label className="field compact">
          <span>Carbs g</span>
          <input inputMode="decimal" value={form.carbs} onChange={set('carbs')} />
        </label>
        <label className="field compact">
          <span>Fat g</span>
          <input inputMode="decimal" value={form.fat} onChange={set('fat')} />
        </label>
      </div>
      <p className="muted small">Leave kcal blank to work it out from the macros.</p>
      <button className="btn" type="submit" disabled={!canAdd}>
        Add food
      </button>
    </form>
  );
}
