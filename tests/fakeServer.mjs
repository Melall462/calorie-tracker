// An in-memory stand-in for the Supabase project: accounts, sessions, and the sync_units table with the same rules
// the real one has (rows private to their owner, versions, a unique key per user, updated_at set by the server).
export class FakeServer {
  constructor() {
    this.users = new Map(); // email -> { id, password, confirmed }
    this.sessions = new Map(); // token -> userId
    this.rows = new Map(); // userId -> Map(key -> row)
    this.clock = Date.parse('2026-11-12T00:00:00Z');
    this.requireConfirmation = false;
    this.down = false; // simulate being unreachable
    this.log = [];
    this.beforeUpdate = null; // a hook to simulate another device saving at the worst moment
    this.nextId = 1;
    this.hideRowsOnce = false; // make the next fetch look empty, as if a device were out of date
    this.emails = []; // password-reset emails "sent": { to, link }
    this.links = new Map(); // one-time email link -> { userId, used }
    this.resetsAllowed = Infinity; // how many reset emails can be sent before the project's email limit kicks in
  }
  stamp() { this.clock += 1000; return new Date(this.clock).toISOString(); }
  table(userId) { if (!this.rows.has(userId)) this.rows.set(userId, new Map()); return this.rows.get(userId); }
  check() { if (this.down) throw new Error('Failed to fetch'); }

  signUp(email, password) {
    this.check();
    if (this.users.has(email)) return { error: 'User already registered' };
    if (password.length < 6) return { error: 'Password should be at least 6 characters' };
    const id = `user-${this.nextId++}`;
    this.users.set(email, { id, password, confirmed: !this.requireConfirmation });
    return this.requireConfirmation ? { needsConfirmation: true } : this.signIn(email, password);
  }
  confirm(email) { this.users.get(email).confirmed = true; }
  signIn(email, password) {
    this.check();
    const u = this.users.get(email);
    if (!u || u.password !== password) return { error: 'Invalid login credentials' };
    if (!u.confirmed) return { error: 'Email not confirmed' };
    const token = `token-${this.nextId++}`;
    this.sessions.set(token, u.id);
    return { token, user: { id: u.id, email } };
  }
  signOut(token) { this.sessions.delete(token); }

  // ---- forgot password ----
  // Like the real service, the answer is the same whether or not the address has an account (so nobody can use it to
  // find out who is registered), and only a real account is actually sent an email.
  resetPassword(email) {
    this.check();
    if (this.resetsAllowed <= 0) return { error: 'email rate limit exceeded' };
    this.resetsAllowed -= 1;
    const u = this.users.get(email);
    if (u && u.confirmed) {
      const link = `link-${this.nextId++}`;
      this.links.set(link, { userId: u.id, used: false });
      this.emails.push({ to: email, link });
    }
    return {};
  }
  // What happens when someone taps the link in the email. The real service checks the one-time link, then sends the
  // person back to the app with a session in the address (or an error in the address if the link is used up).
  clickEmailLink(link) {
    const entry = this.links.get(link);
    if (!entry || entry.used) return '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    entry.used = true;
    const token = `token-${this.nextId++}`;
    this.sessions.set(token, entry.userId);
    return `#access_token=${token}&refresh_token=r&expires_in=3600&token_type=bearer&type=recovery`;
  }
  // ---- delete account: the password is checked again, then the login goes and, with it, all of their rows (cascade) ----
  deleteAccount(token, password) {
    this.check();
    const who = this.userOf(token);
    if (!who) return { error: 'Sign in again to delete your account.' };
    if (!password) return { error: 'Enter your password to confirm.' };
    const u = this.users.get(who.user.email);
    if (u.password !== password) return { error: 'That password is not right.' };
    this.users.delete(who.user.email);
    for (const [t, id] of [...this.sessions]) if (id === u.id) this.sessions.delete(t);
    this.rows.delete(u.id);
    this.deleted = (this.deleted ?? 0) + 1;
    return {};
  }
  userOf(token) {
    this.check();
    const id = this.sessions.get(token);
    if (!id) return null;
    for (const [email, u] of this.users) if (u.id === id) return { token, user: { id, email } };
    return null;
  }
  setPassword(token, password) {
    this.check();
    const who = this.userOf(token);
    if (!who) return { error: 'Auth session missing!' };
    if (password.length < 6) return { error: 'Password should be at least 6 characters.' };
    const u = this.users.get(who.user.email);
    if (u.password === password) return { error: 'New password should be different from the old password.' };
    u.password = password;
    return {};
  }
  who(token) { this.check(); const id = this.sessions.get(token); if (!id) throw new Error('JWT expired'); return id; }

  // ---- the sync_units table, as a signed-in user sees it (row-level security: only their own rows) ----
  fetchChanged(token, cursor) {
    const stale = this.hideRowsOnce;
    this.hideRowsOnce = false;
    const rows = stale ? [] : [...this.table(this.who(token)).values()].filter((r) => !cursor || r.updated_at > cursor);
    this.log.push(`fetchChanged:${rows.length}`);
    return rows.sort((a, b) => (a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : a.key < b.key ? -1 : 1)).map((r) => structuredClone(r));
  }
  fetchOne(token, key) { const r = this.table(this.who(token)).get(key); return r ? structuredClone(r) : null; }
  insert(token, key, value) {
    const t = this.table(this.who(token));
    if (t.has(key)) { this.log.push(`insert-conflict:${key}`); return { conflict: true }; }
    t.set(key, { key, value: structuredClone(value), version: 1, updated_at: this.stamp() });
    this.log.push(`insert:${key}`);
    return { ok: true, version: 1 };
  }
  update(token, key, value, expected) {
    const userId = this.who(token);
    if (this.beforeUpdate) { const hook = this.beforeUpdate; this.beforeUpdate = null; hook(this, userId, key); }
    const row = this.table(userId).get(key);
    if (!row || row.version !== expected) { this.log.push(`update-conflict:${key}`); return { conflict: true }; }
    row.value = structuredClone(value); row.version = expected + 1; row.updated_at = this.stamp();
    this.log.push(`update:${key}`);
    return { ok: true, version: row.version };
  }

  // The same interface the app's backend wrapper provides, for one signed-in device.
  backendFor(token) {
    const s = this;
    return {
      fetchChanged: async (c) => s.fetchChanged(token, c),
      fetchOne: async (k) => s.fetchOne(token, k),
      insert: async (k, v) => s.insert(token, k, v),
      update: async (k, v, e) => s.update(token, k, v, e),
    };
  }
}
