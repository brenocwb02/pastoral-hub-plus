import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setSEO } from "@/lib/seo";
import { Trophy, Award, Target, TrendingUp, RefreshCw } from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  points: number;
  criteria: any;
}

interface UserAchievement {
  conquista_id: string;
  earned_at: string;
  progress: number;
}

interface UserPoints {
  total_points: number;
  level: number;
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  // Auto-check achievements
  useAchievements();

  useEffect(() => {
    setSEO(
      "Conquistas | Cuidar+",
      "Acompanhe seu progresso e conquistas no sistema"
    );
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Load all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from("conquistas")
        .select("*")
        .order("points", { ascending: false });

      if (achievementsError) throw achievementsError;

      // Load user achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from("conquistas_usuario")
        .select("*")
        .eq("user_id", user.id);

      if (userAchievementsError) throw userAchievementsError;

      // Load user points
      const { data: pointsData, error: pointsError } = await supabase
        .from("pontos_usuario")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pointsError) throw pointsError;

      setAchievements(achievementsData || []);
      setUserAchievements(userAchievementsData || []);
      setUserPoints(pointsData || { total_points: 0, level: 1 });
    } catch (error: any) {
      toast.error("Erro ao carregar conquistas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAchievementEarned = (achievementId: string) => {
    return userAchievements.some((ua) => ua.conquista_id === achievementId);
  };

  const getAchievementProgress = (achievementId: string) => {
    const userAchievement = userAchievements.find((ua) => ua.conquista_id === achievementId);
    return userAchievement?.progress || 0;
  };

  const pointsToNextLevel = (currentLevel: number) => {
    return currentLevel * 100;
  };

  const handleCheckAchievements = async () => {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(
        `https://yzeekoxgykzjzjprrmnl.supabase.co/functions/v1/check-achievements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      const data = await response.json();
      
      if (data.newAchievements && data.newAchievements.length > 0) {
        toast.success(data.message);
        loadData(); // Reload data to show new achievements
      } else {
        toast.info("Você está em dia com suas conquistas!");
      }
    } catch (error) {
      toast.error("Erro ao verificar conquistas");
    } finally {
      setChecking(false);
    }
  };

  const progressToNextLevel = () => {
    if (!userPoints) return 0;
    const pointsNeeded = pointsToNextLevel(userPoints.level);
    const currentLevelPoints = userPoints.total_points % pointsNeeded;
    return (currentLevelPoints / pointsNeeded) * 100;
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const earnedAchievements = achievements.filter((a) => isAchievementEarned(a.id));
  const availableAchievements = achievements.filter((a) => !isAchievementEarned(a.id));

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conquistas e Progresso</h1>
          <p className="text-muted-foreground">
            Acompanhe suas conquistas e evolução no sistema
          </p>
        </div>
        <Button onClick={handleCheckAchievements} disabled={checking}>
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
          Verificar Conquistas
        </Button>
      </div>

      <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/20">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nível</p>
              <p className="text-3xl font-bold">{userPoints?.level || 1}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-yellow-500/20">
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pontos</p>
              <p className="text-3xl font-bold">{userPoints?.total_points || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-green-500/20">
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conquistas</p>
              <p className="text-3xl font-bold">
                {earnedAchievements.length}/{achievements.length}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Próximo Nível</p>
            </div>
            <Progress value={progressToNextLevel()} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {pointsToNextLevel(userPoints?.level || 1) - ((userPoints?.total_points || 0) % pointsToNextLevel(userPoints?.level || 1))} pontos restantes
            </p>
          </div>
        </div>
      </Card>

      {earnedAchievements.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Conquistas Desbloqueadas</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {earnedAchievements.map((achievement) => (
              <Card key={achievement.id} className="p-6 border-2 border-primary/20 bg-primary/5">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{achievement.icon || "🏆"}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{achievement.name}</h3>
                    {achievement.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {achievement.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-yellow-500">
                        +{achievement.points} pts
                      </Badge>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        ✓ Desbloqueada
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {availableAchievements.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Conquistas Disponíveis</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableAchievements.map((achievement) => {
              const progress = getAchievementProgress(achievement.id);
              return (
                <Card key={achievement.id} className="p-6 opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl grayscale">{achievement.icon || "🏆"}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{achievement.name}</h3>
                      {achievement.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {achievement.description}
                        </p>
                      )}
                      <Badge variant="secondary">+{achievement.points} pts</Badge>
                      {progress > 0 && (
                        <div className="mt-3">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {progress}% completo
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
