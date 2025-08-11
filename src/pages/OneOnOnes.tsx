import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

interface OneOnOne { id: string; discipulo_membro_id: string; scheduled_at: string; duration_minutes: number | null; notes: string | null }
interface Membro { id: string; full_name: string }

export default function OneOnOnesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(false);
  const [membroId, setMembroId] = useState("");
  const [when, setWhen] = useState<string>(new Date().toISOString().slice(0,16));
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState("");

  useEffect(() => { setSEO("Encontros 1 a 1 | Cuidar+", "Gerencie encontros 1 a 1"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("encontros_1a1").select("id, discipulo_membro_id, scheduled_at, duration_minutes, notes").order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    async function loadMembros() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("membros").select("id, full_name").eq("discipulador_id", user.id).order("full_name");
      if (error) return;
      setMembros(data || []);
    }
    loadMembros();
  }, []);

  async function create() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Não autenticado", variant: "destructive" });
    // cria também no Google via edge function
    const startISO = new Date(when).toISOString();
    const endISO = new Date(new Date(when).getTime() + duration*60000).toISOString();
    const { error } = await supabase.functions.invoke("calendar-sync", {
      body: { action: "create", type: "1a1", payload: { title: "Encontro 1 a 1", description: notes || null, start: startISO, end: endISO, extra: { discipulador_id: user.id, discipulo_membro_id: membroId } } }
    });
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    setMembroId(""); setNotes("");
    toast({ title: "Encontro criado" });
    load();
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Encontros 1 a 1</h1>
        <p className="text-muted-foreground">Lista e criação de encontros (requer permissões).</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Novo encontro</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3">
          <select className="border rounded-md h-10 px-3 bg-background" value={membroId} onChange={(e)=>setMembroId(e.target.value)}>
            <option value="">Selecione o discípulo</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <Input type="datetime-local" value={when} onChange={(e)=>setWhen(e.target.value)} />
          <Input type="number" min={15} step={15} value={duration} onChange={(e)=>setDuration(parseInt(e.target.value||"60"))} />
          <Input placeholder="Notas (opcional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
          <Button onClick={create} disabled={!membroId}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Próximos encontros {loading ? "(carregando...)" : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{new Date(i.scheduled_at).toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">{i.duration_minutes ?? 60} min</span>
                </div>
                {i.notes && <p className="text-sm mt-1">{i.notes}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
