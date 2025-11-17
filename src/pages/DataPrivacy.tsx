import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { setSEO } from "@/lib/seo";
import { Shield, Download, Trash2, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Consent {
  id: string;
  consent_type: "data_processing" | "marketing" | "data_sharing";
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
}

interface DataRequest {
  id: string;
  request_type: "export" | "delete";
  status: "pending" | "processing" | "completed" | "rejected";
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

const consentLabels = {
  data_processing: "Processamento de Dados",
  marketing: "Comunicações de Marketing",
  data_sharing: "Compartilhamento de Dados",
};

const consentDescriptions = {
  data_processing: "Permitir o processamento dos seus dados para funcionalidades do sistema",
  marketing: "Receber comunicações sobre eventos e novidades",
  data_sharing: "Permitir compartilhamento de dados com líderes e pastores",
};

const statusIcons = {
  pending: Clock,
  processing: Clock,
  completed: CheckCircle,
  rejected: XCircle,
};

const statusLabels = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluído",
  rejected: "Rejeitado",
};

export default function DataPrivacy() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO(
      "Privacidade de Dados - LGPD | Cuidar+",
      "Gerencie suas preferências de privacidade e dados pessoais"
    );
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Load consents
      const { data: consentsData, error: consentsError } = await supabase
        .from("user_consents")
        .select("*")
        .eq("user_id", user.id);

      if (consentsError) throw consentsError;

      // Load data requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("data_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });

      if (requestsError) throw requestsError;

      setConsents(consentsData || []);
      setDataRequests(requestsData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (
    consentType: Consent["consent_type"],
    granted: boolean
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const existing = consents.find((c) => c.consent_type === consentType);

      if (existing) {
        const { error } = await supabase
          .from("user_consents")
          .update({
            granted,
            granted_at: granted ? new Date().toISOString() : null,
            revoked_at: !granted ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_consents").insert({
          user_id: user.id,
          consent_type: consentType,
          granted,
          granted_at: granted ? new Date().toISOString() : null,
        });

        if (error) throw error;
      }

      toast.success("Preferência atualizada com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar preferência: " + error.message);
    }
  };

  const handleDataRequest = async (requestType: "export" | "delete") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("data_requests").insert({
        user_id: user.id,
        request_type: requestType,
      });

      if (error) throw error;

      toast.success(
        requestType === "export"
          ? "Solicitação de exportação enviada. Você será notificado quando estiver pronta."
          : "Solicitação de exclusão enviada. Nossa equipe irá processá-la em breve."
      );
      loadData();
    } catch (error: any) {
      toast.error("Erro ao enviar solicitação: " + error.message);
    }
  };

  const getConsentStatus = (consentType: Consent["consent_type"]) => {
    const consent = consents.find((c) => c.consent_type === consentType);
    return consent?.granted || false;
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Privacidade e Dados (LGPD)</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências de privacidade e dados pessoais
          </p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Consentimentos
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Controle como seus dados são utilizados de acordo com a LGPD
        </p>
        <div className="space-y-6">
          {(Object.keys(consentLabels) as Array<keyof typeof consentLabels>).map(
            (consentType) => (
              <div key={consentType} className="flex items-start justify-between">
                <div className="flex-1">
                  <Label htmlFor={consentType} className="text-base font-medium">
                    {consentLabels[consentType]}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {consentDescriptions[consentType]}
                  </p>
                </div>
                <Switch
                  id={consentType}
                  checked={getConsentStatus(consentType)}
                  onCheckedChange={(checked) =>
                    handleConsentChange(consentType, checked)
                  }
                />
              </div>
            )
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Direitos dos Titulares</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Conforme a LGPD, você tem direito a solicitar cópia ou exclusão dos seus dados
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Exportar Meus Dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exportar Dados Pessoais</AlertDialogTitle>
                <AlertDialogDescription>
                  Você receberá uma cópia de todos os seus dados armazenados no sistema.
                  A solicitação será processada em até 48 horas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDataRequest("export")}>
                  Confirmar Exportação
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Meus Dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Dados Pessoais</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Todos os seus dados serão permanentemente
                  removidos do sistema. Você precisará criar uma nova conta para continuar
                  utilizando o sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDataRequest("delete")}
                  className="bg-destructive text-destructive-foreground"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {dataRequests.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Histórico de Solicitações</h2>
          <div className="space-y-3">
            {dataRequests.map((request) => {
              const StatusIcon = statusIcons[request.status];
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">
                        {request.request_type === "export"
                          ? "Exportação de Dados"
                          : "Exclusão de Dados"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Solicitado em{" "}
                        {new Date(request.requested_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      request.status === "completed"
                        ? "default"
                        : request.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {statusLabels[request.status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
