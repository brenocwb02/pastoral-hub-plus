import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import GoogleCalendarConnect from "@/components/google/GoogleCalendarConnect";
import { useGoogleCalendar, CalendarEvent } from "@/hooks/useGoogleCalendar";
import { Loader2, CalendarPlus } from "lucide-react";

export default function CalendarPage() {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const { connected, listEvents, createGeneral } = useGoogleCalendar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const rangeStart = useMemo(() => startOfMonth(month).toISOString(), [month]);
  const rangeEnd = useMemo(() => endOfMonth(month).toISOString(), [month]);

  useEffect(() => {
    document.title = "Calendário | Cuidar+";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Calendário integrado ao Google Calendar - Cuidar+');
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listEvents(rangeStart, rangeEnd);
        setEvents(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [listEvents, rangeStart, rangeEnd]);

  const dayEvents = useMemo(
    () => events.filter(e => selected && isSameDay(new Date(e.start), selected)),
    [events, selected]
  );

  // Form state for new general meeting
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState<string>(new Date().toISOString().slice(0,16)); // yyyy-MM-ddTHH:mm
  const [saving, setSaving] = useState(false);

  async function onCreateGeneral() {
    setSaving(true);
    try {
      const startISO = new Date(when).toISOString();
      const endISO = new Date(new Date(when).getTime() + 60*60000).toISOString();
      await createGeneral({ title, description, location, start: startISO, end: endISO });
      setOpen(false);
      // reload
      const data = await listEvents(rangeStart, rangeEnd);
      setEvents(data);
      setTitle(""); setDescription(""); setLocation("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Calendário</h1>
        <p className="text-muted-foreground">Visualize e gerencie eventos sincronizados com o Google Calendar.</p>
      </header>

      <GoogleCalendarConnect />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              onMonthChange={setMonth}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Eventos em {selected ? format(selected, 'dd/MM/yyyy') : format(month, 'MM/yyyy')}</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={!connected}>
                  <CalendarPlus className="h-4 w-4 mr-2" /> Novo evento geral
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo evento geral</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
                  <Input placeholder="Local" value={location} onChange={(e) => setLocation(e.target.value)} />
                  <label className="text-sm">Data e hora</label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={onCreateGeneral} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando eventos...</div>
            ) : dayEvents.length === 0 ? (
              <p className="text-muted-foreground">Sem eventos para este dia.</p>
            ) : (
              <ul className="space-y-3">
                {dayEvents.map((e) => (
                  <li key={e.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={e.source === 'google' ? 'secondary' : 'default'}>
                          {e.source === 'google' ? 'Google' : e.source === '1a1' ? '1 a 1' : 'Geral'}
                        </Badge>
                        <span className="font-medium">{e.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{format(new Date(e.start), 'HH:mm')} - {format(new Date(e.end), 'HH:mm')}</span>
                    </div>
                    {e.location ? <p className="text-sm text-muted-foreground mt-1">Local: {e.location}</p> : null}
                    {e.description ? <p className="text-sm mt-2">{e.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
