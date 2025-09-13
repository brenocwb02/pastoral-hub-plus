import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { progressSchema, type ProgressFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Progresso { 
  id: string; 
  plano_id: string; 
  membro_id: string; 
  status: Database['public']['Enums']['progress_status']; 
  notes: string | null;
  membros?: { id: string; full_name: string } | null;
  planos_estudo?: { id: string; title: string } | null;
}
interface Membro { id: string; full_name: string }
interface Plano { id: string; title: string }

type ProgressStatus = Database['public']['Enums']['progress_status'];

export default function ProgressPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Progresso[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<ProgressFormData>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      membro_id: "",
      plano_id: "",
      status: "not_started",
      notes: "",
    },
  });

  useEffect(() => { setSEO("Progresso | Cuidar+", "Acompanhe progresso dos planos"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("progresso")
      .select(`
        id, plano_id, membro_id, status, notes,
        membros!membro_id(id, full_name),
        planos_estudo!plano_id(id, title)
      `)
      .order("updated_at", { ascending: false });
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

  async function onSubmit(data: ProgressFormData) {
    const payload: { 
      membro_id: string; 
      plano_id: string; 
      status: ProgressStatus; 
      notes: string | null 
    } = {
      membro_id: data.membro_id,
      plano_id: data.plano_id,
      status: data.status as ProgressStatus,
      notes: data.notes || null,
    };
    const { error } = await supabase.from("progresso").insert(payload as any);
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    form.reset();
    toast({ title: "Progresso criado com sucesso" });
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
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="membro_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membro *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o membro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {membros.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plano_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o plano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {planos.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="not_started">Não iniciado</SelectItem>
                          <SelectItem value="in_progress">Em andamento</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre o progresso..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Criando..." : "Criar"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{i.planos_estudo?.title || `Plano ${i.plano_id}`}</span>
                  <span className="text-sm text-muted-foreground">{i.membros?.full_name || `Membro ${i.membro_id}`}</span>
                </div>
                <div className="text-sm">Status: {i.status === 'not_started' ? 'Não iniciado' : i.status === 'in_progress' ? 'Em andamento' : 'Concluído'}</div>
                {i.notes && <p className="text-sm mt-1">{i.notes}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
