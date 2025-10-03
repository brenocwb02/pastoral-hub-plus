import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Home, Mail, MapPin, MessageCircle, Phone, TrendingUp, User, Edit, Cake, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface MemberDetails {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  data_batismo: string | null;
  discipulador_id: string | null;
  casa_id: string | null;
  created_at: string;
  casas: { nome: string } | null;
}

interface OneOnOne {
  id: string;
  scheduled_at: string;
  outcome: string | null;
  notes: string | null;
  duration_minutes: number | null;
}

interface Progress {
  id: string;
  status: string;
  notes: string | null;
  planos_estudo: { title: string } | null;
}

export default function MemberDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [oneOnOnes, setOneOnOnes] = useState<OneOnOne[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberData();
  }, [id]);

  const loadMemberData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);

      // Load member details
      const { data: memberData, error: memberError } = await supabase
        .from("membros")
        .select("*, casas (nome)")
        .eq("id", id)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Load 1-on-1 meetings
      const { data: oneOnOnesData } = await supabase
        .from("encontros_1a1")
        .select("id, scheduled_at, outcome, notes, duration_minutes")
        .eq("discipulo_membro_id", id)
        .order("scheduled_at", { ascending: false })
        .limit(5);

      setOneOnOnes(oneOnOnesData || []);

      // Load study progress
      const { data: progressData } = await supabase
        .from("progresso")
        .select("id, status, notes, planos_estudo (title)")
        .eq("membro_id", id);

      setProgress(progressData || []);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluído";
      case "in_progress":
        return "Em Progresso";
      default:
        return "Não Iniciado";
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-1" />
          <Skeleton className="h-96 col-span-2" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Membro não encontrado</p>
            <Button asChild className="mt-4">
              <Link to="/members">Voltar para Membros</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedPlans = progress.filter(p => p.status === "completed").length;
  const totalPlans = progress.length;
  const progressPercentage = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/members")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{member.full_name}</h1>
            <p className="text-muted-foreground">Detalhes do membro</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/members?edit=${member.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{member.email}</p>
                  </div>
                </div>
              )}
              {member.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm">{member.phone}</p>
                  </div>
                </div>
              )}
              {member.endereco && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="text-sm">{member.endereco}</p>
                  </div>
                </div>
              )}
              {member.data_nascimento && (
                <div className="flex items-start gap-3">
                  <Cake className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                    <p className="text-sm">
                      {new Date(member.data_nascimento).toLocaleDateString('pt-BR')} 
                      ({calculateAge(member.data_nascimento)} anos)
                    </p>
                  </div>
                </div>
              )}
              {member.estado_civil && (
                <div className="flex items-start gap-3">
                  <Heart className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estado Civil</p>
                    <p className="text-sm">{member.estado_civil}</p>
                  </div>
                </div>
              )}
              {member.data_batismo && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Batismo</p>
                    <p className="text-sm">{new Date(member.data_batismo).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              )}
              {member.casas && (
                <div className="flex items-start gap-3">
                  <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Igreja no Lar</p>
                    <p className="text-sm">{member.casas.nome}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Planos Concluídos</span>
                  <span className="font-semibold">{completedPlans}/{totalPlans}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/progress?member=${member.id}`}>
                  Ver Progresso Detalhado
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent 1-on-1s */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Encontros 1 a 1 Recentes
                </CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/one-on-ones?member=${member.id}`}>Ver Todos</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {oneOnOnes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum encontro registrado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {oneOnOnes.map((meeting) => (
                    <div key={meeting.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {new Date(meeting.scheduled_at).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge variant="secondary">
                          {meeting.duration_minutes || 60} min
                        </Badge>
                      </div>
                      {meeting.outcome && (
                        <p className="text-sm text-muted-foreground">{meeting.outcome}</p>
                      )}
                      {meeting.notes && (
                        <p className="text-xs text-muted-foreground italic">"{meeting.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Separator className="my-4" />
              <Button asChild variant="default" className="w-full">
                <Link to={`/one-on-ones?new=true&member=${member.id}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Novo 1 a 1
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Study Plans Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Planos de Estudo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progress.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum plano atribuído ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {progress.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {item.planos_estudo?.title || "Plano sem título"}
                        </span>
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
