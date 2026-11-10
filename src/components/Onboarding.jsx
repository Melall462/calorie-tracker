import { useEffect, useRef, useState } from 'react';
import { ACTIVITY, AIMS, PACES, SEX_OPTIONS, calculatePlan, fieldErrors, parse } from '../lib/calculator.js';
import { round1 } from '../lib/nutrition.js';
import { Plan } from './BodyStats.jsx';

// First-run setup: welcome, four short steps, then a plan. Finishing saves the body stats, the calorie and macro
// targets, and today's weight. It reuses the calculator, so it follows the same safety rules.

const STEPS = ['About you', 'Activity', 'Your goal', 'Your plan'];

// Which form fields each step is responsible for.
const fieldsFor = (step, profile) =>
  step === 1 ? ['sex', 'age', 'heightCm', 'weightKg'] : step === 2 ? ['activity'] : step === 3 && profile.aim !== 'maintain' ? ['goalKg'] : [];

function Choices({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="choices">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={value === o.value ? 'choice on' : 'choice'}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function Onboarding({ initialProfile, replay, onFinish, onSkip }) {
  const [step, setStep] = useState(0); // 0 is the welcome screen, 1 to 4 are the steps
  const [profile, setProfile] = useState(initialProfile);
  const headingRef = useRef(null);

  // Move focus to the new heading and the top of the page whenever the step changes.
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  const set = (key) => (e) => {
    const value = e.target.value;
    setProfile((p) => ({ ...p, [key]: value }));
  };
  const setValue = (key) => (value) => setProfile((p) => ({ ...p, [key]: value }));
  const setAim = (aim) => setProfile((p) => ({ ...p, aim, pace: PACES[aim]?.some((o) => o.value === p.pace) ? p.pace : '0.5' }));

  const errors = fieldErrors(profile);
  const stepFields = fieldsFor(step, profile);
  const canNext = stepFields.every((f) => !errors[f]);
  // Only complain about fields the person has typed in; empty fields just keep Next switched off.
  const shown = stepFields.filter((f) => errors[f] && String(profile[f]).trim() !== '');
  const plan = step === 4 ? calculatePlan(profile) : null;

  const finish = () =>
    onFinish({
      profile,
      targets: { calories: plan.target, ...plan.macros },
      weightKg: round1(parse(profile.weightKg)),
    });

  /* ---------- Welcome ---------- */
  if (step === 0) {
    return (
      <main className="onboarding">
        <section className="welcome">
          <p className="wordmark">Nutrily</p>
          <h1 ref={headingRef} tabIndex={-1}>
            Welcome to Nutrily
          </h1>
          <p className="welcome-lead">Track what you eat and drink, and get a daily calorie target that fits you.</p>
          <ul className="welcome-points">
            <li>Log food by searching, scanning a barcode, or saving your own meals.</li>
            <li>See calories, macros and water for every day.</li>
            <li>Setup takes about a minute.</li>
          </ul>
          <button className="btn" onClick={() => setStep(1)}>
            Set up my plan
          </button>
          <button className="link-btn" onClick={onSkip}>
            {replay ? 'Cancel' : 'Skip for now'}
          </button>
        </section>
      </main>
    );
  }

  /* ---------- Steps ---------- */
  return (
    <>
      <header className="app-header">
        <span className="wordmark">Nutrily</span>
        <button className="link-btn" onClick={onSkip}>
          {replay ? 'Cancel' : 'Skip setup'}
        </button>
      </header>

      <main className="onboarding">
        <p className="muted small" aria-live="polite">
          Step {step} of {STEPS.length}
        </p>
        <div className="steps" aria-hidden="true">
          {STEPS.map((name, i) => (
            <span key={name} className={i < step ? 'done' : ''} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 ref={headingRef} tabIndex={-1}>
              About you
            </h1>
            <p className="muted">These work out how much energy your body uses in a day.</p>
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
              </label>
              {shown.map((f) => (
                <p className="error" role="alert" key={f}>
                  {errors[f]}
                </p>
              ))}
              {errors.age && parse(profile.age) >= 1 && parse(profile.age) < 18 && (
                <p className="note">A doctor or dietitian is the right person to set calorie targets while you are still growing. You can skip setup and use Nutrily to log food.</p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 ref={headingRef} tabIndex={-1}>
              How active are you?
            </h1>
            <p className="muted">Think about a typical week, including work.</p>
            <Choices legend="Activity level" name="activity" options={ACTIVITY} value={profile.activity} onChange={setValue('activity')} />
          </>
        )}

        {step === 3 && (
          <>
            <h1 ref={headingRef} tabIndex={-1}>
              What&apos;s your goal?
            </h1>
            <Choices legend="Your aim" name="aim" options={AIMS} value={profile.aim} onChange={setAim} />
            {profile.aim !== 'maintain' && (
              <div className="pane">
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
                {shown.map((f) => (
                  <p className="error" role="alert" key={f}>
                    {errors[f]}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h1 ref={headingRef} tabIndex={-1}>
              Your plan
            </h1>
            {plan.ok ? (
              <>
                <Plan plan={plan} onApply={finish} applyLabel="Start tracking" />
                <p className="muted small">
                  Your weight of {round1(parse(profile.weightKg))} kg will be saved as today&apos;s weigh-in. You can change any of this later in
                  Account.
                </p>
              </>
            ) : (
              <section className="plan" aria-label="Plan">
                <h2>{plan.minor ? 'Not available under 18' : "We can't build that plan"}</h2>
                {plan.minor ? (
                  <p>Nutrily&apos;s calculator is for adults. A doctor or dietitian is the right person to set calorie targets.</p>
                ) : (
                  plan.errors.map((message) => <p key={message}>{message}</p>)
                )}
              </section>
            )}
          </>
        )}

        <div className="onboarding-actions">
          <button className="btn secondary" onClick={() => setStep(step - 1)}>
            Back
          </button>
          {step < 4 && (
            <button className="btn" onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next
            </button>
          )}
          {step === 4 && !plan.ok && (
            <button className="btn" onClick={onSkip}>
              {replay ? 'Cancel' : 'Skip setup'}
            </button>
          )}
        </div>
      </main>
    </>
  );
}
