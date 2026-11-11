// Supabase Edge Function (Deno): permanently deletes the signed-in person's account.
//
// Deploy: supabase functions deploy delete-account        (it uses the project's built-in keys, no secret to add)
//
// Why a function: only the project's admin (service role) key can delete a login, and that key must never be in the app.
// The person is identified by their own sign-in token, and must type their password again, so an unattended phone that
// is still signed in cannot delete the account. Deleting the login also deletes their rows in sync_units and ai_usage
// automatically (both tables are set to "on delete cascade").
import { createClient } from 'npm:@supabase/supabase-js@2';
import { deleteAccount } from './logic.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await userClient.auth.getUser();
    const body = await req.json().catch(() => null);

    const result = await deleteAccount({
      user: user ? { id: user.id, email: user.email ?? '' } : null,
      password: body?.password,
      // Check the password with a separate, throwaway client, so the person's own session is left alone.
      checkPassword: async (email: string, password: string) => {
        const checker = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { error } = await checker.auth.signInWithPassword({ email, password });
        if (!error) return 'ok';
        if (error.status === 429 || /rate limit|too many/i.test(error.message)) return 'limited';
        if (error.status === 400 || /invalid login/i.test(error.message)) return 'wrong';
        console.error('Password check failed', error.status, error.message);
        return 'unavailable';
      },
      deleteUser: async (id: string) => {
        const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) {
          console.error('Could not delete the account', error.status, error.message);
          return false;
        }
        return true;
      },
    });
    if (result.ok) console.log('An account was deleted');
    return json(result.ok ? { ok: true } : { error: result.error }, result.status);
  } catch (err) {
    console.error(err);
    return json({ error: "Your account couldn't be deleted. Nothing was changed, so try again in a moment." }, 500);
  }
});
