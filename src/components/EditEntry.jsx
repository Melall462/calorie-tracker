import { useState } from 'react';
import { MEALS, toNumber } from '../lib/meals.js';
import { round1 } from '../lib/nutrition.js';
import { todayKey } from '../lib/dates.js';

export default function EditEntry({ entry, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: entry.name,
    serving: entry.serving || '',
    meal: entry.meal,
    date: entry.date,
    calories: String(entry.calories),
    protein: String(entry.protein ?? 0),
    carbs: String(entry.carbs ?? 0),
    fat: String(entry.fat ?? 0),
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const protein = toNumber(form.protein);
  const carbs = toNumber(form.carbs);
  const fat = toNumber(form.fat);
  const fromMacros = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const calories = Math.round(toNumber(form.calories)) || fromMacros; // blank calories are worked out from the macros
  const dateOk = form.date !== '' && form.date <= todayKey();
  const canSave = form.name.trim() !== '' && calories > 0 && dateOk;

  function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      ...entry,
      name: form.name.trim(),
      serving: form.serving.trim(),
      meal: form.meal,
      date: form.date,
      calories,
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
    });
  }

  return (
    <>
      <h1>Edit food</h1>
      <form className="pane" onSubmit={submit}>
        <label className="field">
          <span>Food name</span>
          <input value={form.name} onChange={set('name')} maxLength={120} required />
        </label>
        <label className="field">
          <span>Serving note (optional)</span>
          <input value={form.serving} onChange={set('serving')} placeholder="1 medium" maxLength={60} />
        </label>
        <div className="numgrid two">
          <label className="field">
            <span>Meal</span>
            <select value={form.meal} onChange={set('meal')}>
              {MEALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={form.date} max={todayKey()} onChange={set('date')} />
          </label>
        </div>
        <div className="numgrid">
          <label className="field compact">
            <span>kcal</span>
            <input inputMode="numeric" value={form.calories} onChange={set('calories')} />
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
        <p className="muted small">Clear kcal to work it out from the macros.</p>
        {!dateOk && <p className="error">Pick a date that is today or earlier.</p>}
        <button className="btn" type="submit" disabled={!canSave}>
          Save changes
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </>
  );
}
