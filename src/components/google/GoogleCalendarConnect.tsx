import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { Loader2, LogIn, LogOut } from "lucide-react";

export default function GoogleCalendarConnect() {
  const { connected, loading, error, connect, disconnect, refreshStatus, syncNow } = useGoogleCalendar();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Calendar</CardTitle>
        <CardDescription>Conecte sua conta para sincronizar seus eventos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Badge variant={connected ? "default" : "secondary"}>
          {connected ? "Conectado" : "Desconectado"}
        </Badge>
        {connected ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={syncNow} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sincronizar agora
            </Button>
            <Button variant="destructive" onClick={disconnect} disabled={loading}>
              <LogOut className="h-4 w-4 mr-2" /> Desconectar
            </Button>
          </div>
        ) : (
          <Button onClick={connect} disabled={loading}>
            <LogIn className="h-4 w-4 mr-2" /> Conectar Google
          </Button>
        )}
        <Button variant="ghost" onClick={refreshStatus} disabled={loading}>Atualizar status</Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
