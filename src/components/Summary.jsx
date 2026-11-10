import { MACROS, percent } from '../lib/nutrition.js';

function Ring({ eaten, goal }) {
  const pct = goal > 0 ? (eaten / goal) * 100 : 0;
  const over = eaten > goal;
  return (
    <svg
      className="ring"
      viewBox="0 0 80 80"
      role="progressbar"
      aria-label="Calories eaten"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={eaten}
    >
      <circle className="ring-track" cx="40" cy="40" r="34" />
      <circle
        className={over ? 'ring-fill over' : 'ring-fill'}
        cx="40"
        cy="40"
        r="34"
        pathLength="100"
        strokeDasharray={`${Math.min(100, pct)} 100`}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="45" textAnchor="middle" className="ring-text">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// The day's headline number plus the three macros.
export default function Summary({ totals, goals }) {
  const eaten = Math.round(totals.calories);
  const left = goals.calories - eaten;
  const over = left < 0;

  return (
    <>
      <section className="hero" aria-label="Daily calories">
        <div className="hero-main">
          <div>
            <p className="hero-big">{Math.abs(left).toLocaleString()}</p>
            <p className={over ? 'hero-unit over' : 'hero-unit'}>{over ? 'kcal over your goal' : 'kcal left today'}</p>
          </div>
          <Ring eaten={eaten} goal={goals.calories} />
        </div>
        <dl className="hero-stats">
          <div>
            <dt>Goal</dt>
            <dd>{goals.calories.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Eaten</dt>
            <dd>{eaten.toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-label="Macros">
        <h2>Macros today</h2>
        {MACROS.map((m) => (
          <div className="macro-row" key={m.key}>
            <div className="macro-top">
              <span className="macro-name">
                <span className="dot" style={{ '--c': m.color }} aria-hidden="true" />
                {m.label}
              </span>
              <span className="muted">
                <strong className="macro-eaten">{Math.round(totals[m.key])} g</strong> / {goals[m.key]} g
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
    </>
  );
}
