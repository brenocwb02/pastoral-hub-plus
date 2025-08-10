// Calendar synchronization and CRUD bridging between Supabase and Google Calendar
// Auth required for all actions. Uses tokens stored in public.google_tokens

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabase(req: Request) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
}

async function getUserAndToken(req: Request) {
  const supabase = getSupabase(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  const { data: tokenRow, error: tokenErr } = await supabase.from('google_tokens').select('*').eq('user_id', user.id).maybeSingle();
  if (tokenErr) throw tokenErr;
  if (!tokenRow) throw new Error('Google not connected');
  return { supabase, user, tokenRow } as const;
}

async function refreshAccessToken(tokenRow: any) {
  if (!tokenRow.refresh_token) return tokenRow.access_token;
  const expiry = tokenRow.expiry_date ? new Date(tokenRow.expiry_date).getTime() : 0;
  if (Date.now() < expiry - 60_000) return tokenRow.access_token; // still valid
  // refresh
  const params = new URLSearchParams({
    client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    refresh_token: tokenRow.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Failed to refresh token');
  const json = await res.json();
  const newExpiry = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();
  return { access_token: json.access_token, expiry_date: newExpiry } as const;
}

async function ensureAccessToken(req: Request) {
  const { supabase, user, tokenRow } = await getUserAndToken(req);
  const refreshed = await refreshAccessToken(tokenRow as any);
  if (typeof refreshed === 'string') {
    return { supabase, user, accessToken: refreshed } as const;
  } else {
    // persist new token
    const { error } = await supabase
      .from('google_tokens')
      .update({ access_token: refreshed.access_token, expiry_date: refreshed.expiry_date })
      .eq('user_id', user.id);
    if (error) throw error;
    return { supabase, user, accessToken: refreshed.access_token } as const;
  }
}

function toISO(dt: string | Date) {
  return (typeof dt === 'string' ? new Date(dt) : dt).toISOString();
}

function buildEventPayload(e: any) {
  return {
    summary: e.title ?? 'Evento Cuidar+',
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    start: { dateTime: toISO(e.start), timeZone: e.timeZone ?? 'UTC' },
    end: { dateTime: toISO(e.end), timeZone: e.timeZone ?? 'UTC' },
  };
}

async function googleFetch(accessToken: string, path: string, init?: RequestInit) {
  const base = 'https://www.googleapis.com/calendar/v3';
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders } });
  }
  try {
    const { supabase, accessToken } = await ensureAccessToken(req);
    const { action, rangeStart, rangeEnd, type, payload, id } = await req.json().catch(() => ({}));

    if (action === 'list') {
      // Fetch Google events in range
      const params = new URLSearchParams();
      if (rangeStart) params.set('timeMin', toISO(rangeStart));
      if (rangeEnd) params.set('timeMax', toISO(rangeEnd));
      params.set('singleEvents', 'true');
      params.set('orderBy', 'startTime');
      const g = await googleFetch(accessToken, `/calendars/primary/events?${params.toString()}`);

      // Fetch local events in range
      const [oneOnOnes, meetings] = await Promise.all([
        supabase.from('encontros_1a1').select('*').gte('scheduled_at', toISO(rangeStart || new Date(0))).lte('scheduled_at', toISO(rangeEnd || new Date(Date.now()+90*86400000))),
        supabase.from('reunioes_gerais').select('*').gte('scheduled_at', toISO(rangeStart || new Date(0))).lte('scheduled_at', toISO(rangeEnd || new Date(Date.now()+90*86400000))),
      ]);

      return new Response(
        JSON.stringify({
          google: g.items ?? [],
          oneOnOnes: oneOnOnes.data ?? [],
          generalMeetings: meetings.data ?? [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (action === 'create') {
      // payload: { type: '1a1'|'geral', title, description, location, start, end, timeZone, extra }
      const body = buildEventPayload(payload);
      const created = await googleFetch(accessToken, `/calendars/primary/events`, { method: 'POST', body: JSON.stringify(body) });
      if (type === '1a1') {
        const { error } = await supabase.from('encontros_1a1').insert({
          discipulador_id: payload.extra?.discipulador_id,
          discipulo_membro_id: payload.extra?.discipulo_membro_id,
          scheduled_at: toISO(payload.start),
          duration_minutes: Math.round((new Date(payload.end).getTime() - new Date(payload.start).getTime())/60000),
          notes: payload.description ?? null,
          google_event_id: created.id,
        });
        if (error) throw error;
      } else if (type === 'geral') {
        const { error } = await supabase.from('reunioes_gerais').insert({
          title: payload.title ?? 'Reunião',
          description: payload.description ?? null,
          location: payload.location ?? null,
          scheduled_at: toISO(payload.start),
          google_event_id: created.id,
        });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ ok: true, google: created }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'update') {
      // id: google_event_id, payload with updates and local mapping
      const updated = await googleFetch(accessToken, `/calendars/primary/events/${id}`, { method: 'PATCH', body: JSON.stringify(buildEventPayload(payload)) });
      if (payload.local && payload.local.table && payload.local.pk) {
        if (payload.local.table === 'encontros_1a1') {
          const { error } = await supabase.from('encontros_1a1').update({
            scheduled_at: toISO(payload.start),
            duration_minutes: Math.round((new Date(payload.end).getTime() - new Date(payload.start).getTime())/60000),
            notes: payload.description ?? null,
          }).eq('id', payload.local.pk);
          if (error) throw error;
        }
        if (payload.local.table === 'reunioes_gerais') {
          const { error } = await supabase.from('reunioes_gerais').update({
            title: payload.title ?? 'Reunião',
            description: payload.description ?? null,
            location: payload.location ?? null,
            scheduled_at: toISO(payload.start),
          }).eq('id', payload.local.pk);
          if (error) throw error;
        }
      }
      return new Response(JSON.stringify({ ok: true, google: updated }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'delete') {
      // id: google_event_id
      await googleFetch(accessToken, `/calendars/primary/events/${id}`, { method: 'DELETE' });
      if (payload?.local && payload.local.table && payload.local.pk) {
        const table = payload.local.table;
        const { error } = await supabase.from(table).delete().eq('id', payload.local.pk);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'sync') {
      // Minimal: If local rows have google_event_id, update them with Google details
      const [oneOnOnes, meetings] = await Promise.all([
        supabase.from('encontros_1a1').select('id, google_event_id').not('google_event_id', 'is', null),
        supabase.from('reunioes_gerais').select('id, google_event_id').not('google_event_id', 'is', null),
      ]);
      const ids = [
        ...(oneOnOnes.data ?? []).map((r: any) => ({ table: 'encontros_1a1', id: r.id, eid: r.google_event_id })),
        ...(meetings.data ?? []).map((r: any) => ({ table: 'reunioes_gerais', id: r.id, eid: r.google_event_id })),
      ];
      for (const row of ids) {
        try {
          const ev = await googleFetch(accessToken, `/calendars/primary/events/${row.eid}`);
          const start = ev.start?.dateTime || ev.start?.date;
          const end = ev.end?.dateTime || ev.end?.date;
          if (row.table === 'encontros_1a1') {
            const { error } = await supabase.from('encontros_1a1').update({
              scheduled_at: toISO(start),
              duration_minutes: end ? Math.round((new Date(end).getTime() - new Date(start).getTime())/60000) : 60,
              notes: ev.description ?? null,
            }).eq('id', row.id);
            if (error) console.error('sync update 1a1', error);
          } else {
            const { error } = await supabase.from('reunioes_gerais').update({
              title: ev.summary ?? 'Reunião',
              description: ev.description ?? null,
              location: ev.location ?? null,
              scheduled_at: toISO(start),
            }).eq('id', row.id);
            if (error) console.error('sync update geral', error);
          }
        } catch (e) {
          console.error('sync fetch google event failed', e);
        }
      }
      return new Response(JSON.stringify({ ok: true, updated: ids.length }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    console.error('calendar-sync error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
