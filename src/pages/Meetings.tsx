import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
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

interface Meeting { id: string; title: string; description: string | null; location: string | null; scheduled_at: string }

export default function MeetingsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
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
    const { data, error } = await supabase.from("reunioes_gerais").select("id, title, description, location, scheduled_at").order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function onSubmit(data: MeetingFormData) {
    try {
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
      load();
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message || String(e), variant: "destructive" });
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Reuniões gerais</h1>
        <p className="text-muted-foreground">Integradas ao Google Calendar.</p>
      </header>

      <GoogleCalendarConnect />

      <Card>
        <CardHeader><CardTitle>Nova reunião</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="grid sm:grid-cols-2 gap-4">
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
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    disabled={!connected || !form.formState.isValid || form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reuniões ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(i.scheduled_at)}</span>
                </div>
                {i.location && <p className="text-sm text-muted-foreground">Local: {i.location}</p>}
                {i.description && <p className="text-sm mt-1 text-muted-foreground">{i.description}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
