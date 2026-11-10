import { useState } from 'react';
import { formatDay, fromKey, todayKey } from '../lib/dates.js';
import { toNumber } from '../lib/meals.js';
import { WEIGHT_LIMITS, round1, weightList } from '../lib/nutrition.js';

export default function Weight({ weights, onSave, onRemove, goalKg, aim }) {
  const [text, setText] = useState('');
  const [day, setDay] = useState(todayKey());

  const list = weightList(weights);
  const latest = list.at(-1);
  const change = list.length > 1 ? latest.kg - list[0].kg : null;

  // Progress toward the goal weight set in Account > Calculator.
  let goalLine = null;
  if (latest && goalKg && (aim === 'lose' || aim === 'gain')) {
    const toGo = aim === 'lose' ? latest.kg - goalKg : goalKg - latest.kg;
    goalLine = toGo > 0.05 ? `${round1(toGo)} kg to go to your goal of ${goalKg} kg` : `You've reached your goal weight of ${goalKg} kg`;
  }

  const value = toNumber(text);
  const [min, max] = WEIGHT_LIMITS;
  const dayOk = day !== '' && day <= todayKey();
  const valid = value >= min && value <= max && dayOk;
  const replacing = dayOk && weights[day] !== undefined;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSave(day, round1(value));
    setText('');
  }

  return (
    <>
      {latest ? (
        <div className="weight-now">
          <span className="weight-big">{latest.kg}</span>
          <span className="muted">
            kg on {formatDay(latest.date)}
            {change !== null && ` · ${change > 0 ? '+' : ''}${round1(change)} kg since your first entry`}
          </span>
          {goalLine && <span className="muted">{goalLine}</span>}
        </div>
      ) : (
        <p className="muted">No weigh-ins yet. Add your first below.</p>
      )}

      <Trend points={list.slice(-60)} />

      <form className="weigh-form" onSubmit={submit}>
        <label className="field compact">
          <span>Weight (kg)</span>
          <input inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} placeholder="72.4" />
        </label>
        <label className="field compact">
          <span>Date</span>
          <input type="date" value={day} max={todayKey()} onChange={(e) => setDay(e.target.value)} />
        </label>
        {text !== '' && !valid && (
          <p className="error wide">
            Enter a weight between {min} and {max} kg and a date that is today or earlier.
          </p>
        )}
        {replacing && valid && <p className="muted small wide">This replaces the {weights[day]} kg already saved for that day.</p>}
        <button className="btn wide" type="submit" disabled={!valid}>
          Save weight
        </button>
      </form>

      {list.length > 0 && (
        <ul className="list">
          {[...list].reverse().map((w) => (
            <li className="entry" key={w.date}>
              <div className="entry-main">
                <span className="entry-name">{w.kg} kg</span>
                <span className="muted small">{formatDay(w.date)}</span>
              </div>
              <div className="entry-actions">
                <button
                  className="link-btn"
                  onClick={() => {
                    setText(String(w.kg));
                    setDay(w.date);
                  }}
                  aria-label={`Edit weight for ${formatDay(w.date)}`}
                >
                  Edit
                </button>
                <button className="link-btn" onClick={() => onRemove(w.date)} aria-label={`Remove weight for ${formatDay(w.date)}`}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// A simple line chart drawn with SVG. Needs at least two points.
function Trend({ points }) {
  if (points.length < 2) return null;

  const W = 320, H = 150, L = 38, R = 10, T = 14, B = 24;
  const kgs = points.map((p) => p.kg);
  let lo = Math.min(...kgs);
  let hi = Math.max(...kgs);
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;

  const t0 = fromKey(points[0].date).getTime();
  const t1 = fromKey(points.at(-1).date).getTime();
  const x = (d) => L + ((fromKey(d).getTime() - t0) / (t1 - t0)) * (W - L - R);
  const y = (kg) => H - B - ((kg - lo) / (hi - lo)) * (H - T - B);
  const line = points.map((p) => `${x(p.date)},${y(p.kg)}`).join(' ');
  const short = (d) => fromKey(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight trend from ${points[0].kg} to ${points.at(-1).kg} kilograms`}>
      <line x1={L} x2={W - R} y1={y(hi)} y2={y(hi)} className="trend-grid" />
      <line x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} className="trend-grid" />
      <text x={L - 6} y={y(hi) + 4} textAnchor="end" className="trend-label">{round1(hi)}</text>
      <text x={L - 6} y={y(lo) + 4} textAnchor="end" className="trend-label">{round1(lo)}</text>
      <polyline points={line} className="trend-line" />
      {points.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="3" className="trend-dot" />
      ))}
      <text x={L} y={H - 6} className="trend-label">{short(points[0].date)}</text>
      <text x={W - R} y={H - 6} textAnchor="end" className="trend-label">{short(points.at(-1).date)}</text>
    </svg>
  );
}
