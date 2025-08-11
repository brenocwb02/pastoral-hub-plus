import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import GoogleCalendarConnect from "@/components/google/GoogleCalendarConnect";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

interface Meeting { id: string; title: string; description: string | null; location: string | null; scheduled_at: string }

export default function MeetingsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState<string>(new Date().toISOString().slice(0,16));
  const { connected, createGeneral } = useGoogleCalendar();

  useEffect(() => { setSEO("Reuniões gerais | Cuidar+", "Gerencie reuniões gerais integradas ao Google"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("reunioes_gerais").select("id, title, description, location, scheduled_at").order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    try {
      const startISO = new Date(when).toISOString();
      const endISO = new Date(new Date(when).getTime() + 60*60000).toISOString();
      await createGeneral({ title, description, location, start: startISO, end: endISO });
      setTitle(""); setDescription(""); setLocation("");
      toast({ title: "Reunião criada (Google + local)" });
      load();
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message || String(e), variant: "destructive" });
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Reuniões gerais</h1>
        <p className="text-muted-foreground">Integradas ao Google Calendar.</p>
      </header>

      <GoogleCalendarConnect />

      <Card>
        <CardHeader><CardTitle>Nova reunião</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Título" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <Input placeholder="Local (opcional)" value={location} onChange={(e)=>setLocation(e.target.value)} />
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e)=>setDescription(e.target.value)} className="sm:col-span-2" />
          <Input type="datetime-local" value={when} onChange={(e)=>setWhen(e.target.value)} />
          <Button onClick={create} disabled={!connected || !title}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reuniões ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-sm text-muted-foreground">{new Date(i.scheduled_at).toLocaleString()}</span>
                </div>
                {i.location && <p className="text-sm text-muted-foreground">Local: {i.location}</p>}
                {i.description && <p className="text-sm mt-1">{i.description}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
