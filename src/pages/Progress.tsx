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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";

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
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Progresso | null>(null);
  
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

  const handleDialogOpen = (item: Progresso | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({
        membro_id: item.membro_id,
        plano_id: item.plano_id,
        status: item.status,
        notes: item.notes || "",
      });
    } else {
      form.reset({
        membro_id: "",
        plano_id: "",
        status: "not_started",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: ProgressFormData) {
    const payload: { 
      membro_id: string; 
      plano_id: string; 
      status: ProgressStatus; 
      notes: string | null;
      updated_at?: string;
    } = {
      membro_id: data.membro_id,
      plano_id: data.plano_id,
      status: data.status as ProgressStatus,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingItem) {
      ({ error } = await supabase.from("progresso").update(payload).eq("id", editingItem.id));
    } else {
      ({ error } = await supabase.from("progresso").insert(payload as any));
    }

    if (error) {
      toast({ title: `Erro ao ${editingItem ? 'atualizar' : 'criar'}`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Progresso ${editingItem ? 'atualizado' : 'criado'} com sucesso` });
      setDialogOpen(false);
      form.reset();
      load();
    }
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from("progresso").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao excluir progresso", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Progresso excluído com sucesso" });
      load();
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Progresso</h1>
          <p className="text-muted-foreground">Criação e listagem conforme permissões.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Progresso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Progresso" : "Novo Progresso"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
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
                </div>
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
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader><CardTitle>Registros ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="rounded-md border p-3 flex justify-between items-center">
                  <div>
                    <div className="flex justify-between">
                      <span className="font-medium">{item.planos_estudo?.title || `Plano ${item.plano_id}`}</span>
                      <span className="text-sm text-muted-foreground">{item.membros?.full_name || `Membro ${item.membro_id}`}</span>
                    </div>
                    <div className="text-sm">Status: {item.status === 'not_started' ? 'Não iniciado' : item.status === 'in_progress' ? 'Em andamento' : 'Concluído'}</div>
                    {item.notes && <p className="text-sm mt-1">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o progresso "{item.planos_estudo?.title || 'N/A'}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
