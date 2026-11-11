import { useRef, useState } from 'react';
import { MEALS, toNumber } from '../lib/meals.js';
import { formatDay, shiftDay, todayKey } from '../lib/dates.js';
import { BUDGETS, MAX_DAYS, MAX_MEALS, buildContext, dayCalories, planDays, planMeals, recipeCalories } from '../lib/planAi.js';
import { ALLERGENS, DIETS } from '../lib/preferences.js';
import { usePreferences } from '../lib/PreferencesContext.js';
import { useCloud } from '../lib/CloudContext.js';
import AuthForm from './AuthForm.jsx';
import TagInput from './TagInput.jsx';

const DAILY_LIMIT = 40; // matches the Edge Function

const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id;

// Plan some meals, or whole days, with the AI. Nothing is saved until the person has looked at the result.
export default function PlanGenerator({ goals, meals, onDone, onCancel }) {
  const prefs = usePreferences();
  const cloud = useCloud();
  const [mode, setMode] = useState('days'); // 'days' or 'meals'
  const [count, setCount] = useState('4');
  const [days, setDays] = useState('7');
  const [start, setStart] = useState(shiftDay(todayKey(), 1));
  const [slots, setSlots] = useState(['breakfast', 'lunch', 'dinner']);
  const [cuisines, setCuisines] = useState([]);
  const [budget, setBudget] = useState('any');
  const [phase, setPhase] = useState('form'); // form, running or result
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const stopRef = useRef(false);

  const dayCount = Math.min(MAX_DAYS, Math.max(1, Math.round(toNumber(days)) || 1));
  const mealCount = Math.min(MAX_MEALS, Math.max(1, Math.round(toNumber(count)) || 1));
  const startOk = start >= todayKey();
  const valid = slots.length > 0 && (mode === 'meals' || startOk);

  function switchMode(next) {
    setMode(next);
    setSlots(next === 'days' ? ['breakfast', 'lunch', 'dinner'] : ['dinner']);
  }
  const toggleSlot = (id) => setSlots((s) => (s.includes(id) ? s.filter((x) => x !== id) : MEALS.map((m) => m.id).filter((x) => s.includes(x) || x === id)));

  async function run() {
    setPhase('running');
    stopRef.current = false;
    const context = buildContext({ goals, preferences: prefs, cuisines, budget });
    if (mode === 'days') {
      const dates = Array.from({ length: dayCount }, (_, i) => shiftDay(start, i));
      setProgress({ done: 0, total: dates.length });
      const out = await planDays({ planner: cloud.planMeals, dates, slots, context, prefs, onProgress: setProgress, isCancelled: () => stopRef.current });
      setResult({ ...out, mode: 'days', dates });
    } else {
      setProgress({ done: 0, total: 1 });
      const out = await planMeals({ planner: cloud.planMeals, count: mealCount, slots, context, prefs, existingNames: meals.map((m) => m.name) });
      setResult({ ...out, items: [], mode: 'meals', dates: [] });
    }
    setPhase('result');
  }

  /* ---------- Not available yet ---------- */
  if (!cloud.available) {
    return (
      <>
        <h2>Plan with AI</h2>
        <p className="note">AI planning needs an account, and cloud sync isn&apos;t set up for this app yet.</p>
        <button className="btn secondary" onClick={onCancel}>
          Back
        </button>
      </>
    );
  }
  if (cloud.loading) return <p className="muted">Checking your account…</p>;
  if (!cloud.session) {
    return (
      <>
        <h2>Sign in to plan with AI</h2>
        <p className="muted">AI planning is for signed-in accounts. This keeps it fair and stops anyone running up costs.</p>
        <AuthForm />
        <button className="btn secondary" onClick={onCancel}>
          Back
        </button>
      </>
    );
  }

  /* ---------- Running ---------- */
  if (phase === 'running') {
    return (
      <>
        <h2>Planning…</h2>
        <p role="status">
          {mode === 'days' ? `Planned ${progress.done} of ${progress.total} ${progress.total === 1 ? 'day' : 'days'}…` : 'Writing your meals…'}
        </p>
        <div className="bar" role="progressbar" aria-label="Planning progress" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} style={{ '--pct': `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, '--bar-color': 'var(--forest)' }}>
          <span />
        </div>
        <p className="muted small">This can take a few seconds a day. Stopping keeps whatever has been planned so far.</p>
        <button className="btn secondary" onClick={() => (stopRef.current = true)}>
          Stop
        </button>
      </>
    );
  }

  /* ---------- Result ---------- */
  if (phase === 'result' && result) {
    const { recipes, items, removed, dropped, error, daysDone, dates } = result;
    const totals = dayCalories(recipes, items);
    const offTarget = (dates ?? []).filter((d) => totals[d] !== undefined && Math.abs(totals[d] - goals.calories) > goals.calories * 0.12);
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    const nothing = recipes.length === 0;
    const saveLabel = mode === 'days' ? (error ? `Keep the ${daysDone} ${daysDone === 1 ? 'day' : 'days'} that worked` : 'Save to my planner') : 'Save to my recipe book';

    return (
      <>
        <h2>{nothing ? 'Nothing to save' : 'Here is your plan'}</h2>
        {error && (
          <p className="error" role="alert">
            {error.message}
          </p>
        )}
        {!nothing && (
          <p>
            {mode === 'days'
              ? `${items.length} meals across ${daysDone} ${daysDone === 1 ? 'day' : 'days'}, using ${recipes.length} new ${recipes.length === 1 ? 'recipe' : 'recipes'}.`
              : `${recipes.length} new ${recipes.length === 1 ? 'recipe' : 'recipes'} for your recipe book.`}
          </p>
        )}
        {removed.length > 0 && (
          <div className="note alert" role="alert">
            <strong>
              {removed.length} {removed.length === 1 ? 'meal was' : 'meals were'} removed for breaking your diet or allergies:
            </strong>
            <ul className="mini-list">
              {removed.map((r, i) => (
                <li key={i}>
                  {r.name}
                  {r.date ? ` (${formatDay(r.date)})` : ''}: {r.reasons.join(', ')}
                </li>
              ))}
            </ul>
            {mode === 'days' && <p className="small">Those meal times are empty. You can add something there yourself, or run the plan again.</p>}
          </div>
        )}
        {dropped > 0 && <p className="note">{dropped} {dropped === 1 ? 'meal' : 'meals'} had numbers that didn&apos;t look right, or didn&apos;t fit, and were skipped.</p>}
        {offTarget.length > 0 && (
          <p className="note">
            {offTarget.map((d) => `${formatDay(d)} comes to about ${Math.round(totals[d]).toLocaleString()} kcal`).join('; ')}, against your {goals.calories.toLocaleString()} kcal target.
          </p>
        )}

        {!nothing && (
          <ul className="list preview">
            {mode === 'days'
              ? [...new Set(items.map((i) => i.date))].map((d) => (
                  <li className="entry" key={d}>
                    <div className="entry-main">
                      <span className="entry-name">{formatDay(d)}</span>
                      {items.filter((i) => i.date === d).map((i) => (
                        <span className="muted small" key={i.id}>
                          {labelOf(MEALS, i.slot)}: {recipeById.get(i.mealId)?.name}
                        </span>
                      ))}
                    </div>
                    <strong>{Math.round(totals[d] ?? 0)} kcal</strong>
                  </li>
                ))
              : recipes.map((r) => (
                  <li className="entry" key={r.id}>
                    <div className="entry-main">
                      <span className="entry-name">{r.name}</span>
                      <span className="muted small">{r.ingredients.map((i) => i.name).join(', ')}</span>
                    </div>
                    <strong>{recipeCalories(r)} kcal</strong>
                  </li>
                ))}
          </ul>
        )}
        <p className="muted small">AI can get nutrition and ingredients wrong. Check each recipe, especially if you have an allergy, before you cook it.</p>

        {!nothing && (
          <button className="btn" onClick={() => onDone({ recipes, items, start: dates?.[0] })}>
            {saveLabel}
          </button>
        )}
        <button className="btn secondary" onClick={() => (nothing ? setPhase('form') : onCancel())}>
          {nothing ? 'Back to the options' : 'Discard'}
        </button>
      </>
    );
  }

  /* ---------- The form ---------- */
  const requests = mode === 'days' ? dayCount : 1;
  const likes = prefs.likes.length ? prefs.likes.join(', ') : null;

  return (
    <>
      <h2>Plan with AI</h2>
      <p className="muted">It plans around your targets, diet, allergies and the foods you love or avoid.</p>

      <div className="segmented" role="group" aria-label="What to plan">
        <button onClick={() => switchMode('days')} aria-pressed={mode === 'days'}>
          Whole days
        </button>
        <button onClick={() => switchMode('meals')} aria-pressed={mode === 'meals'}>
          Some meals
        </button>
      </div>

      <div className="pane">
        {mode === 'days' ? (
          <div className="numgrid two">
            <label className="field">
              <span>How many days</span>
              <select value={days} onChange={(e) => setDays(e.target.value)}>
                {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 7 ? '7 days (a week)' : `${n} ${n === 1 ? 'day' : 'days'}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Starting on</span>
              <input type="date" value={start} min={todayKey()} onChange={(e) => setStart(e.target.value)} />
            </label>
          </div>
        ) : (
          <label className="field">
            <span>How many meals</span>
            <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
            <small className="hint">Between 1 and {MAX_MEALS}. They are saved to your recipe book, not placed on a day.</small>
          </label>
        )}
        {mode === 'days' && !startOk && <p className="error">Pick today or a later day.</p>}

        <fieldset className="check-group">
          <legend>{mode === 'days' ? 'Meal times to plan' : 'What kind of meals'}</legend>
          <div className="pill-checks">
            {MEALS.map((m) => {
              const on = slots.includes(m.id);
              return (
                <label key={m.id} className={on ? 'pill-check on' : 'pill-check'}>
                  <input type="checkbox" checked={on} onChange={() => toggleSlot(m.id)} />
                  <span>{m.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {slots.length === 0 && <p className="error">Choose at least one.</p>}

        <TagInput label="Cuisines or themes (optional)" placeholder="Mediterranean, quick weeknight" items={cuisines} onChange={setCuisines} hint="Press Enter or Add after each." />

        <label className="field">
          <span>Budget</span>
          <select value={budget} onChange={(e) => setBudget(e.target.value)}>
            {BUDGETS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <section className="card" aria-label="What the AI will be told">
          <h3>From your Account</h3>
          <p className="small">
            Targets: {goals.calories.toLocaleString()} kcal, {goals.protein} g protein, {goals.carbs} g carbs, {goals.fat} g fat.
          </p>
          <p className="small">
            Diet: {prefs.diets.length ? prefs.diets.map((d) => labelOf(DIETS, d)).join(', ') : 'none set'}. Allergies: {prefs.avoid.length ? prefs.avoid.map((a) => labelOf(ALLERGENS, a)).join(', ') : 'none set'}.
          </p>
          {(likes || prefs.dislikes.length > 0) && (
            <p className="small">
              {likes && <>Loves: {likes}. </>}
              {prefs.dislikes.length > 0 && <>Avoids: {prefs.dislikes.join(', ')}.</>}
            </p>
          )}
          {prefs.diets.length + prefs.avoid.length + prefs.likes.length + prefs.dislikes.length === 0 && (
            <p className="small">You haven&apos;t set any food preferences. Add them under Account, then Food, for better plans.</p>
          )}
          <p className="muted small">Change any of this in Account. Every meal is also checked against your diet and allergies before it is saved.</p>
        </section>

        <p className="muted small">
          This uses {requests} of your {DAILY_LIMIT} AI requests for today.
        </p>
        <button className="btn" onClick={run} disabled={!valid}>
          Generate
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}
