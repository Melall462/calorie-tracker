import { useState } from 'react';
import { MEALS } from '../lib/meals.js';
import { formatDay, fromKey, shiftDay, todayKey } from '../lib/dates.js';
import { percent } from '../lib/nutrition.js';
import { SERVING_CHOICES, dayPlan, dayTotals, mondayOf, weekDates } from '../lib/plan.js';
import { portion } from '../lib/recipes.js';
import { mealFlags } from '../lib/mealSafety.js';
import { usePreferences } from '../lib/PreferencesContext.js';

const short = (key) => fromKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// One week at a time: pick a day, then see and edit what is planned for each meal time.
export default function Planner({ plan, meals, goals, focus, onAdd, onRemove, onServings, onLog, onUndo, onClearWeek, onGenerate }) {
  const prefs = usePreferences();
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(mondayOf(focus ?? today));
  const dates = weekDates(weekStart);
  const [selected, setSelected] = useState(focus && dates.includes(focus) ? focus : dates.includes(today) ? today : weekStart);
  const [picking, setPicking] = useState(null); // the meal time being added to
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  function goWeek(delta) {
    const next = shiftDay(weekStart, delta * 7);
    setWeekStart(next);
    setSelected(weekDates(next).includes(today) ? today : next);
    setPicking(null);
    setConfirmClear(false);
  }

  const items = dayPlan(plan, selected);
  const totals = dayTotals(plan, meals, selected);
  const mealById = (id) => meals.find((m) => m.id === id);
  const isFuture = selected > today;
  const hasUnlogged = dates.some((d) => plan.some((p) => p.date === d && !p.done));
  const q = query.trim().toLowerCase();
  const choices = meals.filter((m) => m.name.toLowerCase().includes(q));

  return (
    <>
      <button className="btn" onClick={onGenerate}>
        Plan with AI
      </button>

      <div className="week-nav">
        <button className="pill-btn" onClick={() => goWeek(-1)} aria-label="Previous week">
          ‹
        </button>
        <span className="week-label">
          {short(dates[0])} to {short(dates[6])}
        </span>
        <button className="pill-btn" onClick={() => goWeek(1)} aria-label="Next week">
          ›
        </button>
      </div>

      <div className="week" role="group" aria-label="Choose a day">
        {dates.map((d) => (
          <button
            key={d}
            className={d === today ? 'day is-today' : 'day'}
            onClick={() => {
              setSelected(d);
              setPicking(null);
            }}
            aria-current={d === selected ? 'date' : undefined}
            aria-label={fromKey(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          >
            <span className="day-name">{fromKey(d).toLocaleDateString(undefined, { weekday: 'short' })}</span>
            <span className="day-num">{fromKey(d).getDate()}</span>
            <span className={plan.some((p) => p.date === d) ? 'day-dot on' : 'day-dot'} aria-hidden="true" />
          </button>
        ))}
      </div>

      <section className="plan-day" aria-label="Planned day">
        <div className="summary-row">
          <h2>{formatDay(selected)}</h2>
          <span className="muted small">
            {totals.calories.toLocaleString()} of {goals.calories.toLocaleString()} kcal planned
          </span>
        </div>
        <div
          className="bar"
          role="progressbar"
          aria-label="Planned calories"
          aria-valuemin={0}
          aria-valuemax={goals.calories}
          aria-valuenow={totals.calories}
          style={{ '--pct': `${percent(totals.calories, goals.calories)}%`, '--bar-color': totals.calories > goals.calories * 1.1 ? 'var(--over)' : 'var(--forest)' }}
        >
          <span />
        </div>
        <p className="muted small">
          Planned: P {totals.protein} g &nbsp; C {totals.carbs} g &nbsp; F {totals.fat} g
        </p>
        {isFuture && items.length > 0 && <p className="muted small">You can log planned meals on the day, or after it.</p>}

        {MEALS.map((slot) => {
          const slotItems = items.filter((p) => p.slot === slot.id);
          return (
            <div className="slot" key={slot.id}>
              <div className="meal-head">
                <h3>{slot.label}</h3>
                <button className="link-btn" onClick={() => (setPicking(picking === slot.id ? null : slot.id), setQuery(''))} aria-expanded={picking === slot.id}>
                  {picking === slot.id ? 'Close' : `Add to ${slot.label.toLowerCase()}`}
                </button>
              </div>

              {slotItems.length === 0 && picking !== slot.id && <p className="muted small slot-empty">Nothing planned.</p>}

              <ul className="list">
                {slotItems.map((item) => {
                  const meal = mealById(item.mealId);
                  if (!meal) {
                    return (
                      <li className="entry" key={item.id}>
                        <div className="entry-main">
                          <span className="entry-name">This meal was deleted from your recipe book</span>
                        </div>
                        <button className="link-btn" onClick={() => onRemove(item.id)}>
                          Remove
                        </button>
                      </li>
                    );
                  }
                  const p = portion(meal, item.servings);
                  const flags = mealFlags(meal, prefs);
                  return (
                    <li className={item.done ? 'entry plan-row done' : 'entry plan-row'} key={item.id}>
                      <div className="entry-main">
                        <span className="entry-name">{meal.name}</span>
                        <span className="tag-line">
                          {meal.ai && <span className="tag ai">AI-written</span>}
                          {flags.hard.map((w) => (
                            <span key={w} className="tag warn">
                              {w}
                            </span>
                          ))}
                          {flags.soft.map((w) => (
                            <span key={w} className="tag">
                              {w}
                            </span>
                          ))}
                        </span>
                        <span className="muted small">
                          P {p.protein} g &nbsp; C {p.carbs} g &nbsp; F {p.fat} g
                        </span>
                        <label className="servings-pick">
                          <span className="sr-only">Servings of {meal.name}</span>
                          <select value={item.servings} onChange={(e) => onServings(item.id, Number(e.target.value))} disabled={item.done}>
                            {[...new Set([...SERVING_CHOICES, item.servings])].sort((a, b) => a - b).map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? 'serving' : 'servings'}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="entry-side">
                        <strong>{p.calories}</strong>
                        <div className="entry-actions">
                          {item.done ? (
                            <button className="link-btn" onClick={() => onUndo(item.id)} aria-label={`Undo logging ${meal.name}`}>
                              Logged, undo
                            </button>
                          ) : (
                            <button className="link-btn strong" onClick={() => onLog(item.id)} disabled={isFuture} aria-label={`Log ${meal.name}`}>
                              Log
                            </button>
                          )}
                          <button className="link-btn" onClick={() => onRemove(item.id)} aria-label={`Remove ${meal.name} from the plan`}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {picking === slot.id && (
                <div className="picker">
                  {meals.length === 0 ? (
                    <p className="muted small">Your recipe book is empty. Use Plan with AI, or add a recipe in the Recipes section.</p>
                  ) : (
                    <>
                      {meals.length > 5 && (
                        <label className="field compact">
                          <span>Search your recipes</span>
                          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
                        </label>
                      )}
                      {choices.length === 0 ? (
                        <p className="muted small">No recipe matches that.</p>
                      ) : (
                        <ul className="list">
                          {choices.map((m) => {
                            const flags = mealFlags(m, prefs).hard;
                            return (
                              <li key={m.id} className="result">
                                <button
                                  className="result-btn"
                                  onClick={() => {
                                    onAdd(selected, slot.id, m.id);
                                    setPicking(null);
                                  }}
                                  aria-label={`Add ${m.name} to ${slot.label}`}
                                >
                                  <span>
                                    <span className="entry-name">{m.name}</span>
                                    <span className="tag-line">
                                      {m.ai && <span className="tag ai">AI-written</span>}
                                      {flags.map((w) => (
                                        <span key={w} className="tag warn">
                                          {w}
                                        </span>
                                      ))}
                                    </span>
                                  </span>
                                  <strong>{portion(m, 1).calories} kcal</strong>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {hasUnlogged &&
        (confirmClear ? (
          <p className="small">
            Remove every meal in this week that you haven&apos;t logged?{' '}
            <button
              className="link-btn danger"
              onClick={() => {
                onClearWeek(dates);
                setConfirmClear(false);
              }}
            >
              Yes, clear the week
            </button>{' '}
            <button className="link-btn" onClick={() => setConfirmClear(false)}>
              Keep
            </button>
          </p>
        ) : (
          <button className="link-btn" onClick={() => setConfirmClear(true)}>
            Clear this week&apos;s plan
          </button>
        ))}
    </>
  );
}
