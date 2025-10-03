import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { houseSchema, type HouseFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";

interface Casa { 
  id: string; 
  nome: string; 
  endereco: string | null;
  leader_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function HousesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Casa | null>(null);
  
  const form = useForm<HouseFormData>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      nome: "",
      endereco: "",
    },
  });

  useEffect(() => { setSEO("Igrejas no Lar | Cuidar+", "Gerencie igrejas no lar e líderes"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("casas").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDialogOpen = (item: Casa | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({
        nome: item.nome,
        endereco: item.endereco || "",
      });
    } else {
      form.reset({
        nome: "",
        endereco: "",
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: HouseFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      nome: data.nome,
      endereco: data.endereco || null,
      leader_id: user?.id ?? null,
      created_by: editingItem ? undefined : user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingItem) {
      ({ error } = await supabase.from("casas").update(payload).eq("id", editingItem.id));
    } else {
      ({ error } = await supabase.from("casas").insert(payload));
    }

    if (error) {
      toast({ title: `Erro ao ${editingItem ? 'atualizar' : 'criar'}`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Casa ${editingItem ? 'atualizada' : 'criada'} com sucesso` });
      setDialogOpen(false);
      form.reset();
      load();
    }
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from("casas").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao excluir casa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Casa excluída com sucesso" });
      load();
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Igrejas no Lar</h1>
          <p className="text-muted-foreground">Lista e criação de igrejas no lar (restrito por permissões).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Igreja no Lar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Igreja no Lar" : "Nova Igreja no Lar"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Igreja no Lar Central" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua das Flores, 123 - Centro" {...field} />
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
        <CardHeader><CardTitle>Igrejas no Lar ({items.length})</CardTitle></CardHeader>
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
                    <div className="font-medium">{item.nome}</div>
                    <div className="text-sm text-muted-foreground">{item.endereco || "Sem endereço"}</div>
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
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a igreja no lar "{item.nome}".
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
