import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { setSEO } from "@/lib/seo";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, Home, Calendar, BookOpen, TrendingUp, Activity } from "lucide-react";

interface AnalyticsData {
  memberGrowth: Array<{ month: string; count: number }>;
  houseDistribution: Array<{ name: string; value: number }>;
  meetingFrequency: Array<{ week: string; meetings: number; encounters: number }>;
  studyProgress: Array<{ status: string; count: number }>;
  activityMetrics: {
    totalMembers: number;
    activeMembers: number;
    totalHouses: number;
    totalMeetings: number;
    completedStudies: number;
    engagementRate: number;
  };
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#82ca9d"];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    setSEO(
      "Analytics Avançado | Cuidar+",
      "Visualize métricas detalhadas e insights do sistema"
    );
    checkPermissionAndLoadData();
  }, []);

  const checkPermissionAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isPastor = roles?.some((r) => r.role === "pastor");
      setHasPermission(isPastor || false);

      if (isPastor) {
        await loadAnalyticsData();
      }
    } catch (error: any) {
      toast.error("Erro ao verificar permissões: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      // Fetch members
      const { data: members, error: membersError } = await supabase
        .from("membros")
        .select("created_at, casa_id, user_id");
      if (membersError) throw membersError;

      // Fetch houses
      const { data: houses, error: housesError } = await supabase
        .from("casas")
        .select("id, nome");
      if (housesError) throw housesError;

      // Fetch meetings and encounters
      const { data: meetings, error: meetingsError } = await supabase
        .from("reunioes_gerais")
        .select("scheduled_at");
      if (meetingsError) throw meetingsError;

      const { data: encounters, error: encountersError } = await supabase
        .from("encontros_1a1")
        .select("scheduled_at");
      if (encountersError) throw encountersError;

      // Fetch study progress
      const { data: progress, error: progressError } = await supabase
        .from("progresso")
        .select("status");
      if (progressError) throw progressError;

      // Process member growth (last 6 months)
      const monthlyGrowth = processMonthlyGrowth(members || []);

      // Process house distribution
      const houseDistribution = processHouseDistribution(members || [], houses || []);

      // Process meeting frequency (last 8 weeks)
      const meetingFrequency = processMeetingFrequency(meetings || [], encounters || []);

      // Process study progress
      const studyProgress = processStudyProgress(progress || []);

      // Calculate activity metrics
      const activeMembers = members?.filter((m) => m.user_id !== null).length || 0;
      const completedStudies = progress?.filter((p) => p.status === "completed").length || 0;
      const engagementRate = members && members.length > 0
        ? Math.round((activeMembers / members.length) * 100)
        : 0;

      setData({
        memberGrowth: monthlyGrowth,
        houseDistribution,
        meetingFrequency,
        studyProgress,
        activityMetrics: {
          totalMembers: members?.length || 0,
          activeMembers,
          totalHouses: houses?.length || 0,
          totalMeetings: meetings?.length || 0,
          completedStudies,
          engagementRate,
        },
      });
    } catch (error: any) {
      toast.error("Erro ao carregar analytics: " + error.message);
    }
  };

  const processMonthlyGrowth = (members: any[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("pt-BR", { month: "short" });
      const count = members.filter((m) => {
        const createdDate = new Date(m.created_at);
        return createdDate <= date;
      }).length;
      
      months.push({ month: monthName, count });
    }
    
    return months;
  };

  const processHouseDistribution = (members: any[], houses: any[]) => {
    const distribution = houses.map((house) => ({
      name: house.nome,
      value: members.filter((m) => m.casa_id === house.id).length,
    }));
    
    const withoutHouse = members.filter((m) => !m.casa_id).length;
    if (withoutHouse > 0) {
      distribution.push({ name: "Sem Casa", value: withoutHouse });
    }
    
    return distribution;
  };

  const processMeetingFrequency = (meetings: any[], encounters: any[]) => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekLabel = `Sem ${8 - i}`;
      const meetingsCount = meetings.filter((m) => {
        const date = new Date(m.scheduled_at);
        return date >= weekStart && date < weekEnd;
      }).length;
      
      const encountersCount = encounters.filter((e) => {
        const date = new Date(e.scheduled_at);
        return date >= weekStart && date < weekEnd;
      }).length;
      
      weeks.push({
        week: weekLabel,
        meetings: meetingsCount,
        encounters: encountersCount,
      });
    }
    
    return weeks;
  };

  const processStudyProgress = (progress: any[]) => {
    const statuses = {
      not_started: "Não Iniciado",
      in_progress: "Em Progresso",
      completed: "Concluído",
    };
    
    return Object.entries(statuses).map(([key, label]) => ({
      status: label,
      count: progress.filter((p) => p.status === key).length,
    }));
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Apenas pastores podem acessar o analytics avançado.
          </p>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Avançado</h1>
        <p className="text-muted-foreground">
          Métricas detalhadas e insights do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Membros</p>
              <p className="text-2xl font-bold">{data.activityMetrics.totalMembers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Activity className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
              <p className="text-2xl font-bold">{data.activityMetrics.activeMembers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Home className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Casas</p>
              <p className="text-2xl font-bold">{data.activityMetrics.totalHouses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Calendar className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reuniões</p>
              <p className="text-2xl font-bold">{data.activityMetrics.totalMeetings}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <BookOpen className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estudos Completos</p>
              <p className="text-2xl font-bold">{data.activityMetrics.completedStudies}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-500/10">
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Engajamento</p>
              <p className="text-2xl font-bold">{data.activityMetrics.engagementRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Crescimento de Membros</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Membros"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distribuição por Casa</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.houseDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.houseDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Frequência de Reuniões (8 semanas)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.meetingFrequency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="meetings" fill="hsl(var(--primary))" name="Reuniões Gerais" />
              <Bar dataKey="encounters" fill="hsl(var(--secondary))" name="Encontros 1:1" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Progresso de Estudos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.studyProgress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="status" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
