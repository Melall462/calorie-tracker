import { useId, useState } from 'react';

// A password box with a Show/Hide button, so people can check what they typed (easy to get wrong on a phone).
// The label is only the field's name and the hint sits outside it, so screen readers read it cleanly.
//   name   what the button refers to, for example "new password" gives "Show new password"
export default function PasswordField({ label, name = label.toLowerCase(), value, onChange, autoComplete, hint, minLength = 6 }) {
  const id = useId();
  const [shown, setShown] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          minLength={minLength}
          value={value}
          onChange={onChange}
          aria-describedby={hint ? `${id}-hint` : undefined}
          required
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={`${shown ? 'Hide' : 'Show'} ${name}`}
          onMouseDown={(e) => e.preventDefault()} // keep the cursor in the box, so the keyboard stays up on a phone
          onClick={() => setShown((s) => !s)}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && (
        <small className="hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
    </div>
  );
}
