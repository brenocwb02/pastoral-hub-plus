import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { studyPlanSchema, type StudyPlanFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";

interface Plano { 
  id: string; 
  title: string; 
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function PlansPage() {
  const { toast } = useToast();
  const { roles } = useUserRoles();
  const isPastor = roles.includes('pastor');
  const [items, setItems] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Plano | null>(null);
  
  const form = useForm<StudyPlanFormData>({
    resolver: zodResolver(studyPlanSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => { setSEO("Planos de estudo | Cuidar+", "Gerencie planos de estudo"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("planos_estudo").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDialogOpen = (item: Plano | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({
        title: item.title,
        description: item.description || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: StudyPlanFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      title: data.title,
      description: data.description || null,
      created_by: editingItem ? undefined : user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingItem) {
      ({ error } = await supabase.from("planos_estudo").update(payload).eq("id", editingItem.id));
    } else {
      ({ error } = await supabase.from("planos_estudo").insert(payload));
    }

    if (error) {
      toast({ title: `Erro ao ${editingItem ? 'atualizar' : 'criar'}`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Plano ${editingItem ? 'atualizado' : 'criado'} com sucesso` });
      setDialogOpen(false);
      form.reset();
      load();
    }
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from("planos_estudo").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao excluir plano", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano excluído com sucesso" });
      load();
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Planos de estudo</h1>
          <p className="text-muted-foreground">Visível para todos; criação restrita.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)} disabled={!isPastor}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Plano" : "Novo Plano"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input placeholder="Fundamentos da Fé" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva o conteúdo e objetivos do plano de estudo..." {...field} />
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
        <CardHeader><CardTitle>Planos ({items.length})</CardTitle></CardHeader>
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
                    <div className="font-medium">{item.title}</div>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item)} disabled={!isPastor}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!isPastor}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o plano "{item.title}".
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
