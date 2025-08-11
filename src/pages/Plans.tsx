import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

interface Plano { id: string; title: string; description: string | null }

export default function PlansPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { setSEO("Planos de estudo | Cuidar+", "Gerencie planos de estudo"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("planos_estudo").select("id, title, description").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("planos_estudo").insert({ title, description: description || null, created_by: user?.id ?? null });
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    setTitle(""); setDescription("");
    toast({ title: "Plano criado" });
    load();
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Planos de estudo</h1>
        <p className="text-muted-foreground">Visível para todos; criação restrita.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Novo plano</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Título" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e)=>setDescription(e.target.value)} className="sm:col-span-2" />
          <Button onClick={create} disabled={!title}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Planos ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="font-medium">{i.title}</div>
                {i.description && <p className="text-sm mt-1">{i.description}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
