import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Send, Mail, MailOpen, Plus } from "lucide-react";
import { setSEO } from "@/lib/seo";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface Member {
  id: string;
  full_name: string;
  user_id: string | null;
}

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setSEO(
      "Mensagens | Cuidar+",
      "Comunique-se com outros membros da comunidade"
    );
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      setCurrentUserId(user.id);

      // Load members with user_id
      const { data: membersData, error: membersError } = await supabase
        .from("membros")
        .select("id, full_name, user_id")
        .not("user_id", "is", null);

      if (membersError) throw membersError;

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      setMembers(membersData || []);
      setMessages(messagesData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar mensagens: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRecipient) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: selectedRecipient,
        message: messageText,
      });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso!");
      setMessageText("");
      setSelectedRecipient("");
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem: " + error.message);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      toast.error("Erro ao marcar como lida: " + error.message);
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.full_name || "Usuário Desconhecido";
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const receivedMessages = messages.filter((m) => m.recipient_id === currentUserId);
  const sentMessages = messages.filter((m) => m.sender_id === currentUserId);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mensagens</h1>
          <p className="text-muted-foreground">
            Comunique-se com outros membros
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Destinatário</label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter((m) => m.user_id !== currentUserId)
                      .map((member) => (
                        <SelectItem key={member.id} value={member.user_id!}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Mensagem</label>
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={5}
                />
              </div>
              <Button onClick={handleSendMessage} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recebidas ({receivedMessages.length})
          </h2>
          <div className="space-y-3">
            {receivedMessages.map((message) => (
              <Card
                key={message.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  !message.read_at ? "border-primary" : ""
                }`}
                onClick={() => !message.read_at && markAsRead(message.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {message.read_at ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium">{getMemberName(message.sender_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!message.read_at && <Badge variant="default">Nova</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-sm">{message.message}</p>
              </Card>
            ))}
            {receivedMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem recebida
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviadas ({sentMessages.length})
          </h2>
          <div className="space-y-3">
            {sentMessages.map((message) => (
              <Card key={message.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium">Para: {getMemberName(message.recipient_id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm">{message.message}</p>
                {message.read_at && (
                  <Badge variant="outline" className="mt-2">
                    Lida
                  </Badge>
                )}
              </Card>
            ))}
            {sentMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem enviada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
