import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { useUserRoles } from "@/hooks/useUserRoles";
import { 
  FileText, 
  Download, 
  Calendar,
  Users,
  TrendingUp,
  Home,
  BookOpen,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportData {
  membros: {
    total: number;
    comDiscipulador: number;
    semDiscipulador: number;
    porCasa: Array<{ casa: string; count: number }>;
  };
  casas: {
    total: number;
    comLider: number;
    semLider: number;
  };
  encontros: {
    total: number;
    proximos30Dias: number;
    ultimoMes: number;
  };
  reunioes: {
    total: number;
    proximas: number;
    realizadas: number;
  };
  progresso: {
    naoIniciado: number;
    emProgresso: number;
    concluido: number;
  };
}

export default function ReportsPage() {
  const { toast } = useToast();
  const { roles } = useUserRoles();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setSEO("Relatórios | Cuidar+", "Visualize relatórios consolidados do sistema");
    checkPermissionAndLoadData();
  }, []);

  const checkPermissionAndLoadData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Acesso negado",
          description: "Você precisa estar logado",
          variant: "destructive"
        });
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const canAccess = roles?.some(r => r.role === "pastor" || r.role === "lider_casa");
      
      if (!canAccess) {
        setHasPermission(false);
        toast({
          title: "Acesso negado",
          description: "Apenas pastores e líderes de casa podem acessar relatórios",
          variant: "destructive"
        });
        return;
      }

      setHasPermission(true);
      await loadReportData();

    } catch (error) {
      console.error("Error checking permissions:", error);
      toast({
        title: "Erro",
        description: "Erro ao verificar permissões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Membros
      const { data: membros } = await supabase.from("membros").select("id, discipulador_id, casa_id");
      const { data: casas } = await supabase.from("casas").select("id, nome, leader_id");
      
      const membrosPorCasa = casas?.map(casa => ({
        casa: casa.nome,
        count: membros?.filter(m => m.casa_id === casa.id).length || 0
      })) || [];

      // Encontros 1-a-1
      const { count: totalEncontros } = await supabase
        .from("encontros_1a1")
        .select("id", { count: "exact", head: true });

      const { count: encontrosProximos } = await supabase
        .from("encontros_1a1")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", thirtyDaysFromNow.toISOString());

      const { count: encontrosUltimoMes } = await supabase
        .from("encontros_1a1")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", thirtyDaysAgo.toISOString())
        .lte("scheduled_at", now.toISOString());

      // Reuniões
      const { count: totalReunioes } = await supabase
        .from("reunioes_gerais")
        .select("id", { count: "exact", head: true });

      const { count: reunioesProximas } = await supabase
        .from("reunioes_gerais")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", now.toISOString());

      const { count: reunioesRealizadas } = await supabase
        .from("reunioes_gerais")
        .select("id", { count: "exact", head: true })
        .lt("scheduled_at", now.toISOString());

      // Progresso
      const { data: progressoData } = await supabase
        .from("progresso")
        .select("status");

      const progressoCounts = progressoData?.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setReportData({
        membros: {
          total: membros?.length || 0,
          comDiscipulador: membros?.filter(m => m.discipulador_id).length || 0,
          semDiscipulador: membros?.filter(m => !m.discipulador_id).length || 0,
          porCasa: membrosPorCasa
        },
        casas: {
          total: casas?.length || 0,
          comLider: casas?.filter(c => c.leader_id).length || 0,
          semLider: casas?.filter(c => !c.leader_id).length || 0
        },
        encontros: {
          total: totalEncontros || 0,
          proximos30Dias: encontrosProximos || 0,
          ultimoMes: encontrosUltimoMes || 0
        },
        reunioes: {
          total: totalReunioes || 0,
          proximas: reunioesProximas || 0,
          realizadas: reunioesRealizadas || 0
        },
        progresso: {
          naoIniciado: progressoCounts['not_started'] || 0,
          emProgresso: progressoCounts['in_progress'] || 0,
          concluido: progressoCounts['completed'] || 0
        }
      });

    } catch (error) {
      console.error("Error loading report data:", error);
      toast({
        title: "Erro ao carregar relatório",
        description: "Não foi possível carregar os dados do relatório",
        variant: "destructive"
      });
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportText = `
RELATÓRIO CUIDAR+ - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

=== MEMBROS ===
Total: ${reportData.membros.total}
Com Discipulador: ${reportData.membros.comDiscipulador}
Sem Discipulador: ${reportData.membros.semDiscipulador}

Membros por Casa:
${reportData.membros.porCasa.map(c => `  ${c.casa}: ${c.count} membros`).join('\n')}

=== CASAS (IGREJAS NO LAR) ===
Total: ${reportData.casas.total}
Com Líder: ${reportData.casas.comLider}
Sem Líder: ${reportData.casas.semLider}

=== ENCONTROS 1-A-1 ===
Total: ${reportData.encontros.total}
Próximos 30 dias: ${reportData.encontros.proximos30Dias}
Último mês: ${reportData.encontros.ultimoMes}

=== REUNIÕES GERAIS ===
Total: ${reportData.reunioes.total}
Próximas: ${reportData.reunioes.proximas}
Realizadas: ${reportData.reunioes.realizadas}

=== PROGRESSO DOS ESTUDOS ===
Não Iniciado: ${reportData.progresso.naoIniciado}
Em Progresso: ${reportData.progresso.emProgresso}
Concluído: ${reportData.progresso.concluido}
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-cuidar-${format(new Date(), "yyyy-MM-dd-HHmm")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Relatório exportado",
      description: "O relatório foi baixado com sucesso"
    });
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </header>
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!hasPermission) {
    return (
      <main className="container mx-auto p-4 space-y-4">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Esta página é restrita a pastores e líderes de casa.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Relatório consolidado gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <Button onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </header>

      {reportData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Membros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{reportData.membros.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Com Discipulador:</span>
                <span className="font-semibold text-green-600">{reportData.membros.comDiscipulador}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sem Discipulador:</span>
                <span className="font-semibold text-orange-600">{reportData.membros.semDiscipulador}</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Membros por Casa:</p>
                {reportData.membros.porCasa.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">{item.casa}:</span>
                    <span>{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Casas (Igrejas no Lar)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{reportData.casas.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Com Líder:</span>
                <span className="font-semibold text-green-600">{reportData.casas.comLider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sem Líder:</span>
                <span className="font-semibold text-orange-600">{reportData.casas.semLider}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Encontros 1-a-1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{reportData.encontros.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próximos 30 dias:</span>
                <span className="font-semibold text-blue-600">{reportData.encontros.proximos30Dias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último mês:</span>
                <span className="font-semibold">{reportData.encontros.ultimoMes}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Reuniões Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{reportData.reunioes.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próximas:</span>
                <span className="font-semibold text-blue-600">{reportData.reunioes.proximas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Realizadas:</span>
                <span className="font-semibold">{reportData.reunioes.realizadas}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Progresso dos Estudos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{reportData.progresso.naoIniciado}</p>
                  <p className="text-sm text-muted-foreground">Não Iniciado</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{reportData.progresso.emProgresso}</p>
                  <p className="text-sm text-muted-foreground">Em Progresso</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{reportData.progresso.concluido}</p>
                  <p className="text-sm text-muted-foreground">Concluído</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
