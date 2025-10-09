import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User, Mail, Phone, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { formatPhone } from "@/lib/formatters";

const profileSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const { roles, isLoading: rolesLoading } = useUserRoles();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  useEffect(() => {
    setSEO("Meu Perfil | Cuidar+", "Gerencie suas informações pessoais");
  }, []);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
          return;
        }

        setUserEmail(user.email || "");

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error loading profile:", error);
          toast({ title: "Erro ao carregar perfil", description: error.message, variant: "destructive" });
        } else if (profile) {
          form.reset({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [form, toast]);

  async function onSubmit(data: ProfileFormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: data.full_name,
          phone: data.phone || null,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        toast({ title: "Erro ao atualizar perfil", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Perfil atualizado com sucesso!" });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Erro", description: "Ocorreu um erro ao atualizar o perfil", variant: "destructive" });
    }
  }

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seus dados cadastrais</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <Mail className="h-4 w-4" />
                <span><strong>Email:</strong> {userEmail}</span>
              </div>

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
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
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          maxLength={15}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões e Funções
          </CardTitle>
          <CardDescription>Suas funções no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma função atribuída</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role === 'pastor' && '✝️ Pastor'}
                  {role === 'discipulador' && '📖 Discipulador'}
                  {role === 'lider_casa' && '🏠 Líder de Casa'}
                  {role === 'membro' && '👤 Membro'}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            As permissões determinam o que você pode acessar e fazer no sistema.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
