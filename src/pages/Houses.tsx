import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { houseSchema, type HouseFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2, Home, Users } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface Casa { 
  id: string; 
  nome: string; 
  endereco: string | null;
  leader_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Membro {
  id: string;
  casa_id: string | null;
}

export default function HousesPage() {
  const { toast } = useToast();
  const { roles } = useUserRoles();
  const canCreate = roles.includes('pastor') || roles.includes('discipulador');
  const isPastor = roles.includes('pastor');
  const [items, setItems] = useState<Casa[]>([]);
  const [members, setMembers] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Casa | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const leaderHouse = useMemo(
    () => items.find((item) => item.leader_id === currentUserId) || null,
    [items, currentUserId]
  );

  const memberCountByHouse = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      if (m.casa_id) {
        counts[m.casa_id] = (counts[m.casa_id] || 0) + 1;
      }
    });
    return counts;
  }, [members]);

  const chartData = useMemo(() => {
    return items.slice(0, 6).map((casa) => ({
      name: casa.nome.length > 12 ? casa.nome.substring(0, 12) + "…" : casa.nome,
      membros: memberCountByHouse[casa.id] || 0,
      isLeader: casa.leader_id === currentUserId,
    }));
  }, [items, memberCountByHouse, currentUserId]);

  const totalMembers = members.filter((m) => m.casa_id).length;
  const chartConfig = {
    membros: { label: "Membros", color: "hsl(var(--primary))" },
  };
  
  const form = useForm<HouseFormData>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      nome: "",
      endereco: "",
    },
  });

  useEffect(() => {
    setSEO("Igrejas no Lar | Cuidar+", "Gerencie igrejas no lar e líderes");
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    };
    fetchUser();
  }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const [casasRes, membrosRes] = await Promise.all([
      supabase.from("casas").select("*").order("created_at", { ascending: false }),
      supabase.from("membros").select("id, casa_id"),
    ]);
    setLoading(false);
    if (casasRes.error) return toast({ title: "Erro ao carregar", description: casasRes.error.message, variant: "destructive" });
    setItems(casasRes.data || []);
    setMembers(membrosRes.data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDialogOpen = (item: Casa | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({
        nome: item.nome,
        endereco: item.endereco || "",
      });
    } else {
      form.reset({
        nome: "",
        endereco: "",
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: HouseFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      nome: data.nome,
      endereco: data.endereco || null,
      leader_id: user?.id ?? null,
      created_by: editingItem ? undefined : user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingItem) {
      ({ error } = await supabase.from("casas").update(payload).eq("id", editingItem.id));
    } else {
      ({ error } = await supabase.from("casas").insert(payload));
    }

    if (error) {
      toast({ title: `Erro ao ${editingItem ? 'atualizar' : 'criar'}`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Casa ${editingItem ? 'atualizada' : 'criada'} com sucesso` });
      setDialogOpen(false);
      form.reset();
      load();
    }
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from("casas").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao excluir casa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Casa excluída com sucesso" });
      load();
    }
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Igrejas no Lar</h1>
          <p className="text-muted-foreground">Lista e criação de igrejas no lar (restrito por permissões).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)} disabled={!canCreate}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Igreja no Lar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Igreja no Lar" : "Nova Igreja no Lar"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Igreja no Lar Central" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua das Flores, 123 - Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Resumo com gráfico */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de casas</span>
              <span className="text-lg font-semibold">{items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Membros alocados</span>
              <span className="text-lg font-semibold">{totalMembers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Média por casa</span>
              <span className="text-lg font-semibold">
                {items.length > 0 ? (totalMembers / items.length).toFixed(1) : 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Membros por Casa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[140px] w-full">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="membros" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isLeader ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
      </div>

      {leaderHouse && (
        <Card className="border-primary/30 bg-muted/40">
          <CardHeader>
            <CardTitle>Sua Igreja no Lar</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{leaderHouse.nome}</span>
                <Badge variant="outline">Você é o líder</Badge>
                <Badge variant="secondary">{memberCountByHouse[leaderHouse.id] || 0} membros</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {leaderHouse.endereco || "Sem endereço cadastrado"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Igrejas no Lar ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="rounded-md border p-3 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.nome}</span>
                      {item.leader_id === currentUserId && (
                        <Badge variant="secondary" className="text-xs">
                          Sua igreja
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {memberCountByHouse[item.id] || 0} membros
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.endereco || "Sem endereço"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item)} disabled={!canCreate}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!isPastor}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a igreja no lar "{item.nome}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
