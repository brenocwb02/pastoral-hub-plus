import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

interface Casa { id: string; nome: string; endereco: string | null }

export default function HousesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");

  useEffect(() => { setSEO("Casas | Cuidar+", "Gerencie casas e líderes"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("casas").select("id, nome, endereco").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("casas").insert({ nome, endereco: endereco || null, leader_id: user?.id ?? null, created_by: user?.id ?? null });
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    setNome(""); setEndereco("");
    toast({ title: "Casa criada" });
    load();
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Casas</h1>
        <p className="text-muted-foreground">Lista e criação de casas (restrito por permissões).</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Nova casa</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Nome" value={nome} onChange={(e)=>setNome(e.target.value)} />
          <Input placeholder="Endereço (opcional)" value={endereco} onChange={(e)=>setEndereco(e.target.value)} />
          <Button onClick={create} disabled={!nome}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Casas ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(m => (
              <li key={m.id} className="rounded-md border p-3">
                <div className="font-medium">{m.nome}</div>
                <div className="text-sm text-muted-foreground">{m.endereco}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
