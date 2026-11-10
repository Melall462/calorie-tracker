import { MACROS, percent } from '../lib/nutrition.js';

// Daily totals, laid out like the panel on a food package: calories on top, a heavy rule, then the macros.
export default function Summary({ totals, goals }) {
  const eaten = Math.round(totals.calories);
  const left = goals.calories - eaten;
  const over = left < 0;

  return (
    <section className="summary" aria-label="Daily totals">
      <div className="summary-row">
        <span className="summary-name">Calories</span>
        <span className="summary-big">{eaten.toLocaleString()}</span>
      </div>
      <div className="summary-row">
        <span className="muted">of {goals.calories.toLocaleString()} kcal goal</span>
        <span className={over ? 'over' : 'muted'}>
          {over ? `${Math.abs(left).toLocaleString()} kcal over` : `${left.toLocaleString()} kcal left`}
        </span>
      </div>
      <div
        className="bar thick"
        role="progressbar"
        aria-label="Calories eaten"
        aria-valuemin={0}
        aria-valuemax={goals.calories}
        aria-valuenow={eaten}
        style={{ '--pct': `${percent(eaten, goals.calories)}%`, '--bar-color': over ? 'var(--over)' : 'var(--ink)' }}
      >
        <span />
      </div>
      <div className="summary-rule" />

      {MACROS.map((m) => (
        <div className="summary-macro" key={m.key}>
          <div className="summary-row">
            <span className="summary-name">{m.label}</span>
            <span className="muted">
              {Math.round(totals[m.key])} of {goals[m.key]} g
            </span>
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-label={`${m.label} eaten`}
            aria-valuemin={0}
            aria-valuemax={goals[m.key]}
            aria-valuenow={Math.round(totals[m.key])}
            style={{ '--pct': `${percent(totals[m.key], goals[m.key])}%`, '--bar-color': m.color }}
          >
            <span />
          </div>
        </div>
      ))}
    </section>
  );
}
