import { useState } from 'react';
import { scaleProduct, scaleServings } from '../lib/barcode.js';
import { toNumber } from '../lib/meals.js';
import { round1 } from '../lib/nutrition.js';
import { usePreferences } from '../lib/PreferencesContext.js';
import { scanWarnings } from '../lib/preferences.js';

// How the entry will read in the log, for example "2 servings (30 g)" or "150 g".
function servingLabel(product, mode, qty) {
  if (mode !== 'servings') return `${qty} ${product.unit}`;
  const word = qty === 1 ? 'serving' : 'servings';
  if (product.servingAmount) return `${qty} ${word} (${round1(qty * product.servingAmount)} ${product.unit})`;
  return product.servingText ? `${qty} ${word} (${product.servingText})` : `${qty} ${word}`;
}

const ROWS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

// The nutrition panel as the pack prints it: one column per serving and one per 100 g (or ml), when they exist.
function NutritionTable({ product }) {
  const serving = product.servingText || (product.servingAmount ? `${product.servingAmount} ${product.unit}` : '');
  return (
    <table className="nutrition-table">
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Nutrient</span>
          </th>
          {product.perServing && (
            <th scope="col">
              Per serving
              {serving && <span className="th-sub">{serving}</span>}
            </th>
          )}
          {product.per100 && <th scope="col">Per 100 {product.unit}</th>}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            {product.perServing && <td>{product.perServing[row.key]}{row.unit === 'g' ? ' g' : ''}</td>}
            {product.per100 && <td>{product.per100[row.key]}{row.unit === 'g' ? ' g' : ''}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// A product (scanned, or saved in My foods): warnings for the person's allergies and diet, the nutrition, how much
// they ate, and an Add button. Give it a `key` that changes with the product so the amount starts fresh.
//   onAdd({ name, serving, calories, protein, carbs, fat })
//   onCustom(name, code)   offered when the product has no calorie information
export default function ProductCard({ product, addLabel = 'Add food', onAdd, onCustom, customLabel = 'Add it as a custom food', showTitle = true, note = null }) {
  const prefs = usePreferences();
  const [mode, setMode] = useState(product.perServing ? 'servings' : 'amount'); // the pack's own serving size, or grams/ml
  const [amount, setAmount] = useState(product.perServing ? '1' : '100');
  const warnings = scanWarnings(product, prefs);
  const qty = toNumber(amount);

  // Either set of values can be missing (a pack may list only one), so only scale what exists.
  let totals = null;
  if (qty) {
    if (mode === 'servings' && product.perServing) totals = scaleServings(product, qty);
    else if (mode === 'amount' && product.per100) totals = scaleProduct(product, qty);
  }

  // Switching between servings and grams keeps the same amount of food, when the pack's serving size is known.
  function switchMode(next) {
    if (next === mode) return;
    const size = product.servingAmount;
    if (size && qty) setAmount(String(next === 'amount' ? round1(qty * size) : Math.round((qty / size) * 100) / 100));
    else setAmount(next === 'amount' ? '100' : '1');
    setMode(next);
  }

  function add() {
    if (!totals) return;
    onAdd({
      name: product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase()) ? `${product.name} (${product.brand})` : product.name,
      serving: servingLabel(product, mode, qty),
      ...totals,
    });
  }

  return (
    <div className="product-card">
      {showTitle && <h2>{product.name}</h2>}
      {showTitle && product.brand && <p className="muted">{product.brand}</p>}
      {note}

      {warnings.flags.map((text) => (
        <p key={text} className="note alert" role="alert">
          {text}
        </p>
      ))}
      {warnings.traces.map((text) => (
        <p key={text} className="note" role="status">
          {text}
        </p>
      ))}
      {warnings.notes.map((text) => (
        <p key={text} className="note" role="status">
          {text}
        </p>
      ))}
      {warnings.disliked && <p className="note">This is on your list of foods you would rather avoid.</p>}
      {warnings.reminder && !product.custom && <p className="muted small">Nutrily can&apos;t confirm that a product is free of your allergens. Always read the label.</p>}

      {!product.hasNutrition ? (
        <>
          <p className="note">This product has no calorie information in the database. You can add it yourself from the label.</p>
          {onCustom && (
            <button type="button" className="btn secondary" onClick={() => onCustom(product.name, product.code)}>
              {customLabel}
            </button>
          )}
        </>
      ) : (
        <>
          <NutritionTable product={product} />

          {product.perServing && product.per100 && (
            <div className="segmented" role="group" aria-label="How you want to enter the amount">
              <button type="button" onClick={() => switchMode('servings')} aria-pressed={mode === 'servings'}>
                Servings
              </button>
              <button type="button" onClick={() => switchMode('amount')} aria-pressed={mode === 'amount'}>
                {product.unit === 'ml' ? 'Millilitres' : 'Grams'}
              </button>
            </div>
          )}

          <label className="field compact">
            <span>{mode === 'servings' ? 'Servings you ate' : `Amount you ate (${product.unit})`}</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {mode === 'servings' && !product.custom && (product.servingText || product.servingAmount) && (
              <small className="hint">One serving is {product.servingText || `${product.servingAmount} ${product.unit}`}, as listed on the pack.</small>
            )}
          </label>
          <p className="muted small">
            {totals ? `${totals.calories} kcal` : '0 kcal'} &nbsp; P {totals ? totals.protein : 0} g &nbsp; C {totals ? totals.carbs : 0} g &nbsp; F{' '}
            {totals ? totals.fat : 0} g
          </p>
          <button type="button" className="btn" onClick={add} disabled={!totals}>
            {addLabel}
          </button>
        </>
      )}

      {product.custom ? (
        <p className="muted small">Typed in by you. Check it against the pack.</p>
      ) : (
        <p className="muted small">
          Data from{' '}
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
            Open Food Facts
          </a>
          , a community database. Check it against the pack.
        </p>
      )}
    </div>
  );
}
