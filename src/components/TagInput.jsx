import { useState } from 'react';
import { MAX_TERMS, MAX_TERM_LENGTH } from '../lib/preferences.js';

// Type a food and press Enter (or Add) to make it a tag. Commas add several at once.
export default function TagInput({ label, hint, placeholder, items, onChange }) {
  const [text, setText] = useState('');

  function commit() {
    const parts = text.split(',').map((t) => t.trim().slice(0, MAX_TERM_LENGTH)).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...items];
    for (const part of parts) {
      if (next.length >= MAX_TERMS) break;
      if (!next.some((t) => t.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next);
    setText('');
  }

  return (
    <div className="tag-input">
      <div className="tag-row">
        <label className="field grow">
          <span>{label}</span>
          <input
            value={text}
            placeholder={placeholder}
            maxLength={120}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                commit();
              }
            }}
          />
        </label>
        <button type="button" className="btn secondary add-tag" onClick={commit} disabled={!text.trim()} aria-label={`Add to ${label}`}>
          Add
        </button>
      </div>
      {hint && <p className="hint">{hint}</p>}
      {items.length > 0 && (
        <ul className="tags">
          {items.map((t) => (
            <li key={t}>
              <span>{t}</span>
              <button type="button" onClick={() => onChange(items.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
