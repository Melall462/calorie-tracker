import { useState } from 'react';
import { useCloud } from '../lib/CloudContext.js';

// Sign in or create an account with an email and password.
export default function AuthForm({ onDone }) {
  const cloud = useCloud();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, error }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = mode === 'signin' ? await cloud.signIn(email.trim(), password) : await cloud.signUp(email.trim(), password);
      if (result.error) setMessage({ text: result.error, error: true });
      else if (result.needsConfirmation) {
        setMessage({ text: 'Check your email for a confirmation link, then come back and sign in.' });
        setMode('signin');
        setPassword('');
      } else onDone?.();
    } catch {
      setMessage({ text: "Couldn't reach the server. Check your connection and try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="pane" onSubmit={submit}>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === 'signup' && <small className="hint">At least 6 characters.</small>}
      </label>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      {message && (
        <p className={message.error ? 'error' : 'note'} role="alert">
          {message.text}
        </p>
      )}
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setMessage(null);
        }}
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
