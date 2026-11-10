import { useState } from 'react';
import { useLocalStorage } from './lib/useLocalStorage.js';
import { todayKey, formatDay } from './lib/dates.js';
import { newId } from './lib/id.js';
import { WATER_MAX, cleanWeights, initialGoals, sanitizeGoals } from './lib/nutrition.js';
import { DEFAULT_PROFILE, cleanProfile } from './lib/calculator.js';
import { cleanMeals } from './lib/recipes.js';
import { EMPTY_PREFERENCES, cleanPreferences } from './lib/preferences.js';
import { PreferencesContext } from './lib/PreferencesContext.js';
import Today from './components/Today.jsx';
import AddFood from './components/AddFood.jsx';
import EditEntry from './components/EditEntry.jsx';
import MealsPage from './components/MealsPage.jsx';
import Account from './components/Account.jsx';
import Onboarding from './components/Onboarding.jsx';
import { hasExistingData } from './lib/onboarding.js';
import Icon from './components/Icon.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'add', label: 'Add food', icon: 'plus' },
  { id: 'meals', label: 'Meals', icon: 'meals' },
  { id: 'account', label: 'Account', icon: 'user' },
];

export default function App() {
  // First-time visitors go through setup. People who already have saved data skip it (see lib/onboarding.js).
  const [onboarded, setOnboarded] = useLocalStorage('nutrily:onboarded', hasExistingData);
  const [setupOpen, setSetupOpen] = useState(false); // setup opened again from the Account page
  const [tab, setTab] = useState('today'); // 'edit' is also a valid value, but it has no tab button
  const [date, setDate] = useState(todayKey());
  const [editingId, setEditingId] = useState(null);
  const [savedGoals, setGoals] = useLocalStorage('nutrily:goals', initialGoals);
  const [entries, setEntries] = useLocalStorage('nutrily:entries', []);
  const [waterByDate, setWaterByDate] = useLocalStorage('nutrily:water', {}); // { "YYYY-MM-DD": millilitres }
  const [savedWeights, setWeights] = useLocalStorage('nutrily:weights', {}); // { "YYYY-MM-DD": kg }
  const [savedMeals, setMeals] = useLocalStorage('nutrily:meals', []); // the recipe book
  const [savedPrefs, setPreferences] = useLocalStorage('nutrily:preferences', EMPTY_PREFERENCES); // diet, allergies, foods liked and avoided
  const [savedProfile, setProfile] = useLocalStorage('nutrily:profile', DEFAULT_PROFILE); // body stats, kept as text

  // Guard against corrupted or hand-edited values in storage.
  const goals = sanitizeGoals(savedGoals);
  const weights = cleanWeights(savedWeights);
  const profile = cleanProfile(savedProfile);
  const meals = cleanMeals(savedMeals);
  const preferences = cleanPreferences(savedPrefs);
  const dayEntries = entries.filter((e) => e.date === date);
  const loggedDates = new Set(entries.map((e) => e.date)); // days that show a dot in the day strip
  const water = Number(waterByDate[date]) || 0;
  const editing = entries.find((e) => e.id === editingId);

  function addEntry(item) {
    setEntries((prev) => [...prev, { ...item, id: newId(), date }]);
    setTab('today');
  }

  function startEdit(id) {
    setEditingId(id);
    setTab('edit');
  }

  function saveEdit(updated) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setDate(updated.date); // jump to the day the entry now lives on
    setEditingId(null);
    setTab('today');
  }

  function cancelEdit() {
    setEditingId(null);
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

  // Saving a meal with an existing id replaces it, otherwise it is added.
  const saveMeal = (meal) => setMeals([...meals.filter((m) => m.id !== meal.id), meal]);
  const deleteMeal = (id) => setMeals(meals.filter((m) => m.id !== id));

  const saveWeight = (day, kg) => setWeights({ ...weights, [day]: kg });
  const removeWeight = (day) => {
    const copy = { ...weights };
    delete copy[day];
    setWeights(copy);
  };

  function finishSetup({ profile: answers, preferences: chosen, targets, weightKg }) {
    setProfile(answers);
    setPreferences(chosen);
    setGoals({ ...goals, ...targets });
    saveWeight(todayKey(), weightKg);
    setOnboarded(true);
    setSetupOpen(false);
    setDate(todayKey());
    setTab('today');
  }

  function skipSetup() {
    setOnboarded(true);
    setSetupOpen(false);
  }

  const activeTab = tab === 'edit' ? 'today' : tab;

  if (onboarded !== true || setupOpen) {
    return <Onboarding initialProfile={profile} initialPreferences={preferences} replay={onboarded === true} onFinish={finishSetup} onSkip={skipSetup} />;
  }

  return (
    <PreferencesContext.Provider value={preferences}>
      <header className="app-header">
        <span className="wordmark">Nutrily</span>
      </header>

      <main>
        {tab === 'today' && (
          <Today
            date={date}
            setDate={setDate}
            loggedDates={loggedDates}
            entries={dayEntries}
            goals={goals}
            water={water}
            onWaterChange={changeWater}
            onAddFood={() => setTab('add')}
            onEdit={startEdit}
            onRemove={removeEntry}
          />
        )}
        {tab === 'edit' && editing && <EditEntry key={editing.id} entry={editing} onSave={saveEdit} onCancel={cancelEdit} />}
        {tab === 'add' && (
          <AddFood dayLabel={formatDay(date)} onAdd={addEntry} meals={meals} onSaveMeal={saveMeal} onDeleteMeal={deleteMeal} />
        )}
        {tab === 'meals' && (
          <MealsPage dayLabel={formatDay(date)} meals={meals} onAdd={addEntry} onSaveMeal={saveMeal} onDeleteMeal={deleteMeal} />
        )}
        {tab === 'account' && (
          <Account
            goals={goals}
            onSaveGoals={setGoals}
            profile={profile}
            setProfile={setProfile}
            weights={weights}
            onSaveWeight={saveWeight}
            onRemoveWeight={removeWeight}
            preferences={preferences}
            onChangePreferences={setPreferences}
            onRunSetup={() => setSetupOpen(true)}
          />
        )}
      </main>

      <nav className="nav" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === 'add' ? 'nav-item add' : 'nav-item'}
            onClick={() => setTab(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon name={t.icon} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </PreferencesContext.Provider>
  );
}
