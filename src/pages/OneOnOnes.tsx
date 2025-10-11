import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";

interface OneOnOne { 
  id: string; 
  discipulo_membro_id: string; 
  scheduled_at: string; 
  duration_minutes: number | null; 
  notes: string | null;
  membros?: { id: string; full_name: string } | null;
}
interface Membro { id: string; full_name: string }

export default function OneOnOnesPage() {
  const { toast } = useToast();
  const { roles } = useUserRoles();
  const canCreate = roles.includes('pastor') || roles.includes('discipulador');
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OneOnOne | null>(null);
  
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
    const { data, error } = await supabase
      .from("encontros_1a1")
      .select(`
        id, discipulo_membro_id, scheduled_at, duration_minutes, notes,
        membros!discipulo_membro_id(id, full_name)
      `)
      .order("scheduled_at", { ascending: false });
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

  const handleDialogOpen = (item: OneOnOne | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({
        discipulo_membro_id: item.discipulo_membro_id,
        scheduled_at: formatDateTimeLocal(new Date(item.scheduled_at)),
        duration_minutes: item.duration_minutes || 60,
        notes: item.notes || "",
      });
    } else {
      form.reset({
        discipulo_membro_id: "",
        scheduled_at: formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        duration_minutes: 60,
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: OneOnOneFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Não autenticado", variant: "destructive" });
    
    if (editingItem) {
      // Atualizar encontro existente
      const payload = {
        discipulo_membro_id: data.discipulo_membro_id,
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        duration_minutes: data.duration_minutes,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("encontros_1a1").update(payload).eq("id", editingItem.id);
      
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Encontro atualizado com sucesso" });
        setDialogOpen(false);
        load();
      }
    } else {
      // Criar novo encontro via edge function
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
      
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        form.reset();
        toast({ title: "Encontro criado com sucesso" });
        setDialogOpen(false);
        load();
      }
    }
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from("encontros_1a1").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao excluir encontro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Encontro excluído com sucesso" });
      load();
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Encontros 1 a 1</h1>
          <p className="text-muted-foreground">Lista e criação de encontros (requer permissões).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)} disabled={!canCreate}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Encontro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Encontro" : "Novo Encontro"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <CardHeader><CardTitle>Próximos encontros</CardTitle></CardHeader>
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
                      <span className="font-medium">{formatDate(item.scheduled_at)}</span>
                      <span className="text-sm text-muted-foreground">{item.duration_minutes ?? 60} min</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.membros?.full_name || `Membro ${item.discipulo_membro_id}`}
                    </div>
                    {item.notes && <p className="text-sm mt-1 text-muted-foreground">{item.notes}</p>}
                  </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item)} disabled={!canCreate}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!canCreate}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente este encontro.
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
