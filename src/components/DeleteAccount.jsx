import { useState } from 'react';
import { useCloud } from '../lib/CloudContext.js';
import { downloadExport } from '../lib/exportData.js';
import PasswordField from './PasswordField.jsx';

// The confirmation screen for deleting an account. It explains exactly what goes, offers a copy of the data first, and
// asks for the password again so that a phone left signed in cannot delete the account.
//   onCancel()    go back
//   onDeleted()   the account is gone
export default function DeleteAccount({ onCancel, onDeleted }) {
  const cloud = useCloud();
  const [password, setPassword] = useState('');
  const [clearDevice, setClearDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copySaved, setCopySaved] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await cloud.deleteAccount(password, { clearDevice });
      if (result.error) setError(result.error);
      else onDeleted?.();
    } catch {
      setError("Couldn't reach the server. Nothing was changed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="delete-account" onSubmit={submit}>
      <h2>Delete your account</h2>
      <p>
        This permanently deletes <strong>{cloud.email}</strong> and everything stored in the cloud for it:
      </p>
      <ul className="small">
        <li>your login (email and password)</li>
        <li>your food diary, weight, water, recipes, meal plans, saved foods, targets and preferences</li>
        <li>your AI planning usage</li>
      </ul>
      <p className="note alert">This can&apos;t be undone, and nobody can get it back for you.</p>
      <p className="muted small">The data on this device stays here unless you tick the box below, and Nutrily keeps working on this device without an account.</p>

      <button
        type="button"
        className="btn secondary"
        onClick={() => {
          try {
            setCopySaved(`Saved ${downloadExport()} to your downloads.`);
          } catch {
            setCopySaved("Couldn't save a copy. You can still cancel and try again.");
          }
        }}
      >
        Download a copy of my data first
      </button>
      {copySaved && (
        <p className="muted small" role="status">
          {copySaved}
        </p>
      )}

      <label className="check">
        <input type="checkbox" checked={clearDevice} onChange={(e) => setClearDevice(e.target.checked)} />
        <span>Also clear the data on this device</span>
      </label>

      <PasswordField label="Your password" name="your password" autoComplete="current-password" hint="Type it again to confirm." value={password} onChange={(e) => setPassword(e.target.value)} />

      <button className="btn danger" type="submit" disabled={busy || password === ''}>
        {busy ? 'Deleting…' : 'Delete my account permanently'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="link-btn" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </form>
  );
}
