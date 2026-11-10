import { useState } from 'react';
import { toNumber } from '../lib/meals.js';
import { LIMITS, macroCalories } from '../lib/nutrition.js';
import BodyStats from './BodyStats.jsx';

const FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'water', label: 'Water', unit: 'ml' },
];

const VIEWS = [
  { id: 'targets', label: 'My targets' },
  { id: 'calculator', label: 'Calculate for me' },
];

export default function Goals({ goals, onSave, profile, setProfile, latestWeight }) {
  const [view, setView] = useState('targets');
  const [applied, setApplied] = useState(0); // changes when the calculator replaces the targets, to reset the form
  const [notice, setNotice] = useState('');

  function applyTargets(targets) {
    onSave({ ...goals, ...targets });
    setApplied((n) => n + 1);
    setNotice('Your calorie and macro targets were updated from your plan.');
    setView('targets');
  }

  return (
    <>
      <h1>Goals</h1>

      <div className="segmented" role="group" aria-label="Goals view">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)} aria-pressed={view === v.id}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'targets' ? (
        <TargetsForm key={applied} goals={goals} onSave={onSave} notice={notice} />
      ) : (
        <BodyStats profile={profile} setProfile={setProfile} latestWeight={latestWeight} onApply={applyTargets} />
      )}
    </>
  );
}

function TargetsForm({ goals, onSave, notice }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(goals[f.key])])));
  const [saved, setSaved] = useState(false);

  // Blank or invalid text becomes 0, which the range check below rejects (except for macros, where 0 is allowed).
  const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, Math.round(toNumber(draft[f.key]))]));
  const problems = FIELDS.filter((f) => {
    const [min, max] = LIMITS[f.key];
    return parsed[f.key] < min || parsed[f.key] > max;
  });
  const valid = problems.length === 0;

  const macroKcal = macroCalories(parsed);
  const diff = macroKcal - parsed.calories;

  const change = (key) => (e) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  };

  // A simple starting split: 30% of calories from protein, 40% from carbs, 30% from fat.
  function splitMacros() {
    const kcal = parsed.calories;
    setSaved(false);
    setDraft((d) => ({
      ...d,
      protein: String(Math.round((kcal * 0.3) / 4)),
      carbs: String(Math.round((kcal * 0.4) / 4)),
      fat: String(Math.round((kcal * 0.3) / 9)),
    }));
  }

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSave(parsed);
    setSaved(true);
  }

  return (
    <>
      {notice && (
        <p className="note" role="status">
          {notice}
        </p>
      )}
      <p className="muted">Your daily targets. Change them by hand, or use “Calculate for me”.</p>

      <form className="pane" onSubmit={submit}>
        <div className="numgrid two">
          {FIELDS.map((f) => (
            <label className="field" key={f.key}>
              <span>
                {f.label} ({f.unit})
              </span>
              <input inputMode="numeric" value={draft[f.key]} onChange={change(f.key)} />
            </label>
          ))}
        </div>

        <p className="muted small">
          Your macros add up to {Math.round(macroKcal).toLocaleString()} kcal
          {parsed.calories > 0 && Math.abs(diff) > parsed.calories * 0.05
            ? `, ${Math.abs(Math.round(diff)).toLocaleString()} kcal ${diff > 0 ? 'above' : 'below'} your calorie goal.`
            : '.'}
        </p>

        <button type="button" className="btn secondary" onClick={splitMacros} disabled={parsed.calories <= 0}>
          Fill macros from calories (30% protein, 40% carbs, 30% fat)
        </button>

        {!valid &&
          problems.map((f) => (
            <p className="error" key={f.key}>
              {f.label} must be between {LIMITS[f.key][0].toLocaleString()} and {LIMITS[f.key][1].toLocaleString()} {f.unit}.
            </p>
          ))}

        <button className="btn" type="submit" disabled={!valid}>
          Save goals
        </button>
        {saved && <p role="status">Goals saved.</p>}
      </form>
    </>
  );
}
