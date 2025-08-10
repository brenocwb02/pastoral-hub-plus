import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EventSource = "google" | "1a1" | "geral";
export type CalendarEvent = {
  id: string;
  source: EventSource;
  title: string;
  description?: string | null;
  location?: string | null;
  start: string; // ISO
  end: string;   // ISO
  google_event_id?: string | null;
  local?: { table: "encontros_1a1" | "reunioes_gerais"; pk: string };
};

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("google-oauth", {
      body: { action: "status" },
    });
    if (error) {
      setError(error.message);
      setConnected(false);
    } else {
      setConnected(!!data?.connected);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Listen for popup callback
  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      if (ev?.data?.type === "google_oauth" && ev.data.status === "success") {
        refreshStatus();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [refreshStatus]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("google-oauth", {
      body: { action: "authorize" },
    });
    setLoading(false);
    if (error) return setError(error.message);
    const url = data?.authUrl;
    if (url) {
      window.open(url, "_blank", "width=480,height=720");
    }
  }, []);

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.functions.invoke("google-oauth", {
      body: { action: "disconnect" },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setConnected(false);
  }, []);

  const listEvents = useCallback(async (rangeStart: string, rangeEnd: string) => {
    const { data, error } = await supabase.functions.invoke("calendar-sync", {
      body: { action: "list", rangeStart, rangeEnd },
    });
    if (error) throw error;
    const items: CalendarEvent[] = [];
    (data?.google ?? []).forEach((g: any) => {
      const start = g.start?.dateTime || g.start?.date;
      const end = g.end?.dateTime || g.end?.date || start;
      items.push({
        id: g.id,
        source: "google",
        title: g.summary || "(sem título)",
        description: g.description,
        location: g.location,
        start,
        end,
        google_event_id: g.id,
      });
    });
    (data?.oneOnOnes ?? []).forEach((r: any) => {
      const start = r.scheduled_at;
      const end = new Date(new Date(start).getTime() + (r.duration_minutes ?? 60) * 60000).toISOString();
      items.push({
        id: r.id,
        source: "1a1",
        title: "Encontro 1 a 1",
        description: r.notes,
        start,
        end,
        google_event_id: r.google_event_id,
        local: { table: "encontros_1a1", pk: r.id },
      });
    });
    (data?.generalMeetings ?? []).forEach((r: any) => {
      const start = r.scheduled_at;
      const end = new Date(new Date(start).getTime() + 60 * 60000).toISOString();
      items.push({
        id: r.id,
        source: "geral",
        title: r.title ?? "Reunião",
        description: r.description,
        location: r.location,
        start,
        end,
        google_event_id: r.google_event_id,
        local: { table: "reunioes_gerais", pk: r.id },
      });
    });
    return items;
  }, []);

  const createGeneral = useCallback(async (payload: {
    title: string;
    description?: string;
    location?: string;
    start: string; // ISO
    end: string;   // ISO
    timeZone?: string;
  }) => {
    const { error } = await supabase.functions.invoke("calendar-sync", {
      body: { action: "create", type: "geral", payload },
    });
    if (error) throw error;
  }, []);

  const syncNow = useCallback(async () => {
    const { error } = await supabase.functions.invoke("calendar-sync", {
      body: { action: "sync" },
    });
    if (error) throw error;
  }, []);

  return {
    connected,
    loading,
    error,
    connect,
    disconnect,
    refreshStatus,
    listEvents,
    createGeneral,
    syncNow,
  } as const;
}
