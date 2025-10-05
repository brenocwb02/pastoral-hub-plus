import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { Download, FileText, Users, Calendar } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    setSEO("Relatórios | Cuidar+", "Exporte relatórios e dados");
  }, []);

  const exportMembersCSV = async () => {
    setLoading("members");
    const { data, error } = await supabase
      .from("membros")
      .select(`
        full_name, email, phone, endereco, 
        data_nascimento, estado_civil, data_batismo,
        casas(nome)
      `)
      .order("full_name");

    if (error) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
      setLoading(null);
      return;
    }

    // Create CSV content
    const headers = ["Nome", "Email", "Telefone", "Endereço", "Data Nascimento", "Estado Civil", "Data Batismo", "Igreja no Lar"];
    const rows = data.map(m => [
      m.full_name,
      m.email || "",
      m.phone || "",
      m.endereco || "",
      m.data_nascimento ? formatDate(m.data_nascimento) : "",
      m.estado_civil || "",
      m.data_batismo ? formatDate(m.data_batismo) : "",
      (m.casas as any)?.nome || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `membros_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Relatório exportado com sucesso" });
    setLoading(null);
  };

  const exportOneOnOnesCSV = async () => {
    setLoading("1a1");
    
    // Get current month date range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from("encontros_1a1")
      .select(`
        scheduled_at, duration_minutes, notes,
        membros!discipulo_membro_id(full_name)
      `)
      .gte("scheduled_at", firstDay)
      .lte("scheduled_at", lastDay)
      .order("scheduled_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
      setLoading(null);
      return;
    }

    // Create CSV content
    const headers = ["Data/Hora", "Discípulo", "Duração (min)", "Notas"];
    const rows = data.map(item => [
      formatDate(item.scheduled_at),
      (item.membros as any)?.full_name || "N/A",
      item.duration_minutes?.toString() || "60",
      item.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `encontros_1a1_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Relatório exportado com sucesso" });
    setLoading(null);
  };

  const exportHousesCSV = async () => {
    setLoading("houses");
    const { data, error } = await supabase
      .from("casas")
      .select("nome, endereco, created_at")
      .order("nome");

    if (error) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
      setLoading(null);
      return;
    }

    // Create CSV content
    const headers = ["Nome", "Endereço", "Data Criação"];
    const rows = data.map(c => [
      c.nome,
      c.endereco || "",
      formatDate(c.created_at)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `igrejas_no_lar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Relatório exportado com sucesso" });
    setLoading(null);
  };

  const reportCards = [
    {
      title: "Membros",
      description: "Lista completa de membros com todos os dados",
      icon: Users,
      action: exportMembersCSV,
      loadingKey: "members"
    },
    {
      title: "Encontros 1 a 1 (Mês Atual)",
      description: "Relatório de encontros realizados no mês",
      icon: Calendar,
      action: exportOneOnOnesCSV,
      loadingKey: "1a1"
    },
    {
      title: "Igrejas no Lar",
      description: "Lista de todas as igrejas no lar",
      icon: FileText,
      action: exportHousesCSV,
      loadingKey: "houses"
    }
  ];

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-muted-foreground">
          Exporte dados em formato CSV para análise
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.loadingKey}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={report.action}
                  disabled={loading === report.loadingKey}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {loading === report.loadingKey ? "Exportando..." : "Exportar CSV"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sobre os Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Os arquivos CSV podem ser abertos no Excel, Google Sheets ou outros programas de planilha.</p>
          <p>• Os dados são exportados conforme suas permissões de visualização.</p>
          <p>• O relatório de Encontros 1 a 1 inclui apenas o mês atual.</p>
          <p>• Use encoding UTF-8 ao abrir os arquivos para visualizar caracteres especiais corretamente.</p>
        </CardContent>
      </Card>
    </main>
  );
}
