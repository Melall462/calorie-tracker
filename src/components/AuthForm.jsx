import { useEffect, useState } from 'react';
import { useCloud } from '../lib/CloudContext.js';
import PasswordField from './PasswordField.jsx';

const RESEND_SECONDS = 60; // how long before another reset email can be requested (it also protects the free email allowance)

// Sign in or create an account with an email and password, or ask for a link to choose a new password.
//   startIn   'reset' opens on the reset-password form (used when an emailed link has expired)
export default function AuthForm({ onDone, startIn = 'signin' }) {
  const cloud = useCloud();
  const [mode, setMode] = useState(startIn); // signin, signup or reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, error }
  const [sentTo, setSentTo] = useState(null); // the address a reset link was just requested for
  const [wait, setWait] = useState(0); // seconds until another reset email can be requested

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

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

  async function sendReset(e) {
    e.preventDefault();
    if (wait > 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await cloud.resetPassword(email.trim());
      if (result.error) setMessage({ text: result.error, error: true });
      else {
        setSentTo(email.trim());
        setWait(RESEND_SECONDS);
      }
    } catch {
      setMessage({ text: "Couldn't reach the server. Check your connection and try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  // Each form has its own key on purpose. Without it React reuses the "Forgot password?" button as the "Send reset link"
  // submit button in the middle of the same tap, and the browser then submits the form before the person has asked to.
  if (mode === 'reset') {
    return (
      <form key="reset" className="pane" onSubmit={sendReset}>
        <p className="muted">Enter your email and we&apos;ll send you a link to choose a new password.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button className="btn" type="submit" disabled={busy || wait > 0}>
          {busy ? 'Sending…' : wait > 0 ? `Send again in ${wait} s` : sentTo ? 'Send again' : 'Send reset link'}
        </button>
        {sentTo && (
          <p className="note" role="status">
            If there is an account for {sentTo}, a reset link is on its way. Check your inbox and your spam folder. The link works once, and stops working after a while.
          </p>
        )}
        {message && (
          <p className={message.error ? 'error' : 'note'} role="alert">
            {message.text}
          </p>
        )}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode('signin');
            setMessage(null);
            setSentTo(null);
          }}
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form key="auth" className="pane" onSubmit={submit}>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <PasswordField
        label="Password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === 'signin' && (
        <button
          type="button"
          className="link-btn start"
          onClick={() => {
            setMode('reset');
            setMessage(null);
          }}
        >
          Forgot password?
        </button>
      )}
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
