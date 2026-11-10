import { useState } from 'react';
import { useLocalStorage } from './lib/useLocalStorage.js';
import { todayKey, formatDay } from './lib/dates.js';
import { newId } from './lib/id.js';
import { WATER_MAX, initialGoals, sanitizeGoals } from './lib/nutrition.js';
import Today from './components/Today.jsx';
import AddFood from './components/AddFood.jsx';
import Goals from './components/Goals.jsx';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'add', label: 'Add food' },
  { id: 'goals', label: 'Goals' },
];

export default function App() {
  const [tab, setTab] = useState('today');
  const [date, setDate] = useState(todayKey());
  const [savedGoals, setGoals] = useLocalStorage('nutrily:goals', initialGoals);
  const [entries, setEntries] = useLocalStorage('nutrily:entries', []);
  const [waterByDate, setWaterByDate] = useLocalStorage('nutrily:water', {}); // { "YYYY-MM-DD": millilitres }

  // Guard against a corrupted or hand-edited value in storage.
  const goals = sanitizeGoals(savedGoals);
  const dayEntries = entries.filter((e) => e.date === date);
  const water = Number(waterByDate[date]) || 0;

  function addEntry(item) {
    setEntries((prev) => [...prev, { ...item, id: newId(), date }]);
    setTab('today');
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function changeWater(delta) {
    setWaterByDate((prev) => {
      const next = Math.min(WATER_MAX, Math.max(0, (Number(prev[date]) || 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[date];
      else copy[date] = next;
      return copy;
    });
  }

  return (
    <>
      <header className="app-header">
        <span className="wordmark">Nutrily</span>
      </header>

      <main>
        {tab === 'today' && (
          <Today
            date={date}
            setDate={setDate}
            entries={dayEntries}
            goals={goals}
            water={water}
            onWaterChange={changeWater}
            onAddFood={() => setTab('add')}
            onRemove={removeEntry}
          />
        )}
        {tab === 'add' && <AddFood dayLabel={formatDay(date)} onAdd={addEntry} />}
        {tab === 'goals' && <Goals goals={goals} onSave={setGoals} />}
      </main>

      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
