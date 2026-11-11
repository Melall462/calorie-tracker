import { useState } from 'react';
import { useFoods } from '../lib/FoodsContext.js';
import { usePreferences } from '../lib/PreferencesContext.js';
import { hasFoodRules, productTags } from '../lib/preferences.js';
import ProductCard from './ProductCard.jsx';

// Add food > Search: the foods you have scanned or typed in, most recently used first. Nothing is shown until you
// have scanned something, because the point is quick access to YOUR foods, not a generic list.
export default function MyFoodsPane({ onAdd, onScan, onCustom, notice = '', addLabel = 'Add food' }) {
  const prefs = usePreferences();
  const { foods, touch, forget } = useFoods();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [onlyFits, setOnlyFits] = useState(true);

  if (foods.length === 0) {
    return (
      <div className="pane">
        {notice && (
          <p className="note" role="status">
            {notice}
          </p>
        )}
        <div className="empty">
          <p>Nothing saved yet.</p>
          <p className="muted small">Scan a food and it is kept here, so next time you can find it in one tap. If a barcode isn&apos;t in the database, you can add it yourself and it is saved too.</p>
        </div>
        <button type="button" className="btn" onClick={onScan}>
          Scan a food
        </button>
        {onCustom && (
          <button type="button" className="link-btn start" onClick={onCustom}>
            Or add a food by hand
          </button>
        )}
      </div>
    );
  }

  const rules = hasFoodRules(prefs);
  const q = query.trim().toLowerCase();
  const matches = foods
    .filter((f) => `${f.name} ${f.brand}`.toLowerCase().includes(q))
    .map((food) => ({ food, tags: productTags(food, prefs) }));
  const shown = rules && onlyFits ? matches.filter((m) => m.tags.flags.length === 0) : matches;
  const hidden = matches.length - shown.length;
  const kcal = (f) => (f.perServing ? `${f.perServing.calories} kcal` : `${f.per100.calories} kcal`);
  const basis = (f) => (f.perServing ? (f.servingText ? `per serving (${f.servingText})` : 'per serving') : `per 100 ${f.unit}`);

  return (
    <div className="pane">
      {notice && (
        <p className="note" role="status">
          {notice}
        </p>
      )}

      {foods.length > 5 && (
        <label className="field">
          <span>Search your foods</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Yoghurt, bread…" />
        </label>
      )}

      {rules && (
        <label className="check">
          <input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} />
          <span>Only show foods that fit my diet and allergies</span>
        </label>
      )}
      {rules && onlyFits && hidden > 0 && (
        <p className="muted small" role="status">
          {hidden} {hidden === 1 ? 'food is' : 'foods are'} hidden by your preferences.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="muted">{matches.length > 0 ? 'Nothing that fits your preferences matches that. Switch the filter off to see everything.' : 'No saved food matches that.'}</p>
      ) : (
        <ul className="list">
          {shown.map(({ food, tags }) => {
            const open = openId === food.id;
            return (
              <li key={food.id} id={`food-${food.id}`} className="result">
                <button
                  type="button"
                  className="result-btn"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenId(open ? null : food.id);
                    setConfirmId(null);
                  }}
                >
                  <span>
                    <span className="entry-name">{food.name}</span>
                    <span className="muted small block">{[food.brand, basis(food)].filter(Boolean).join(', ')}</span>
                    {(tags.flags.length > 0 || tags.traces.length > 0 || food.custom) && (
                      <span className="tag-line">
                        {tags.flags.map((w) => (
                          <span key={w} className="tag warn">
                            {w}
                          </span>
                        ))}
                        {tags.traces.map((w) => (
                          <span key={w} className="tag">
                            {w}
                          </span>
                        ))}
                        {food.custom && <span className="tag">Added by you</span>}
                      </span>
                    )}
                  </span>
                  <strong>{kcal(food)}</strong>
                </button>

                {open && (
                  <div className="result-panel">
                    <ProductCard
                      key={food.id}
                      product={food}
                      addLabel={addLabel}
                      showTitle={false}
                      onCustom={onCustom ? () => onCustom(food.name, food.code) : undefined}
                      onAdd={(item) => {
                        onAdd(item);
                        touch(food.id);
                        setOpenId(null);
                      }}
                    />
                    <div className="meal-actions">
                      {confirmId === food.id ? (
                        <>
                          <span className="small">Remove it from your foods?</span>
                          <button
                            className="link-btn danger"
                            onClick={() => {
                              forget(food.id);
                              setConfirmId(null);
                              setOpenId(null);
                            }}
                          >
                            Yes, remove
                          </button>
                          <button className="link-btn" onClick={() => setConfirmId(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button className="link-btn" onClick={() => setConfirmId(food.id)} aria-label={`Remove ${food.name} from my foods`}>
                          Remove from my foods
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rules && <p className="muted small">Tags come from the product database. If you have an allergy, always check the label.</p>}
    </div>
  );
}
