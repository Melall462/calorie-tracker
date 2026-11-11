// Links in emails (password reset, sign-up confirmation) bring the person back to the app with details in the address.
// The Supabase library reads those and then clears them from the address bar, and it can announce a password-reset
// link before the app is listening. So the app reads the address itself, first, before the library loads.

// Set while someone is in the middle of choosing a new password, so a page reload does not lose their place.
export const RECOVERY_FLAG = 'nutrily:recovering';

const parse = (text) => {
  try {
    return new URLSearchParams(String(text ?? '').replace(/^[#?]/, ''));
  } catch {
    return new URLSearchParams();
  }
};

// 'recovery' for a valid password-reset link, 'expired' for a link that was already used or has run out, otherwise null.
export function readEmailLink(hash = '', search = '') {
  const h = parse(hash);
  const q = parse(search);
  const get = (key) => h.get(key) ?? q.get(key);
  if (get('type') === 'recovery' && (h.get('access_token') || q.get('code') || q.get('token_hash'))) return 'recovery';
  const code = String(get('error_code') ?? '').toLowerCase();
  const error = String(get('error') ?? '').toLowerCase();
  if (code === 'otp_expired' || (error === 'access_denied' && get('error_description'))) return 'expired';
  return null;
}

// Take the tokens out of the address bar once they have been dealt with, so they are not left in history.
export function cleanLinkFromUrl() {
  try {
    if (window.history?.replaceState) window.history.replaceState(null, '', window.location.pathname);
  } catch {
    /* not important */
  }
}
