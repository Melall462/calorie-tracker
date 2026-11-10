import { ACTIVITY, AIMS, PACES, SEX_OPTIONS, calculatePlan } from '../lib/calculator.js';

export default function BodyStats({ profile, setProfile, latestWeight, onApply }) {
  const plan = calculatePlan(profile);
  const needsGoal = profile.aim !== 'maintain';

  const set = (key) => (e) => {
    const value = e.target.value;
    setProfile((p) => ({ ...p, [key]: value }));
  };

  // Keep the chosen pace valid when switching between losing and gaining.
  const setAim = (e) => {
    const aim = e.target.value;
    setProfile((p) => ({ ...p, aim, pace: PACES[aim]?.some((o) => o.value === p.pace) ? p.pace : '0.5' }));
  };

  return (
    <>
      <p className="muted">Tell Nutrily about yourself and it will work out a daily calorie target. Your answers are saved on this device.</p>

      <div className="pane">
        <label className="field">
          <span>Sex (used by the formula)</span>
          <select value={profile.sex} onChange={set('sex')}>
            <option value="">Select…</option>
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <small className="hint">The equations were built around biological sex. “Average” splits the difference.</small>
        </label>

        <div className="numgrid two">
          <label className="field">
            <span>Age (years)</span>
            <input inputMode="numeric" value={profile.age} onChange={set('age')} />
          </label>
          <label className="field">
            <span>Height (cm)</span>
            <input inputMode="decimal" value={profile.heightCm} onChange={set('heightCm')} />
          </label>
        </div>

        <label className="field">
          <span>Current weight (kg)</span>
          <input inputMode="decimal" value={profile.weightKg} onChange={set('weightKg')} />
          {latestWeight && String(latestWeight) !== profile.weightKg && (
            <button type="button" className="link-btn start" onClick={() => setProfile((p) => ({ ...p, weightKg: String(latestWeight) }))}>
              Use my latest weigh-in ({latestWeight} kg)
            </button>
          )}
        </label>

        <label className="field">
          <span>Body fat % (optional)</span>
          <input inputMode="decimal" value={profile.bodyFat} onChange={set('bodyFat')} placeholder="Leave blank if unsure" />
          <small className="hint">If you know it (a smart scale or a body scan), the result is more accurate for very lean or muscular people.</small>
        </label>

        <label className="field">
          <span>Activity level</span>
          <select value={profile.activity} onChange={set('activity')}>
            <option value="">Select…</option>
            {ACTIVITY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Your aim</span>
          <select value={profile.aim} onChange={setAim}>
            {AIMS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {needsGoal && (
          <div className="numgrid two">
            <label className="field">
              <span>Goal weight (kg)</span>
              <input inputMode="decimal" value={profile.goalKg} onChange={set('goalKg')} />
            </label>
            <label className="field">
              <span>Pace</span>
              <select value={profile.pace} onChange={set('pace')}>
                {PACES[profile.aim].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {plan.ok ? <Plan plan={plan} onApply={onApply} /> : <Incomplete plan={plan} />}

      <p className="muted small">
        This is an estimate, not medical advice. It isn&apos;t suitable if you are under 18, pregnant or breastfeeding, or have a
        medical condition that affects how you eat. If tracking food ever feels stressful, or you find yourself eating far less than
        you need, please talk to a doctor.
      </p>
    </>
  );
}

function Incomplete({ plan }) {
  if (plan.minor) {
    return (
      <section className="plan" aria-label="Plan">
        <h2>Not available under 18</h2>
        <p>
          Nutrily&apos;s calculator is for adults. Young people are still growing, so a doctor or dietitian is the right person to set
          calorie targets.
        </p>
      </section>
    );
  }
  return (
    <section className="plan" aria-label="Plan">
      <h2>To see your plan</h2>
      <ul className="plan-todo">
        {plan.errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}

function timeToGoal(plan) {
  if (plan.weeks === null) return null;
  if (plan.weeks > 104) return 'more than 2 years at this pace';
  const when = plan.goalDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return `about ${plan.weeks} ${plan.weeks === 1 ? 'week' : 'weeks'} (around ${when})`;
}

export function Plan({ plan, onApply, applyLabel = 'Use these targets' }) {
  const change = plan.change === 0 ? 'None' : `${plan.change > 0 ? '+' : '−'}${Math.abs(plan.change).toLocaleString()} kcal`;
  const time = timeToGoal(plan);
  const { protein, carbs, fat } = plan.macros;

  return (
    <section className="plan ready" aria-label="Your plan">
      <h2>Your daily target</h2>
      <p className="plan-big" aria-label={`${plan.target} calories`}>
        {plan.target.toLocaleString()} <span>kcal</span>
      </p>

      <dl className="plan-facts">
        <dt>Resting burn (BMR)</dt>
        <dd>{plan.bmr.toLocaleString()} kcal</dd>
        <dt>Maintenance</dt>
        <dd>{plan.tdee.toLocaleString()} kcal</dd>
        <dt>Daily change</dt>
        <dd>{change}</dd>
        {plan.aim !== 'maintain' && (
          <>
            <dt>Expected pace</dt>
            <dd>{plan.paceKgWeek} kg a week</dd>
          </>
        )}
        {time && (
          <>
            <dt>Time to goal</dt>
            <dd>{time}</dd>
          </>
        )}
        <dt>Protein</dt>
        <dd>{protein} g</dd>
        <dt>Carbs</dt>
        <dd>{carbs} g</dd>
        <dt>Fat</dt>
        <dd>{fat} g</dd>
        <dt>BMI</dt>
        <dd>{plan.bmi}</dd>
      </dl>

      {plan.warnings.map((message) => (
        <p className="note" key={message}>
          {message}
        </p>
      ))}

      <p className="muted small">
        Calculated with {plan.formula}. As your weight changes, update your stats and recalculate every few weeks.
      </p>

      <button className="btn" onClick={() => onApply({ calories: plan.target, ...plan.macros })}>
        {applyLabel}
      </button>
    </section>
  );
}
