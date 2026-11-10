import Summary from './Summary.jsx';
import Water from './Water.jsx';
import { formatDay, shiftDay, todayKey } from '../lib/dates.js';
import { MEALS } from '../lib/meals.js';
import { round1, sumEntries } from '../lib/nutrition.js';

export default function Today({ date, setDate, entries, goals, water, onWaterChange, onAddFood, onRemove }) {
  const totals = sumEntries(entries);
  const isToday = date === todayKey();

  return (
    <>
      <div className="daynav">
        <button className="icon-btn" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <h1>{formatDay(date)}</h1>
        <button className="icon-btn" onClick={() => setDate(shiftDay(date, 1))} disabled={isToday} aria-label="Next day">
          ›
        </button>
      </div>

      <Summary totals={totals} goals={goals} />
      <Water amount={water} goal={goals.water} onChange={onWaterChange} />

      {entries.length === 0 ? (
        <div className="empty">
          <p>Nothing logged for this day yet.</p>
          <button className="btn" onClick={onAddFood}>
            Add food
          </button>
        </div>
      ) : (
        MEALS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal.id);
          if (items.length === 0) return null;
          return (
            <section className="meal" key={meal.id}>
              <div className="meal-head">
                <h2>{meal.label}</h2>
                <span className="muted">{Math.round(sumEntries(items).calories).toLocaleString()} kcal</span>
              </div>
              <ul className="list">
                {items.map((e) => (
                  <li className="entry" key={e.id}>
                    <div className="entry-main">
                      <span className="entry-name">{e.name}</span>
                      {e.serving && <span className="muted small">{e.serving}</span>}
                      <span className="muted small">
                        P {round1(e.protein || 0)} g &nbsp; C {round1(e.carbs || 0)} g &nbsp; F {round1(e.fat || 0)} g
                      </span>
                    </div>
                    <div className="entry-side">
                      <strong>{e.calories}</strong>
                      <button className="link-btn" onClick={() => onRemove(e.id)} aria-label={`Remove ${e.name}`}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
