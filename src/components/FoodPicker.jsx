import { useState } from 'react';
import { FOODS } from '../lib/foods.js';
import { toNumber } from '../lib/meals.js';
import { round1 } from '../lib/nutrition.js';
import { usePreferences } from '../lib/PreferencesContext.js';
import { foodWarnings, hasFoodRules, isDisliked, isLiked } from '../lib/preferences.js';

// Both panes call onAdd({ name, serving, calories, protein, carbs, fat }) and leave the rest to the caller.

export function SearchPane({ onAdd, addLabel = 'Add food' }) {
  const prefs = usePreferences();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [servings, setServings] = useState('1');
  const [onlyFits, setOnlyFits] = useState(true);

  const rules = hasFoodRules(prefs);
  const q = query.trim().toLowerCase();
  const matches = FOODS.filter((f) => f.name.toLowerCase().includes(q)).map((food) => ({
    food,
    warnings: foodWarnings(food, prefs),
    liked: isLiked(food, prefs),
    disliked: isDisliked(food, prefs),
  }));
  const fitting = rules && onlyFits ? matches.filter((m) => m.warnings.length === 0) : matches;
  const hidden = matches.length - fitting.length;
  // Foods you love first, foods you would rather avoid last. Everything else keeps its order.
  const rank = (m) => (m.disliked ? 1 : m.liked ? -1 : 0);
  const results = [...fitting].sort((a, b) => rank(a) - rank(b));
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
    });
    setOpenId(null);
  }

  return (
    <div className="pane">
      <label className="field">
        <span>Search foods</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Banana, chicken, rice…" />
      </label>

      {rules && (
        <label className="check">
          <input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} />
          <span>Only show foods that fit my diet and allergies</span>
        </label>
      )}
      {rules && onlyFits && hidden > 0 && (
        <p className="muted small" role="status">
          {hidden} {hidden === 1 ? 'food is' : 'foods are'} hidden by your preferences.
        </p>
      )}

      {results.length === 0 ? (
        <p className="muted">
          {matches.length > 0
            ? 'Nothing that fits your preferences matches that. Switch the filter off to see everything, or try the Custom tab.'
            : 'No match. Try the Custom tab.'}
        </p>
      ) : (
        <ul className="list">
          {results.map(({ food, warnings, liked }) => {
            const open = openId === food.id;
            return (
              <li key={food.id} className="result">
                <button
                  type="button"
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
                    {(warnings.length > 0 || liked) && (
                      <span className="tag-line">
                        {warnings.map((w) => (
                          <span key={w} className="tag warn">
                            {w}
                          </span>
                        ))}
                        {liked && <span className="tag liked">You like this</span>}
                      </span>
                    )}
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
                      {Math.round(food.calories * amount)} kcal &nbsp; P {round1(food.protein * amount)} g &nbsp; C {round1(food.carbs * amount)} g &nbsp; F{' '}
                      {round1(food.fat * amount)} g
                    </p>
                    <button type="button" className="btn" onClick={() => add(food)} disabled={!amount}>
                      {addLabel}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rules && <p className="muted small">Tags describe the usual version of each food. If you have an allergy, always check the label.</p>}
    </div>
  );
}

const BLANK = { name: '', calories: '', protein: '', carbs: '', fat: '' };

export function CustomPane({ onAdd, addLabel = 'Add food', nameLabel = 'Food name', namePlaceholder = 'Leftover lasagne', initialName = '' }) {
  const [form, setForm] = useState({ ...BLANK, name: initialName });
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
    onAdd({ name: form.name.trim(), serving: '', calories, protein: round1(protein), carbs: round1(carbs), fat: round1(fat) });
    setForm(BLANK);
  }

  return (
    <form className="pane" onSubmit={submit}>
      <label className="field">
        <span>{nameLabel}</span>
        <input value={form.name} onChange={set('name')} placeholder={namePlaceholder} maxLength={120} />
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
        {addLabel}
      </button>
    </form>
  );
}
