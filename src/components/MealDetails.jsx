import { portion, scaleAmount, stepsOf } from '../lib/recipes.js';

// What you need and how to make it, for one recipe. `servings` is how many servings to show amounts for (the whole
// recipe if left out). `onOpenRecipe` adds a line saying the recipe is in the recipe book, with a button to go to it.
export default function MealDetails({ meal, servings, onOpenRecipe }) {
  const shown = servings ?? meal.servings;
  const factor = shown / meal.servings;
  const per = portion(meal, 1);
  const steps = stepsOf(meal.notes);

  return (
    <div className="meal-details">
      <h4>What you need</h4>
      <p className="muted small">
        For {shown} {shown === 1 ? 'serving' : 'servings'}
        {meal.servings !== 1 ? `, the recipe makes ${meal.servings}` : ''}
      </p>
      <ul className="ingredient-list">
        {meal.ingredients.map((i) => (
          <li key={i.id}>
            <span>{i.name}</span>
            <span className="muted">{scaleAmount(i.serving, factor)}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Per serving: {per.calories} kcal &nbsp; P {per.protein} g &nbsp; C {per.carbs} g &nbsp; F {per.fat} g
      </p>

      <h4>How to make it</h4>
      {steps ? (
        <ol className="method-steps">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : meal.notes ? (
        <p className="notes">{meal.notes}</p>
      ) : (
        <p className="muted small">No instructions are saved for this recipe. You can add some by editing it in your recipe book.</p>
      )}

      {meal.ai && <p className="note">Written by the AI. Check the ingredients against your allergies before you cook it.</p>}

      {onOpenRecipe && (
        <p className="book-line small">
          <span className="tag book">In your recipe book</span>
          <button className="link-btn" onClick={() => onOpenRecipe(meal.id)} aria-label={`Open ${meal.name} in your recipe book`}>
            Open in recipe book
          </button>
        </p>
      )}
    </div>
  );
}
