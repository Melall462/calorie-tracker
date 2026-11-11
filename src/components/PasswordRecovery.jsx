import { useState } from 'react';
import { useCloud } from '../lib/CloudContext.js';
import AuthForm from './AuthForm.jsx';
import PasswordField from './PasswordField.jsx';

// Shown instead of the app when someone opens the link in a password-reset email.
//   a working link: choose a new password (they are already signed in by the link)
//   a link that is used up or too old: say so, and let them ask for another
export default function PasswordRecovery() {
  const cloud = useCloud();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const header = (
    <header className="app-header">
      <span className="wordmark">Nutrily</span>
    </header>
  );

  if (cloud.recovery === 'expired') {
    return (
      <>
        {header}
        <main className="onboarding">
          <h1>That link has expired</h1>
          <p className="muted">Email links only work once, and only for a while. Ask for a new one and we&apos;ll send it straight away.</p>
          <AuthForm startIn="reset" />
          <button className="link-btn" onClick={cloud.endRecovery}>
            Back to Nutrily
          </button>
        </main>
      </>
    );
  }

  if (cloud.loading || !cloud.session) {
    return (
      <>
        {header}
        <main className="onboarding">
          <p className="muted" role="status">
            Checking your link…
          </p>
        </main>
      </>
    );
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Use a password with at least 6 characters.');
    if (password !== again) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const result = await cloud.setPassword(password);
      if (result.error) setError(result.error);
      else setDone(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        {header}
        <main className="onboarding">
          <h1>Password changed</h1>
          <p className="muted" role="status">
            Your new password is saved. You&apos;re signed in as {cloud.email}.
          </p>
          <button className="btn" onClick={cloud.endRecovery}>
            Continue to Nutrily
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="onboarding">
        <h1>Choose a new password</h1>
        <p className="muted">For {cloud.email}.</p>
        <form className="pane" onSubmit={save}>
          <PasswordField label="New password" autoComplete="new-password" hint="At least 6 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordField label="Type it again" name="new password again" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
        <button className="link-btn" onClick={cloud.endRecovery}>
          Not now
        </button>
      </main>
    </>
  );
}
