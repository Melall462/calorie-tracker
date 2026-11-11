// Supabase Edge Function (Deno): writes meals for the planner using the Anthropic API.
//
// Deploy:   supabase functions deploy plan-meals
// Secret:   supabase secrets set ANTHROPIC_API_KEY=your-key      (or Dashboard > Edge Functions > Secrets)
// Optional: ANTHROPIC_MODEL (defaults below). The key never leaves the server.
//
// Only signed-in users can call it, each can make DAILY_LIMIT calls a day (see the ai_usage migration), and the
// request is validated and trimmed before anything is sent to the model.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPrompt, readReply, validateRequest } from './plan.js';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5';
const DAILY_LIMIT = 40; // a week-long plan uses 7
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
    // 1. Who is asking? Signed-in users only.
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Sign in to use AI planning.' }, 401);

    // 2. Is the request sensible?
    const checked = validateRequest(await req.json().catch(() => null));
    if (!checked.ok) return json({ error: checked.error }, 400);

    // 3. Is the AI set up at all? (Checked before counting a use.)
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI planning is not set up yet.' }, 503);

    // 4. Daily limit per person, to keep costs under control.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: uses, error: usageError } = await admin.rpc('increment_ai_usage', { p_user: user.id });
    if (usageError) throw usageError;
    if (uses > DAILY_LIMIT) {
      return json({ error: `You have used all ${DAILY_LIMIT} AI requests for today. Try again tomorrow.` }, 429);
    }

    // 5. Ask the model.
    const { system, user: prompt } = buildPrompt(checked.value);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) {
      console.error('Anthropic API error', res.status, await res.text());
      return json({ error: 'The AI service is not available right now. Try again in a moment.' }, 502);
    }
    const data = await res.json();
    const text = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    return json(readReply(text));
  } catch (err) {
    console.error(err);
    return json({ error: 'Could not read the plan the AI wrote. Try again.' }, 502);
  }
});
