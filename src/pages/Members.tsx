import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { memberSchema, type MemberFormData } from "@/lib/validations";
import { formatPhone } from "@/lib/formatters";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Pencil, Trash2, Eye } from "lucide-react";
import { SearchAndFilters } from "@/components/SearchAndFilters";

// Tipagem para membros, incluindo dados do discipulador e casa
interface Membro {
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
  user_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  casas: { nome: string } | null;
}

interface Discipulador { id: string; full_name: string | null; }
interface Casa { id: string; nome: string; }

export default function MembersPage() {
  const { toast } = useToast();
  const { roles } = useUserRoles();
  const canCreate = roles.includes('pastor') || roles.includes('discipulador');
  const [items, setItems] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Membro | null>(null);
  const [discipuladores, setDiscipuladores] = useState<Discipulador[]>([]);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCasa, setFilterCasa] = useState("");
  const [filterDiscipulador, setFilterDiscipulador] = useState("");

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: "", email: "", phone: "", endereco: "",
      data_nascimento: "", estado_civil: "", data_batismo: "",
      discipulador_id: "", casa_id: "",
    },
  });

  useEffect(() => { setSEO("Membros | Cuidar+", "Gerencie membros da igreja"); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("membros")
      .select(`*, casas ( nome )`) // Join para buscar o nome da casa
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar membros", description: error.message, variant: "destructive" });
    } else {
      setItems(data as Membro[]);
    }
    setLoading(false);
  }, [toast]);

  // Carrega dados auxiliares (discipuladores e casas)
  useEffect(() => {
    const fetchAuxData = async () => {
      // CORREÇÃO: Lógica de busca de discipuladores em duas etapas para evitar erro de relação
      // Etapa 1: Buscar IDs de usuários com os papéis corretos
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['pastor', 'discipulador']);

      if (rolesError) {
        toast({ title: "Erro ao carregar papéis", description: rolesError.message, variant: "destructive" });
        return;
      }

      const userIds = rolesData.map(r => r.user_id);

      if (userIds.length > 0) {
        // Etapa 2: Buscar os perfis (nomes) correspondentes a esses IDs
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesError) {
          toast({ title: "Erro ao carregar discipuladores", description: profilesError.message, variant: "destructive" });
        } else {
          setDiscipuladores(profilesData as Discipulador[]);
        }
      } else {
        setDiscipuladores([]);
      }
      
      const { data: casasData, error: casasError } = await supabase.from("casas").select("id, nome");
      if (casasError) {
        toast({ title: "Erro ao carregar casas", description: casasError.message, variant: "destructive" });
      } else {
        setCasas(casasData);
      }
    };
    fetchAuxData();
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleDialogOpen = (member: Membro | null = null) => {
    setEditingMember(member);
    if (member) {
      form.reset({
        ...member,
        data_nascimento: member.data_nascimento ? member.data_nascimento.split('T')[0] : "",
        data_batismo: member.data_batismo ? member.data_batismo.split('T')[0] : "",
        casa_id: member.casa_id || "",
        discipulador_id: member.discipulador_id || "",
      });
    } else {
      form.reset({
        full_name: "", email: "", phone: "", endereco: "",
        data_nascimento: "", estado_civil: "", data_batismo: "",
        discipulador_id: "", casa_id: "",
      });
    }
    setDialogOpen(true);
  };

  async function onSubmit(data: MemberFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { casas, ...restOfData } = data as any;

    const payload = {
      ...restOfData,
      phone: data.phone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      data_nascimento: data.data_nascimento || null,
      estado_civil: data.estado_civil || null,
      data_batismo: data.data_batismo || null,
      casa_id: data.casa_id || null,
      created_by: editingMember ? undefined : user?.id,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingMember) {
      ({ error } = await supabase.from("membros").update(payload).eq("id", editingMember.id));
    } else {
      ({ error } = await supabase.from("membros").insert(payload));
    }

    if (error) {
      toast({ title: `Erro ao ${editingMember ? 'atualizar' : 'criar'}`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Membro ${editingMember ? 'atualizado' : 'criado'} com sucesso` });
      setDialogOpen(false);
      loadData();
    }
  }

  async function handleDelete(memberId: string) {
    const { error } = await supabase.from("membros").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Erro ao excluir membro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro excluído com sucesso" });
      loadData();
    }
  }

  // Filter members based on search and filters
  const filteredMembers = items.filter(member => {
    const matchesSearch = searchQuery === "" || 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery);
    
    const matchesCasa = filterCasa === "" || member.casa_id === filterCasa;
    const matchesDiscipulador = filterDiscipulador === "" || member.discipulador_id === filterDiscipulador;

    return matchesSearch && matchesCasa && matchesDiscipulador;
  });

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Membros</h1>
          <p className="text-muted-foreground">Lista e criação de membros (restrito por permissões).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen(null)} disabled={!canCreate}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingMember ? "Editar Membro" : "Novo Membro"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl><Input placeholder="João da Silva" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="joao@exemplo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input placeholder="(11) 99999-9999" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} maxLength={15} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="endereco" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input placeholder="Rua das Flores, 123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="data_nascimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="estado_civil" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado Civil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="data_batismo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Batismo</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="discipulador_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discipulador *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o discipulador" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {discipuladores.map(d => (<SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="casa_id" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Igreja no Lar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione a igreja no lar" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {casas.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <DialogFooter className="sm:col-span-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Membros ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchAndFilters
            searchPlaceholder="Buscar por nome, email ou telefone..."
            onSearchChange={setSearchQuery}
            filters={[
              {
                id: "casa",
                label: "Igreja no Lar",
                options: casas.map(c => ({ value: c.id, label: c.nome })),
                value: filterCasa,
                onChange: setFilterCasa,
              },
              {
                id: "discipulador",
                label: "Discipulador",
                options: discipuladores.map(d => ({ value: d.id, label: d.full_name || "Sem nome" })),
                value: filterDiscipulador,
                onChange: setFilterDiscipulador,
              },
            ]}
            onClearFilters={() => {
              setFilterCasa("");
              setFilterDiscipulador("");
            }}
            resultCount={filteredMembers.length}
          />
          {loading ? (
            <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || filterCasa || filterDiscipulador ? "Nenhum membro encontrado com os filtros aplicados" : "Nenhum membro cadastrado"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(m => (
                <div key={m.id} className="rounded-md border p-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium">{m.full_name}</div>
                    <div className="text-sm text-muted-foreground">{m.email} {m.phone && `• ${m.phone}`}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.casas?.nome || "Sem igreja no lar"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/members/${m.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(m)} disabled={!canCreate}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!canCreate}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o membro "{m.full_name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)}>Excluir</AlertDialogAction>
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
