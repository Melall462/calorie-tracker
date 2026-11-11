// The only file that knows about Supabase. Everything else talks to the small interface returned by loadBackend():
//
//   getSession()              the signed-in session { user: { id, email } }, or null
//   onAuthChange(callback)    called with (session, event) whenever someone signs in or out; returns a function that stops listening
//   signIn(email, password)   { error? }
//   signUp(email, password)   { error?, needsConfirmation? }
//   signOut()
//   resetPassword(email)      emails a link for choosing a new password: { error? }
//   setPassword(password)     sets a new password for the signed-in account: { error? }
//   fetchChanged(cursor)      rows from sync_units changed after `cursor` (all of them if null)
//   fetchOne(key)             one row, or null
//   insert(key, value)        { ok, version } or { conflict: true } if the row already exists
//   update(key, value, v)     { ok, version } or { conflict: true } if the stored version is no longer `v`
//   invokePlanner(payload)    asks the AI planner (an Edge Function) for meals; resolves to { meals }, throws a plain-language Error
//
// Cloud sync is optional: with no project URL and key configured, loadBackend() returns null and the app simply
// stays on this device. The Supabase library is only downloaded when it is configured.

const URL_KEY = import.meta.env?.VITE_SUPABASE_URL;
const PUBLIC_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
const PAGE = 500;

const toSession = (s) => ({ user: { id: s.user.id, email: s.user.email ?? '' } });

const authMessage = (error) => {
  const text = String(error?.message ?? '').toLowerCase();
  if (text.includes('invalid login')) return 'That email and password do not match.';
  if (text.includes('not confirmed')) return 'Confirm your email first. Check your inbox for the link, then sign in.';
  if (text.includes('already registered') || text.includes('already been registered')) return 'That email already has an account. Try signing in.';
  if (text.includes('at least') && text.includes('character')) return 'Use a password with at least 6 characters.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (text.includes('fetch') || text.includes('network')) return "Couldn't reach the server. Check your connection and try again.";
  return error?.message || 'Something went wrong. Try again.';
};

// What went wrong choosing a new password, in plain words.
const passwordMessage = (error) => {
  const text = String(error?.message ?? '').toLowerCase();
  if (text.includes('different from the old')) return 'Your new password must be different from your old one.';
  if (text.includes('session') || text.includes('jwt') || text.includes('expired') || text.includes('not authenticated')) return 'That link has expired. Go back and ask for a new one.';
  if (text.includes('weak') || text.includes('easy to guess') || text.includes('pwned') || text.includes('compromised')) return 'That password is too easy to guess. Try a longer one, or mix in numbers.';
  return authMessage(error);
};

const problem = (error) => {
  const text = String(error?.message ?? '').toLowerCase();
  return new Error(
    text.includes('fetch') || text.includes('network') || text.includes('failed to load')
      ? "Couldn't reach your account. Check your connection and try again."
      : 'The server had a problem. Try again in a moment.'
  );
};

export function wrap(client) {
  const columns = 'key,value,version,updated_at';
  return {
    async getSession() {
      const { data } = await client.auth.getSession();
      return data.session ? toSession(data.session) : null;
    },
    onAuthChange(callback) {
      const { data } = client.auth.onAuthStateChange((event, session) => callback(session ? toSession(session) : null, event));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return error ? { error: authMessage(error) } : {};
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) return { error: authMessage(error) };
      return { needsConfirmation: !data.session }; // with "Confirm email" on, there is no session until the link is used
    },
    async signOut() {
      await client.auth.signOut();
    },
    async resetPassword(email) {
      // The link in the email brings the person back to this site, which must be in the project's allowed redirect URLs.
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (!error) return {}; // the same answer whether or not an account exists, so nobody can use this to find out who has one
      const text = String(error.message ?? '').toLowerCase();
      if (text.includes('rate limit') || text.includes('too many') || text.includes('seconds')) return { error: 'Too many reset emails were requested. Wait a while and try again.' };
      return { error: authMessage(error) };
    },
    async setPassword(password) {
      const { error } = await client.auth.updateUser({ password });
      return error ? { error: passwordMessage(error) } : {};
    },
    async fetchChanged(cursor) {
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from('sync_units')
          .select(columns)
          .order('updated_at', { ascending: true })
          .order('key', { ascending: true })
          .range(from, from + PAGE - 1);
        if (cursor) query = query.gt('updated_at', cursor);
        const { data, error } = await query;
        if (error) throw problem(error);
        rows.push(...data);
        if (data.length < PAGE) break;
      }
      return rows;
    },
    async fetchOne(key) {
      const { data, error } = await client.from('sync_units').select(columns).eq('key', key).maybeSingle();
      if (error) throw problem(error);
      return data;
    },
    async insert(key, value) {
      const { data, error } = await client.from('sync_units').insert({ key, value, version: 1 }).select('version').single();
      if (error) {
        if (error.code === '23505') return { conflict: true }; // someone created it first
        throw problem(error);
      }
      return { ok: true, version: data.version };
    },
    async invokePlanner(payload) {
      const { data, error } = await client.functions.invoke('plan-meals', { body: payload });
      if (error) {
        let message = 'AI planning is not available right now. Try again in a moment.';
        try {
          const body = await error.context.json(); // the function's own explanation, such as "daily limit reached"
          if (body?.error) message = body.error;
        } catch {
          /* keep the general message */
        }
        throw new Error(message);
      }
      return data;
    },
    async update(key, value, expectedVersion) {
      const { data, error } = await client
        .from('sync_units')
        .update({ value, version: expectedVersion + 1 })
        .eq('key', key)
        .eq('version', expectedVersion)
        .select('version');
      if (error) throw problem(error);
      if (!data || data.length === 0) return { conflict: true }; // the stored version moved on
      return { ok: true, version: data[0].version };
    },
  };
}

export async function loadBackend() {
  // A seam for tests: a page can supply its own backend (an in-memory fake) instead of Supabase.
  if (globalThis.__NUTRILY_BACKEND__) return globalThis.__NUTRILY_BACKEND__;
  if (!URL_KEY || !PUBLIC_KEY) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return wrap(createClient(URL_KEY, PUBLIC_KEY));
}
