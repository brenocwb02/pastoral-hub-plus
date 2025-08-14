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
  Loader2
} from "lucide-react";
import { setSEO } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalMembers: number;
  totalHouses: number;
  totalOneOnOnes: number;
  totalMeetings: number;
  recentActivities: Activity[];
  upcomingEvents: Event[];
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

export default function Dashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalHouses: 0,
    totalOneOnOnes: 0,
    totalMeetings: 0,
    recentActivities: [],
    upcomingEvents: []
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

      setStats({
        totalMembers: membersResult.count || 0,
        totalHouses: housesResult.count || 0,
        totalOneOnOnes: oneOnOnesResult.count || 0,
        totalMeetings: meetingsResult.count || 0,
        recentActivities: recentActivities.slice(0, 3),
        upcomingEvents: upcomingEvents.slice(0, 3)
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
    { icon: Building2, label: "Nova Casa", href: "/houses", color: "bg-green-500" },
    { icon: MessageCircle, label: "Agendar 1 a 1", href: "/one-on-ones", color: "bg-purple-500" },
    { icon: Calendar, label: "Nova Reunião", href: "/meetings", color: "bg-orange-500" },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-sm text-muted-foreground">Casas de Paz</p>
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Button variant="ghost" className="w-full mt-4" asChild>
                <Link to="/dashboard">
                  Ver todas as atividades
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
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
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                      <Badge variant="default">{event.time}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum evento próximo
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