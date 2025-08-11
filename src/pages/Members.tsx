import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

interface Membro { id: string; full_name: string; email: string | null }

export default function MembersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => { setSEO("Membros | Cuidar+", "Gerencie membros da igreja"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("membros").select("id, full_name, email").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("membros").insert({ full_name: fullName, email: email || null, created_by: userData.user?.id ?? null });
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    setFullName(""); setEmail("");
    toast({ title: "Membro criado" });
    load();
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Membros</h1>
        <p className="text-muted-foreground">Lista e criação de membros (restrito por permissões).</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Novo membro</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Nome completo" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
          <Input placeholder="Email (opcional)" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Button onClick={create} disabled={!fullName}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Membros ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(m => (
              <li key={m.id} className="rounded-md border p-3 flex justify-between">
                <span className="font-medium">{m.full_name}</span>
                <span className="text-sm text-muted-foreground">{m.email}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
