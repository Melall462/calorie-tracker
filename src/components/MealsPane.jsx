import { useState } from 'react';
import { portion } from '../lib/recipes.js';
import { toNumber } from '../lib/meals.js';
import { mealFlags } from '../lib/mealSafety.js';
import { usePreferences } from '../lib/PreferencesContext.js';

// The recipe book: saved meals you can log in one tap, plus a button to add a new one.
export default function MealsPane({ meals, slotLabel, onNew, onEdit, onDelete, onLog }) {
  const prefs = usePreferences();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [servings, setServings] = useState('1');
  const [confirmId, setConfirmId] = useState(null);

  const q = query.trim().toLowerCase();
  const shown = meals.filter((m) => m.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  const eaten = toNumber(servings);

  function log(meal) {
    if (!eaten) return;
    onLog({ name: meal.name, serving: eaten === 1 ? '1 serving' : `${eaten} servings`, ...portion(meal, eaten) });
  }

  return (
    <div className="pane">
      <button type="button" className="btn" onClick={onNew}>
        Add meal
      </button>

      {meals.length === 0 ? (
        <div className="empty">
          <p>No saved meals yet.</p>
          <p className="muted small">Build a meal from its ingredients once, then log it in one tap whenever you eat it.</p>
        </div>
      ) : (
        <>
          {meals.length > 3 && (
            <label className="field">
              <span>Search your meals</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          )}
          {shown.length === 0 ? (
            <p className="muted">No meal matches that.</p>
          ) : (
            <ul className="list">
              {shown.map((meal) => {
                const open = openId === meal.id;
                const perServing = portion(meal, 1);
                const flags = mealFlags(meal, prefs).hard;
                const eating = portion(meal, eaten || 0);
                return (
                  <li key={meal.id} className="result">
                    <button
                      type="button"
                      className="result-btn"
                      aria-expanded={open}
                      onClick={() => {
                        setOpenId(open ? null : meal.id);
                        setServings('1');
                        setConfirmId(null);
                      }}
                    >
                      <span>
                        <span className="entry-name">{meal.name}</span>
                        <span className="muted small block">
                          Makes {meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}, {meal.ingredients.length}{' '}
                          {meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                        </span>
                        {(meal.ai || flags.length > 0) && (
                          <span className="tag-line">
                            {meal.ai && <span className="tag ai">AI-written</span>}
                            {flags.map((w) => (
                              <span key={w} className="tag warn">
                                {w}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <strong>{perServing.calories} kcal</strong>
                    </button>

                    {open && (
                      <div className="result-panel">
                        <p className="muted small">
                          Per serving: P {perServing.protein} g &nbsp; C {perServing.carbs} g &nbsp; F {perServing.fat} g
                        </p>
                        <ul className="mini-list">
                          {meal.ingredients.map((i) => (
                            <li key={i.id}>
                              {i.name}
                              {i.serving ? <span className="muted">, {i.serving}</span> : null}
                            </li>
                          ))}
                        </ul>
                        {meal.ai && <p className="note">Written by the AI. Check the ingredients against your allergies before you cook it.</p>}
                        {meal.notes && <p className="notes">{meal.notes}</p>}

                        <label className="field compact">
                          <span>Servings you ate</span>
                          <input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} />
                        </label>
                        <p className="muted small">
                          {eating.calories} kcal &nbsp; P {eating.protein} g &nbsp; C {eating.carbs} g &nbsp; F {eating.fat} g
                        </p>
                        <button className="btn" onClick={() => log(meal)} disabled={!eaten}>
                          Add to {slotLabel}
                        </button>

                        <div className="meal-actions">
                          <button className="link-btn" onClick={() => onEdit(meal)} aria-label={`Edit ${meal.name}`}>
                            Edit
                          </button>
                          {confirmId === meal.id ? (
                            <>
                              <span className="small">Delete this meal?</span>
                              <button
                                className="link-btn danger"
                                onClick={() => {
                                  onDelete(meal.id);
                                  setConfirmId(null);
                                  setOpenId(null);
                                }}
                              >
                                Yes, delete
                              </button>
                              <button className="link-btn" onClick={() => setConfirmId(null)}>
                                Keep
                              </button>
                            </>
                          ) : (
                            <button className="link-btn" onClick={() => setConfirmId(meal.id)} aria-label={`Delete ${meal.name}`}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
