import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import GoogleCalendarConnect from "@/components/google/GoogleCalendarConnect";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { meetingSchema, type MeetingFormData } from "@/lib/validations";
import { formatDateTimeLocal, formatDate } from "@/lib/formatters";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";

interface Meeting { 
  id: string; 
  title: string; 
  description: string | null; 
  location: string | null; 
  scheduled_at: string;
  google_event_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function MeetingsPage() {
  const { toast } = useToast();
  const { roles } = useUserRoles();
  const isPastor = roles.includes('pastor');
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Meeting | null>(null);
  const { connected, createGeneral } = useGoogleCalendar();
  
  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      scheduled_at: formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)), // tomorrow
    },
  });

  useEffect(() => { setSEO("Reuniões gerais | Cuidar+", "Gerencie reuniões gerais integradas ao Google"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("reunioes_gerais").select("*").order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDialogOpen = (item: Meeting | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({
        title: item.title,
        description: item.description || "",
        location: item.location || "",
        scheduled_at: formatDateTimeLocal(new Date(item.scheduled_at)),
      });
    } else {
      form.reset({
        title: "",
        description: "",
        location: "",
        scheduled_at: formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: MeetingFormData) {
    try {
      if (editingItem) {
        // Atualizar reunião existente
        const payload = {
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          scheduled_at: new Date(data.scheduled_at).toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("reunioes_gerais").update(payload).eq("id", editingItem.id);
        
        if (error) {
          toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Reunião atualizada com sucesso" });
          setDialogOpen(false);
          load();
        }
      } else {
        // Criar nova reunião via Google Calendar
        const startISO = new Date(data.scheduled_at).toISOString();
        const endISO = new Date(new Date(data.scheduled_at).getTime() + 60*60000).toISOString();
        await createGeneral({ 
          title: data.title, 
          description: data.description, 
          location: data.location, 
          start: startISO, 
          end: endISO 
        });
        form.reset();
        toast({ title: "Reunião criada com sucesso (Google + local)" });
        setDialogOpen(false);
        load();
      }
    } catch (e: any) {
      toast({ title: "Erro ao processar", description: e.message || String(e), variant: "destructive" });
    }
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from("reunioes_gerais").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao excluir reunião", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reunião excluída com sucesso" });
      load();
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Reuniões gerais</h1>
          <p className="text-muted-foreground">Integradas ao Google Calendar.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)} disabled={!isPastor}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Reunião
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título *</FormLabel>
                        <FormControl>
                          <Input placeholder="Reunião de Oração" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local</FormLabel>
                        <FormControl>
                          <Input placeholder="Igreja Central - Salão Principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalhes sobre a reunião..." {...field} />
                      </FormControl>
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
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={(!connected && !editingItem) || form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <GoogleCalendarConnect />

      <Card>
        <CardHeader><CardTitle>Reuniões ({items.length})</CardTitle></CardHeader>
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
                      <span className="font-medium">{item.title}</span>
                      <span className="text-sm text-muted-foreground">{formatDate(item.scheduled_at)}</span>
                    </div>
                    {item.location && <p className="text-sm text-muted-foreground">Local: {item.location}</p>}
                    {item.description && <p className="text-sm mt-1 text-muted-foreground">{item.description}</p>}
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
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a reunião "{item.title}".
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
