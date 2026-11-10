import { useState } from 'react';
import { SearchPane, CustomPane } from './FoodPicker.jsx';
import { toNumber } from '../lib/meals.js';
import { newId } from '../lib/id.js';
import { round1, sumEntries } from '../lib/nutrition.js';
import { MAX_INGREDIENTS, MAX_SERVINGS } from '../lib/recipes.js';

const SOURCES = [
  { id: 'search', label: 'From food list' },
  { id: 'custom', label: 'Custom' },
];

// Create or edit a saved meal: a name, how many servings it makes, ingredients and optional notes.
export default function MealBuilder({ meal, onSave, onCancel }) {
  const [name, setName] = useState(meal?.name ?? '');
  const [servings, setServings] = useState(String(meal?.servings ?? 1));
  const [notes, setNotes] = useState(meal?.notes ?? '');
  const [ingredients, setIngredients] = useState(meal?.ingredients ?? []);
  const [source, setSource] = useState('search');

  const count = toNumber(servings);
  const total = sumEntries(ingredients);
  const countOk = count > 0 && count <= MAX_SERVINGS;
  const canSave = name.trim() !== '' && ingredients.length > 0 && countOk;
  const perServing = countOk
    ? { calories: Math.round(total.calories / count), protein: round1(total.protein / count), carbs: round1(total.carbs / count), fat: round1(total.fat / count) }
    : null;

  const addIngredient = (item) => setIngredients((prev) => (prev.length >= MAX_INGREDIENTS ? prev : [...prev, { ...item, id: newId() }]));
  const removeIngredient = (id) => setIngredients((prev) => prev.filter((i) => i.id !== id));

  function save() {
    if (!canSave) return;
    onSave({ id: meal?.id ?? newId(), name: name.trim(), servings: count, ingredients, notes: notes.trim() });
  }

  return (
    <>
      <h1>{meal ? 'Edit meal' : 'New meal'}</h1>
      <p className="muted">Add the ingredients once, then log the whole meal in one tap.</p>

      <div className="pane">
        <label className="field">
          <span>Meal name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chicken and rice bowl" maxLength={120} />
        </label>
        <label className="field">
          <span>Servings this makes</span>
          <input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} />
          <small className="hint">If you cook for 4 and eat one portion, enter 4.</small>
        </label>
        {!countOk && <p className="error">Enter a number of servings above 0 and up to {MAX_SERVINGS}.</p>}

        <h2 className="builder-title">Ingredients</h2>
        {ingredients.length === 0 ? (
          <p className="muted">No ingredients yet. Add some below.</p>
        ) : (
          <ul className="list">
            {ingredients.map((i) => (
              <li className="entry" key={i.id}>
                <div className="entry-main">
                  <span className="entry-name">{i.name}</span>
                  {i.serving && <span className="muted small">{i.serving}</span>}
                  <span className="muted small">
                    P {round1(i.protein)} g &nbsp; C {round1(i.carbs)} g &nbsp; F {round1(i.fat)} g
                  </span>
                </div>
                <div className="entry-side">
                  <strong>{i.calories}</strong>
                  <button type="button" className="link-btn" onClick={() => removeIngredient(i.id)} aria-label={`Remove ${i.name}`}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {ingredients.length > 0 && perServing && (
          <div className="totals-band" aria-label="Meal totals">
            <div>
              <strong className="totals-big">{perServing.calories.toLocaleString()}</strong> kcal per serving
            </div>
            <span className="totals-macros">
              P {perServing.protein} g &nbsp; C {perServing.carbs} g &nbsp; F {perServing.fat} g
            </span>
          </div>
        )}

        <div className="builder-add">
          <h2 className="builder-title">Add an ingredient</h2>
          <div className="segmented" role="group" aria-label="Where the ingredient comes from">
            {SOURCES.map((s) => (
              <button type="button" key={s.id} onClick={() => setSource(s.id)} aria-pressed={source === s.id}>
                {s.label}
              </button>
            ))}
          </div>
          {source === 'search' ? (
            <SearchPane onAdd={addIngredient} addLabel="Add ingredient" />
          ) : (
            <CustomPane onAdd={addIngredient} addLabel="Add ingredient" nameLabel="Ingredient name" namePlaceholder="Soy sauce" />
          )}
        </div>

        <label className="field">
          <span>Method or notes (optional)</span>
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Bake at 200°C for 25 minutes…" />
        </label>

        <button className="btn" type="button" onClick={save} disabled={!canSave}>
          Save meal
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}
