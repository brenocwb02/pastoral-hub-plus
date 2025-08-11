import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  MessageCircle, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  Plus,
  ArrowRight,
  Activity
} from "lucide-react";
import { setSEO } from "@/lib/seo";

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
  const [stats, setStats] = useState<Stats>({
    totalMembers: 45,
    totalHouses: 8,
    totalOneOnOnes: 12,
    totalMeetings: 5,
    recentActivities: [
      { id: "1", description: "Novo membro cadastrado: João Silva", timestamp: "2 horas atrás" },
      { id: "2", description: "Encontro 1 a 1 agendado com Maria", timestamp: "5 horas atrás" },
      { id: "3", description: "Nova casa de paz criada: Casa Central", timestamp: "1 dia atrás" },
    ],
    upcomingEvents: [
      { id: "1", title: "Reunião Geral", date: "Hoje", time: "19:00" },
      { id: "2", title: "Encontro com Pedro", date: "Amanhã", time: "15:00" },
      { id: "3", title: "Reunião de Líderes", date: "Sexta", time: "20:00" },
    ]
  });

  useEffect(() => {
    setSEO("Dashboard - Cuidar+", "Painel principal com métricas e estatísticas do ministério");
  }, []);

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
                  <p className="text-3xl font-bold">{stats.totalMembers}</p>
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
                  <p className="text-3xl font-bold">{stats.totalHouses}</p>
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
                  <p className="text-3xl font-bold">{stats.totalOneOnOnes}</p>
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
                  <p className="text-3xl font-bold">{stats.totalMeetings}</p>
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
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
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
                {stats.upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant="default">{event.time}</Badge>
                  </div>
                ))}
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