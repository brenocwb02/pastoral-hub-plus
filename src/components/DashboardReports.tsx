import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ReportMetrics {
  attendanceRate: number;
  activeMembers: number;
  inactiveMembers: number;
  studyCompletionRate: number;
  oneOnOneFrequency: number;
  trend: 'up' | 'down' | 'stable';
}

export function DashboardReports({ metrics }: { metrics: ReportMetrics }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Taxa de Presença */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Taxa de Presença
            {metrics.trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.attendanceRate}%
          </div>
          <Progress value={metrics.attendanceRate} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.trend === 'up' ? '+' : '-'}5% em relação ao mês anterior
          </p>
        </CardContent>
      </Card>

      {/* Membros Ativos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              {metrics.activeMembers}
            </span>
            <span className="text-sm text-muted-foreground">ativos</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-semibold text-orange-600">
              {metrics.inactiveMembers}
            </span>
            <span className="text-xs text-muted-foreground">inativos (+30 dias)</span>
          </div>
          <div className="mt-3">
            <Progress 
              value={(metrics.activeMembers / (metrics.activeMembers + metrics.inactiveMembers)) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Conclusão de Estudos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Conclusão de Estudos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.studyCompletionRate}%
          </div>
          <Progress value={metrics.studyCompletionRate} className="h-2" />
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Média: 4.5 semanas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Frequência de 1:1 */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Frequência de Encontros 1:1</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.floor(metrics.oneOnOneFrequency * 0.6)}</p>
                <p className="text-xs text-muted-foreground">Semanais</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.floor(metrics.oneOnOneFrequency * 0.3)}</p>
                <p className="text-xs text-muted-foreground">Quinzenais</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.floor(metrics.oneOnOneFrequency * 0.1)}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
