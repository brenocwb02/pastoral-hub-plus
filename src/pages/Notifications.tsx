import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { Bell, BellOff, Check, X, Calendar, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  event_type: string;
  related_id: string;
  remind_at: string;
  channel: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  last_error: string | null;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO("Notificações | Cuidar+", "Gerencie suas notificações e lembretes");
    loadNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("remind_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({
        title: "Erro ao carregar notificações",
        description: "Não foi possível carregar suas notificações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsSent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Notificação marcada como enviada",
        description: "A notificação foi marcada como enviada"
      });

      await loadNotifications();
    } catch (error) {
      console.error("Error marking notification:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a notificação",
        variant: "destructive"
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Notificação removida",
        description: "A notificação foi removida com sucesso"
      });

      await loadNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a notificação",
        variant: "destructive"
      });
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("reuniao") || eventType.includes("meeting")) {
      return <Calendar className="w-4 h-4" />;
    }
    return <Users className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      sent: "default",
      failed: "destructive"
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      sent: "Enviada",
      failed: "Falhou"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Notificações</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </header>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notificações
        </h1>
        <p className="text-muted-foreground">
          Gerencie seus lembretes e notificações de eventos
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Suas Notificações ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Você não tem notificações no momento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getEventIcon(notification.event_type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium capitalize">
                          {notification.event_type.replace(/_/g, " ")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Lembrar em:{" "}
                          {formatDistanceToNow(new Date(notification.remind_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                        {notification.last_error && (
                          <p className="text-sm text-destructive mt-1">
                            Erro: {notification.last_error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(notification.status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge variant="outline" className="capitalize">
                      {notification.channel}
                    </Badge>
                    {notification.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsSent(notification.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Marcar como enviada
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Remover
                    </Button>
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
