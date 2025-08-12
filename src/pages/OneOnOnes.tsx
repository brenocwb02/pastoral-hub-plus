import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { oneOnOneSchema, type OneOnOneFormData } from "@/lib/validations";
import { formatDateTimeLocal, formatDate } from "@/lib/formatters";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface OneOnOne { id: string; discipulo_membro_id: string; scheduled_at: string; duration_minutes: number | null; notes: string | null }
interface Membro { id: string; full_name: string }

export default function OneOnOnesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<OneOnOneFormData>({
    resolver: zodResolver(oneOnOneSchema),
    defaultValues: {
      discipulo_membro_id: "",
      scheduled_at: formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)), // tomorrow
      duration_minutes: 60,
      notes: "",
    },
  });

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

  async function onSubmit(data: OneOnOneFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Não autenticado", variant: "destructive" });
    
    const startISO = new Date(data.scheduled_at).toISOString();
    const endISO = new Date(new Date(data.scheduled_at).getTime() + data.duration_minutes * 60000).toISOString();
    
    const { error } = await supabase.functions.invoke("calendar-sync", {
      body: { 
        action: "create", 
        type: "1a1", 
        payload: { 
          title: "Encontro 1 a 1", 
          description: data.notes || null, 
          start: startISO, 
          end: endISO, 
          extra: { 
            discipulador_id: user.id, 
            discipulo_membro_id: data.discipulo_membro_id 
          } 
        } 
      }
    });
    
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    form.reset();
    toast({ title: "Encontro criado com sucesso" });
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
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="discipulo_membro_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discípulo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o discípulo" />
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
                  name="scheduled_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e hora *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (min) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={15} 
                          step={15} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre o encontro..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Próximos encontros {loading ? "(carregando...)" : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{formatDate(i.scheduled_at)}</span>
                  <span className="text-sm text-muted-foreground">{i.duration_minutes ?? 60} min</span>
                </div>
                {i.notes && <p className="text-sm mt-1 text-muted-foreground">{i.notes}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
