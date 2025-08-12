import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { memberSchema, type MemberFormData } from "@/lib/validations";
import { formatPhone } from "@/lib/formatters";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface Membro { id: string; full_name: string; email: string | null; phone: string | null }

export default function MembersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => { setSEO("Membros | Cuidar+", "Gerencie membros da igreja"); }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    const { data, error } = await supabase.from("membros").select("id, full_name, email, phone").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setItems(data || []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function onSubmit(data: MemberFormData) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("membros").insert({ 
      full_name: data.full_name, 
      email: data.email || null,
      phone: data.phone || null,
      created_by: userData.user?.id ?? null 
    });
    if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    form.reset();
    toast({ title: "Membro criado com sucesso" });
    load();
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Membros</h1>
        <p className="text-muted-foreground">Lista e criação de membros (restrito por permissões).</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Novo membro</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="joao@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(11) 99999-9999" 
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Criando..." : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Membros ({items.length}) {loading ? "carregando..." : ""}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items.map(m => (
              <li key={m.id} className="rounded-md border p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{m.full_name}</span>
                    {m.email && <div className="text-sm text-muted-foreground">{m.email}</div>}
                    {m.phone && <div className="text-sm text-muted-foreground">{m.phone}</div>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
