// Enable CORS and handle Google OAuth flow (authorize, callback, disconnect, status)
// This function is public for the callback endpoint; other actions require a valid Supabase session JWT

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getRedirectUri() {
  return `${SUPABASE_URL}/functions/v1/google-oauth`;
}

function getSupabase(req: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });
  return supabase;
}

async function getUserId(req: Request) {
  const supabase = getSupabase(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function buildAuthUrl(state: string) {
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar',
    ].join(' '),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function upsertTokensForUser(req: Request, userId: string, tokenResponse: any) {
  const supabase = getSupabase(req);
  const expiryDate = new Date(Date.now() + (tokenResponse.expires_in ?? 3600) * 1000).toISOString();
  const { error } = await supabase.from('google_tokens').upsert({
    user_id: userId,
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token ?? null,
    scope: tokenResponse.scope ?? null,
    token_type: tokenResponse.token_type ?? 'Bearer',
    expiry_date: expiryDate,
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders } });
  }

  try {
    const url = new URL(req.url);
    const supabase = getSupabase(req);

    // 1) OAuth callback (public - no JWT required)
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (code) {
      // The state must contain the user's access token to identify the user
      if (!state) {
        return new Response('Missing state', { status: 400, headers: corsHeaders });
      }
      const redirectUri = getRedirectUri();
      let userId: string | null = null;
      try {
        // Build a client using the state bearer to resolve the user
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${state}` } },
        });
        const { data: { user } } = await client.auth.getUser();
        userId = user?.id ?? null;
      } catch (_) {
        userId = null;
      }
      if (!userId) {
        return new Response('Invalid state/user', { status: 401, headers: corsHeaders });
      }
      // Exchange code and store tokens
      const tokenResponse = await exchangeCodeForTokens(code, redirectUri);
      const fakeReq = new Request(req.url, { headers: new Headers({ Authorization: `Bearer ${state}` }) });
      await upsertTokensForUser(fakeReq, userId, tokenResponse);

      const html = `<!doctype html><html><body style="font-family: sans-serif;">
        <p>Google conectado com sucesso. Você pode fechar esta janela.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'google_oauth', status: 'success' }, '*');
          }
          setTimeout(() => window.close(), 1000);
        </script>
      </body></html>`;
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html', ...corsHeaders } });
    }

    // Body for POST actions
    let body: any = {};
    if (req.method !== 'GET') {
      try { body = await req.json(); } catch (_) { body = {}; }
    } else {
      for (const [k, v] of url.searchParams) body[k] = v;
    }

    const action = body.action || 'status';

    // Require auth for non-callback actions
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (!user || userErr) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'authorize') {
      // Build auth URL encoding the current access token in state
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const authUrl = buildAuthUrl(token);
      return new Response(JSON.stringify({ authUrl }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'disconnect') {
      const { error } = await supabase.from('google_tokens').delete().eq('user_id', user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'status') {
      const { data, error } = await supabase.from('google_tokens').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ connected: !!data, token: data }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    console.error('google-oauth error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
