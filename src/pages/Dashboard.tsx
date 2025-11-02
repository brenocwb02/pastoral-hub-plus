import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Building2, 
  MessageCircle, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  Loader2,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { setSEO } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { DashboardReports } from "@/components/DashboardReports";

interface Stats {
  totalMembers: number;
  totalHouses: number;
  totalOneOnOnes: number;
  totalMeetings: number;
  recentActivities: Activity[];
  upcomingEvents: Event[];
  membersWithoutDiscipulador: number;
  monthlyGrowth: MonthlyGrowth[];
  progressData: ProgressData[];
  casasData: CasaData[];
}

interface MonthlyGrowth {
  month: string;
  members: number;
}

interface Activity {
  id: string;
  description: string;
  timestamp: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
}

interface ProgressData {
  status: string;
  count: number;
}

interface CasaData {
  nome: string;
  membros: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalHouses: 0,
    totalOneOnOnes: 0,
    totalMeetings: 0,
    recentActivities: [],
    upcomingEvents: [],
    membersWithoutDiscipulador: 0,
    monthlyGrowth: [],
    progressData: [],
    casasData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO("Dashboard - Cuidar+", "Painel principal com métricas e estatísticas do ministério");
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get totals for each table
      const [membersResult, housesResult, oneOnOnesResult, meetingsResult] = await Promise.all([
        supabase.from("membros").select("id", { count: "exact", head: true }),
        supabase.from("casas").select("id", { count: "exact", head: true }),
        supabase.from("encontros_1a1").select("id", { count: "exact", head: true }),
        supabase.from("reunioes_gerais").select("id", { count: "exact", head: true })
      ]);

      // Get upcoming events (next 3)
      const { data: upcomingMeetings } = await supabase
        .from("reunioes_gerais")
        .select("id, title, scheduled_at")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(2);

      const { data: upcomingOneOnOnes } = await supabase
        .from("encontros_1a1")
        .select("id, scheduled_at, membros(full_name)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1);

      // Get recent activities (simulated from recent records)
      const { data: recentMembers } = await supabase
        .from("membros")
        .select("full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      const { data: recentHouses } = await supabase
        .from("casas")
        .select("nome, created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      // Format upcoming events
      const upcomingEvents: Event[] = [];
      
      if (upcomingMeetings) {
        upcomingMeetings.forEach(meeting => {
          const date = new Date(meeting.scheduled_at);
          upcomingEvents.push({
            id: meeting.id,
            title: meeting.title,
            date: formatDate(date).split(' ')[0],
            time: formatDate(date).split(' ')[1]
          });
        });
      }

      if (upcomingOneOnOnes) {
        upcomingOneOnOnes.forEach(oneOnOne => {
          const date = new Date(oneOnOne.scheduled_at);
          upcomingEvents.push({
            id: oneOnOne.id,
            title: `1 a 1 com ${oneOnOne.membros?.full_name || 'N/A'}`,
            date: formatDate(date).split(' ')[0],
            time: formatDate(date).split(' ')[1]
          });
        });
      }

      // Format recent activities
      const recentActivities: Activity[] = [];
      
      if (recentMembers) {
        recentMembers.forEach(member => {
          const timeAgo = getTimeAgo(new Date(member.created_at));
          recentActivities.push({
            id: `member-${member.full_name}`,
            description: `Novo membro cadastrado: ${member.full_name}`,
            timestamp: timeAgo
          });
        });
      }

      if (recentHouses) {
        recentHouses.forEach(house => {
          const timeAgo = getTimeAgo(new Date(house.created_at));
          recentActivities.push({
            id: `house-${house.nome}`,
            description: `Nova casa criada: ${house.nome}`,
            timestamp: timeAgo
          });
        });
      }

      // Sort activities by most recent
      recentActivities.sort((a, b) => {
        // Simple sorting by timestamp text - in real app would use actual dates
        return a.timestamp.localeCompare(b.timestamp);
      });

      // Get members without discipulador for alert
      const { count: membersWithoutDiscipuladorCount } = await supabase
        .from("membros")
        .select("id", { count: "exact", head: true })
        .is("discipulador_id", null);

      // Calculate monthly growth (last 6 months)
      const monthlyGrowth: MonthlyGrowth[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const { count } = await supabase
          .from("membros")
          .select("id", { count: "exact", head: true })
          .lt("created_at", nextMonth.toISOString());
        
        monthlyGrowth.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          members: count || 0
        });
      }

      // Load progress data for chart
      const { data: progressRaw } = await supabase
        .from("progresso")
        .select("status");

      const progressCounts = (progressRaw || []).reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const progressLabels: Record<string, string> = {
        not_started: "Não Iniciado",
        in_progress: "Em Progresso",
        completed: "Concluído"
      };

      const progressData = Object.entries(progressCounts).map(([status, count]) => ({
        status: progressLabels[status] || status,
        count
      }));

      // Load casas data for chart
      const { data: casasRaw } = await supabase
        .from("casas")
        .select("nome, id");

      const casasData: CasaData[] = [];
      if (casasRaw) {
        for (const casa of casasRaw) {
          const { count } = await supabase
            .from("membros")
            .select("id", { count: "exact", head: true })
            .eq("casa_id", casa.id);
          
          if (count && count > 0) {
            casasData.push({
              nome: casa.nome,
              membros: count
            });
          }
        }
      }

      setStats({
        totalMembers: membersResult.count || 0,
        totalHouses: housesResult.count || 0,
        totalOneOnOnes: oneOnOnesResult.count || 0,
        totalMeetings: meetingsResult.count || 0,
        recentActivities: recentActivities.slice(0, 3),
        upcomingEvents: upcomingEvents.slice(0, 3),
        membersWithoutDiscipulador: membersWithoutDiscipuladorCount || 0,
        monthlyGrowth,
        progressData,
        casasData
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Agora";
    if (diffInHours === 1) return "1 hora atrás";
    if (diffInHours < 24) return `${diffInHours} horas atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 dia atrás";
    return `${diffInDays} dias atrás`;
  };

  const quickActions = [
    { icon: Users, label: "Novo Membro", href: "/members", color: "bg-blue-500" },
    { icon: Building2, label: "Nova Igreja no Lar", href: "/houses", color: "bg-green-500" },
    { icon: MessageCircle, label: "Agendar 1 a 1", href: "/one-on-ones", color: "bg-purple-500" },
    { icon: Calendar, label: "Nova Reunião", href: "/meetings", color: "bg-orange-500" },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-xl text-muted-foreground mt-2">Visão geral do seu ministério</p>
          </div>
          <Button asChild>
            <Link to="/members">
              <Plus className="w-4 h-4 mr-2" />
              Ação Rápida
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div data-tour="stats-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mb-2" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.totalMembers}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total de Membros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mb-2" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.totalHouses}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Igrejas no Lar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mb-2" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.totalOneOnOnes}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Encontros 1 a 1</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mb-2" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.totalMeetings}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Reuniões Gerais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {stats.membersWithoutDiscipulador > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 mb-8">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-orange-900 dark:text-orange-100">
                    Membros sem Discipulador
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Existem {stats.membersWithoutDiscipulador} membro(s) sem discipulador atribuído. 
                    <Link to="/members" className="underline ml-1">Ver lista</Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Relatórios e Métricas</h2>
          <DashboardReports 
            metrics={{
              attendanceRate: 78,
              activeMembers: stats.totalMembers - stats.membersWithoutDiscipulador,
              inactiveMembers: stats.membersWithoutDiscipulador,
              studyCompletionRate: 65,
              oneOnOneFrequency: stats.totalOneOnOnes,
              trend: 'up'
            }}
          />
        </div>

        {/* Charts Section */}
        <div data-tour="charts" className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Membros por Casa</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : stats.casasData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.casasData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="membros" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progresso dos Estudos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : stats.progressData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.progressData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="count"
                    >
                      {stats.progressData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Growth Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Crescimento de Membros (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="members" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Ações Rápidas</h2>
          <div data-tour="quick-actions" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <Link to={action.href}>
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium">{action.label}</p>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activities and Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : stats.recentActivities.length > 0 ? (
                  stats.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : stats.upcomingEvents.length > 0 ? (
                  stats.upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.date} às {event.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum evento próximo agendado
                  </p>
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4" asChild>
                <Link to="/calendar">
                  Ver calendário completo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
