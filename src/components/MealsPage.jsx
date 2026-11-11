import { useState } from 'react';
import { MEALS, defaultMeal } from '../lib/meals.js';
import MealsPane from './MealsPane.jsx';
import MealBuilder from './MealBuilder.jsx';
import Planner from './Planner.jsx';
import PlanGenerator from './PlanGenerator.jsx';

// Your recipe book and your meal planner, with AI planning behind a button.
export default function MealsPage({ dayLabel, meals, goals, plan, planActions, onAdd, onSaveMeal, onDeleteMeal, onGenerated }) {
  const [view, setView] = useState('recipes'); // recipes, plan or generate
  const [focus, setFocus] = useState(null); // a day to show when the planner opens (after generating)
  const [slot, setSlot] = useState(defaultMeal()); // breakfast, lunch, dinner or snack
  const [building, setBuilding] = useState(undefined); // undefined: not building, null: a new meal, object: editing that meal

  if (building !== undefined) {
    return (
      <MealBuilder
        meal={building}
        onCancel={() => setBuilding(undefined)}
        onSave={(meal) => {
          onSaveMeal(meal);
          setBuilding(undefined);
        }}
      />
    );
  }

  const slotLabel = MEALS.find((m) => m.id === slot).label;

  return (
    <>
      <h1>Meals</h1>
      <div className="segmented" role="group" aria-label="Meals sections">
        <button onClick={() => setView('recipes')} aria-pressed={view === 'recipes'}>
          Recipes
        </button>
        <button onClick={() => setView('plan')} aria-pressed={view !== 'recipes'}>
          Planner
        </button>
      </div>

      {view === 'recipes' && (
        <>
          <p className="muted">Your saved meals. Adding to {dayLabel}.</p>
          <label className="field">
            <span>Meal time</span>
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {MEALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <MealsPane
            meals={meals}
            slotLabel={slotLabel}
            onNew={() => setBuilding(null)}
            onEdit={(meal) => setBuilding(meal)}
            onDelete={onDeleteMeal}
            onLog={(item) => onAdd({ ...item, meal: slot, source: 'meal' })}
          />
        </>
      )}

      {view === 'plan' && (
        <div className="pane">
          <Planner
            key={focus ?? 'now'}
            plan={plan}
            meals={meals}
            goals={goals}
            focus={focus}
            onAdd={planActions.add}
            onRemove={planActions.remove}
            onServings={planActions.servings}
            onLog={planActions.log}
            onUndo={planActions.undo}
            onClearWeek={planActions.clear}
            onGenerate={() => setView('generate')}
          />
        </div>
      )}

      {view === 'generate' && (
        <div className="pane">
          <PlanGenerator
            goals={goals}
            meals={meals}
            onCancel={() => setView('plan')}
            onDone={(result) => {
              onGenerated(result);
              setFocus(result.start ?? null);
              setView(result.items.length > 0 ? 'plan' : 'recipes');
            }}
          />
        </div>
      )}
    </>
  );
}
