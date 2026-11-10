import { useState } from 'react';
import { useCloud } from '../lib/CloudContext.js';
import AuthForm from './AuthForm.jsx';

// The account panel at the top of the Account page. Shows nothing at all when cloud sync is not set up.
export default function CloudCard() {
  const cloud = useCloud();
  const [formOpen, setFormOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState('');

  if (!cloud.available) return null;

  if (cloud.loading) {
    return (
      <section className="cloud card" aria-label="Account sync">
        <p className="muted">Checking your account…</p>
      </section>
    );
  }

  if (!cloud.session) {
    return (
      <section className="cloud card" aria-label="Account sync">
        <h2>Back up and sync</h2>
        <p className="muted">Create an account to keep your data safe and use Nutrily on your other devices. Everything works without one.</p>
        {formOpen ? (
          <AuthForm onDone={() => setFormOpen(false)} />
        ) : (
          <button className="btn" onClick={() => setFormOpen(true)}>
            Sign in or create account
          </button>
        )}
      </section>
    );
  }

  const syncing = cloud.status === 'syncing';
  let statusText = 'Waiting to sync…';
  if (syncing) statusText = 'Syncing…';
  else if (cloud.status === 'error') statusText = `Couldn't sync. ${cloud.error}`;
  else if (cloud.lastSynced) statusText = `Synced at ${cloud.lastSynced.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;

  async function clearDevice() {
    setProblem('');
    const result = await cloud.signOutAndClear();
    if (result.error) {
      setProblem(result.error);
      setConfirming(false);
    }
  }

  return (
    <section className="cloud card" aria-label="Account sync">
      <h2>Signed in</h2>
      <p className="cloud-email">{cloud.email}</p>
      <p className={cloud.status === 'error' ? 'error' : 'muted small'} role="status">
        {statusText}
      </p>
      <div className="cloud-actions">
        <button className="btn secondary" onClick={cloud.syncNow} disabled={syncing}>
          Sync now
        </button>
        <button className="link-btn" onClick={cloud.signOut}>
          Sign out
        </button>
      </div>

      {confirming ? (
        <div className="cloud-confirm">
          <p className="small">This removes your data from this device. It stays in your account, and you can sign back in to get it again.</p>
          <div className="meal-actions">
            <button className="link-btn danger" onClick={clearDevice}>
              Yes, sign out and clear
            </button>
            <button className="link-btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="link-btn" onClick={() => setConfirming(true)}>
          Sign out and clear this device
        </button>
      )}
      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}
