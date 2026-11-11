import { ALLERGENS, DIETS } from '../lib/preferences.js';
import TagInput from './TagInput.jsx';

// A row of options you can switch on and off (diet, allergies).
function CheckGroup({ legend, hint, options, selected, onToggle }) {
  return (
    <fieldset className="check-group">
      <legend>{legend}</legend>
      {hint && <p className="hint">{hint}</p>}
      <div className="pill-checks">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <label key={o.id} className={on ? 'pill-check on' : 'pill-check'}>
              <input type="checkbox" checked={on} onChange={() => onToggle(o.id)} />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

// Diet, allergies, and foods you love or would rather avoid. Fully controlled: the parent decides when to save.
export default function FoodPreferences({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="pane">
      <CheckGroup
        legend="Eating style"
        options={DIETS}
        selected={value.diets}
        onToggle={(id) => set({ diets: toggle(value.diets, id) })}
        hint="Pick any that apply, or none."
      />
      <CheckGroup
        legend="Allergies and intolerances"
        options={ALLERGENS}
        selected={value.avoid}
        onToggle={(id) => set({ avoid: toggle(value.avoid, id) })}
      />
      <TagInput
        label="Foods you love"
        placeholder="salmon, rice, bananas"
        items={value.likes}
        onChange={(likes) => set({ likes })}
        hint="These show first when you search."
      />
      <TagInput
        label="Foods you'd rather avoid"
        placeholder="mushrooms, liver"
        items={value.dislikes}
        onChange={(dislikes) => set({ dislikes })}
        hint="These move to the bottom of your search results."
      />
      <p className="muted small">
        Saved on this device only. Nutrily uses your diet and allergies to tidy food search and to flag scanned products. It checks vegetarian, vegan and
        allergen information, but it can&apos;t check halal, kosher or pescatarian status, and it can never promise a food is safe. If you have an
        allergy, always read the label.
      </p>
    </div>
  );
}
