import { percent } from '../lib/nutrition.js';

const STEP = 250;

export default function Water({ amount, goal, onChange }) {
  const reached = amount >= goal;

  return (
    <section className="water" aria-label="Water intake">
      <div className="summary-row">
        <span className="summary-name">Water</span>
        <span className={reached ? 'water-done' : 'muted'}>
          {amount.toLocaleString()} of {goal.toLocaleString()} ml{reached ? ' · goal reached' : ''}
        </span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label="Water drunk"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={amount}
        style={{ '--pct': `${percent(amount, goal)}%`, '--bar-color': 'var(--water)' }}
      >
        <span />
      </div>
      <div className="water-actions">
        <button className="chip" onClick={() => onChange(-STEP)} disabled={amount === 0} aria-label={`Remove ${STEP} millilitres`}>
          −{STEP} ml
        </button>
        <button className="chip" onClick={() => onChange(STEP)}>
          +{STEP} ml
        </button>
        <button className="chip" onClick={() => onChange(500)}>
          +500 ml
        </button>
      </div>
    </section>
  );
}
