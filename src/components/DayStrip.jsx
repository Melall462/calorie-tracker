import { useEffect, useMemo, useRef } from 'react';
import { fromKey, shiftDay, todayKey } from '../lib/dates.js';

const DAYS_BACK = 59; // two months of days to scroll through
const MAX_BACK = 365;

// A horizontally scrolling row of days. Tap one to view that day. A dot means something was logged.
export default function DayStrip({ selected, onSelect, logged }) {
  const today = todayKey();
  const listRef = useRef(null);
  const firstRender = useRef(true);

  const days = useMemo(() => {
    const normalStart = shiftDay(today, -DAYS_BACK);
    // If the selected day is older (for example after moving an entry), stretch the strip back to include it.
    const start = selected < normalStart ? (selected < shiftDay(today, -MAX_BACK) ? shiftDay(today, -MAX_BACK) : selected) : normalStart;
    const list = [];
    for (let d = start; d <= today; d = shiftDay(d, 1)) list.push(d);
    return list;
  }, [selected, today]);

  // Keep the selected day centred. Jump on first load, glide afterwards.
  useEffect(() => {
    const el = listRef.current?.querySelector('[aria-current="date"]');
    if (el) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: firstRender.current ? 'auto' : 'smooth' });
    firstRender.current = false;
  }, [selected]);

  return (
    <div className="days" ref={listRef} role="group" aria-label="Choose a day">
      {days.map((d) => {
        const date = fromKey(d);
        const full = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
        const isToday = d === today;
        return (
          <button
            key={d}
            className={isToday ? 'day is-today' : 'day'}
            onClick={() => onSelect(d)}
            aria-current={d === selected ? 'date' : undefined}
            aria-label={isToday ? `${full}, today` : full}
          >
            <span className="day-name">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            <span className="day-num">{date.getDate()}</span>
            <span className={logged.has(d) ? 'day-dot on' : 'day-dot'} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
