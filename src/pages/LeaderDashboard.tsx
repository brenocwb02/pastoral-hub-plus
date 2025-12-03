import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setSEO } from "@/lib/seo";
import { Users, TrendingUp, BookOpen, Calendar, Home } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Casa {
  id: string;
  nome: string;
  endereco: string | null;
}

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface StudyProgress {
  membro_id: string;
  completed: number;
  in_progress: number;
  not_started: number;
}

interface MeetingStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
}

export default function LeaderDashboard() {
  const [casa, setCasa] = useState<Casa | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>([]);
  const [meetingStats, setMeetingStats] = useState<MeetingStats>({ total: 0, thisMonth: 0, lastMonth: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setSEO("Dashboard do Líder | Cuidar+", "Acompanhe as métricas da sua casa");
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get leader's casa
      const { data: casaData, error: casaError } = await supabase
        .from("casas")
        .select("*")
        .eq("leader_id", user.id)
        .single();

      if (casaError) throw casaError;
      setCasa(casaData);

      // Get casa members
      const { data: membersData, error: membersError } = await supabase
        .from("membros")
        .select("id, full_name, email, phone")
        .eq("casa_id", casaData.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Get study progress for members
      const memberIds = membersData?.map(m => m.id) || [];
      if (memberIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from("progresso")
          .select("membro_id, status")
          .in("membro_id", memberIds);

        if (progressError) throw progressError;

        // Aggregate progress by member
        const progressMap = new Map<string, StudyProgress>();
        memberIds.forEach(id => {
          progressMap.set(id, { membro_id: id, completed: 0, in_progress: 0, not_started: 0 });
        });

        progressData?.forEach(p => {
          const current = progressMap.get(p.membro_id);
          if (current) {
            if (p.status === "completed") current.completed++;
            else if (p.status === "in_progress") current.in_progress++;
            else current.not_started++;
          }
        });

        setStudyProgress(Array.from(progressMap.values()));
      }

      // Get meeting statistics
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const { count: totalCount } = await supabase
        .from("encontros_1a1")
        .select("*", { count: "exact", head: true })
        .in("discipulo_membro_id", memberIds);

      const { count: thisMonthCount } = await supabase
        .from("encontros_1a1")
        .select("*", { count: "exact", head: true })
        .in("discipulo_membro_id", memberIds)
        .gte("scheduled_at", firstDayThisMonth.toISOString());

      const { count: lastMonthCount } = await supabase
        .from("encontros_1a1")
        .select("*", { count: "exact", head: true })
        .in("discipulo_membro_id", memberIds)
        .gte("scheduled_at", firstDayLastMonth.toISOString())
        .lte("scheduled_at", lastDayLastMonth.toISOString());

      setMeetingStats({
        total: totalCount || 0,
        thisMonth: thisMonthCount || 0,
        lastMonth: lastMonthCount || 0
      });
    } catch (error: any) {
      toast.error("Erro ao carregar dashboard: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!casa) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma casa atribuída</h2>
            <p className="text-muted-foreground">
              Você precisa ser líder de uma casa para acessar este dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStudies = studyProgress.reduce((acc, p) => 
    acc + p.completed + p.in_progress + p.not_started, 0
  );
  const completedStudies = studyProgress.reduce((acc, p) => acc + p.completed, 0);
  const completionRate = totalStudies > 0 ? Math.round((completedStudies / totalStudies) * 100) : 0;

  const meetingGrowth = meetingStats.lastMonth > 0
    ? Math.round(((meetingStats.thisMonth - meetingStats.lastMonth) / meetingStats.lastMonth) * 100)
    : 0;

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard - {casa.nome}</h1>
        <p className="text-muted-foreground">{casa.endereco}</p>
      </div>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
          <CardDescription>Atalhos para o dia a dia da sua Igreja no Lar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <Button
              variant="secondary"
              className="hover-scale justify-start md:justify-center flex-1"
              onClick={() => navigate("/members")}
            >
              <Users className="h-4 w-4 mr-2" />
              Gerenciar membros
            </Button>
            <Button
              variant="outline"
              className="hover-scale justify-start md:justify-center flex-1"
              onClick={() => navigate("/one-on-ones")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Novo encontro 1 a 1
            </Button>
            <Button
              variant="outline"
              className="hover-scale justify-start md:justify-center flex-1"
              onClick={() => navigate("/meetings")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Nova reunião geral
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-scale animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">membros ativos</p>
          </CardContent>
        </Card>

        <Card className="hover-scale animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetingStats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {meetingGrowth > 0 ? "+" : ""}{meetingGrowth}% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedStudies} de {totalStudies} estudos
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetingStats.total}</div>
            <p className="text-xs text-muted-foreground">todas as reuniões</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="progress">Progresso de Estudos</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membros da Casa</CardTitle>
              <CardDescription>Lista de todos os membros ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{member.full_name}</p>
                      {member.email && (
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      )}
                      {member.phone && (
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      )}
                    </div>
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum membro cadastrado ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso de Estudos</CardTitle>
              <CardDescription>Acompanhe o progresso dos membros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {members.map((member) => {
                  const progress = studyProgress.find(p => p.membro_id === member.id);
                  const total = (progress?.completed || 0) + (progress?.in_progress || 0) + (progress?.not_started || 0);
                  const percentage = total > 0 ? Math.round(((progress?.completed || 0) / total) * 100) : 0;

                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{member.full_name}</p>
                        <div className="flex gap-2">
                          <Badge variant="default" className="bg-green-500">
                            {progress?.completed || 0} completos
                          </Badge>
                          <Badge variant="secondary">
                            {progress?.in_progress || 0} em progresso
                          </Badge>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {percentage}% concluído
                      </p>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado de progresso disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
