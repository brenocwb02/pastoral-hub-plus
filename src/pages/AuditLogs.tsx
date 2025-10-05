import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { Loader2, History, User, Database } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  changed_by: string | null;
  changed_at: string;
}

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");

  useEffect(() => {
    setSEO("Logs de Auditoria | Cuidar+", "Histórico de alterações do sistema");
  }, []);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({ 
        title: "Erro ao carregar logs", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return (
      <Badge variant={variants[action] || "default"}>
        {action}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      membros: "Membros",
      casas: "Igrejas no Lar",
      encontros_1a1: "Encontros 1 a 1",
      reunioes_gerais: "Reuniões Gerais",
    };
    return labels[tableName] || tableName;
  };

  const getChangeSummary = (log: AuditLog) => {
    if (log.action === 'INSERT') {
      return `Novo registro criado`;
    } else if (log.action === 'DELETE') {
      return `Registro excluído`;
    } else if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const changedFields = Object.keys(log.new_data).filter(
        key => JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])
      );
      if (changedFields.length > 0) {
        return `Campos alterados: ${changedFields.join(', ')}`;
      }
      return 'Atualizado';
    }
    return 'Alteração';
  };

  const filteredLogs = logs.filter(log => {
    const matchesTable = filterTable === "" || log.table_name === filterTable;
    const matchesAction = filterAction === "" || log.action === filterAction;
    return matchesTable && matchesAction;
  });

  const uniqueTables = [...new Set(logs.map(log => log.table_name))];

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Logs de Auditoria</h1>
        </div>
        <p className="text-muted-foreground">
          Histórico completo de alterações no sistema (últimos 100 registros)
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre os logs por tabela ou ação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Tabela</label>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as tabelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as tabelas</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>
                      {getTableLabel(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ação</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as ações</SelectItem>
                  <SelectItem value="INSERT">Criação</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Histórico de Alterações ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(log.action)}
                          <span className="font-medium">
                            {getTableLabel(log.table_name)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(log.changed_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getChangeSummary(log)}
                        </p>
                        {log.changed_by && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            ID: {log.changed_by.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
