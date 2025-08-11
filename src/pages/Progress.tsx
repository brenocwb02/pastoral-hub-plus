import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

interface Progresso { id: string; plano_id: string; membro_id: string; status: Database['public']['Enums']['progress_status']; notes: string | null }
interface Membro { id: string; full_name: string }
interface Plano { id: string; title: string }

type ProgressStatus = Database['public']['Enums']['progress_status'];

export default function ProgressPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Progresso[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(false);
  const [membroId, setMembroId] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [status, setStatus] = useState<ProgressStatus>("not_started");
  const [notes, setNotes] = useState("");

  useEffect(() => { setSEO("Progresso | Cuidar+", "Acompanhe progresso dos planos"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("progresso").select("id, plano_id, membro_id, status, notes").order("updated_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    async function fetchRefs() {
      const { data: m } = await supabase.from("membros").select("id, full_name").order("full_name");
      const { data: p } = await supabase.from("planos_estudo").select("id, title").order("title");
      setMembros(m || []);
      setPlanos(p || []);
    }
    fetchRefs();
  }, []);

  async function create() {
    const payload: { membro_id: string; plano_id: string; status: ProgressStatus; notes: string | null } = {
      membro_id: membroId,
      plano_id: planoId,
      status,
      notes: notes || null,
    };
    const { error } = await supabase.from("progresso").insert(payload as any);
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    setNotes("");
    toast({ title: "Progresso criado" });
    load();
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Progresso</h1>
        <p className="text-muted-foreground">Criação e listagem conforme permissões.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Novo progresso</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <select className="border rounded-md h-10 px-3 bg-background" value={membroId} onChange={(e)=>setMembroId(e.target.value)}>
            <option value="">Selecione o membro</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <select className="border rounded-md h-10 px-3 bg-background" value={planoId} onChange={(e)=>setPlanoId(e.target.value)}>
            <option value="">Selecione o plano</option>
            {planos.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select className="border rounded-md h-10 px-3 bg-background" value={status} onChange={(e)=>setStatus(e.target.value as ProgressStatus)}>
            <option value="not_started">Não iniciado</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluído</option>
          </select>
          <Textarea className="sm:col-span-3" placeholder="Notas (opcional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
          <Button onClick={create} disabled={!membroId || !planoId}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">Plano {i.plano_id}</span>
                  <span className="text-sm text-muted-foreground">Membro {i.membro_id}</span>
                </div>
                <div className="text-sm">Status: {i.status}</div>
                {i.notes && <p className="text-sm mt-1">{i.notes}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
