import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  User, 
  Crown, 
  Users,
  Loader2,
  UserPlus,
  UserMinus
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserRole {
  user_id: string;
  email: string;
  full_name?: string;
  roles: string[];
}

const roleLabels = {
  membro: "Membro",
  discipulador: "Discipulador", 
  lider_casa: "Líder de Casa",
  pastor: "Pastor"
};

const roleIcons = {
  membro: User,
  discipulador: Users,
  lider_casa: Shield,
  pastor: Crown
};

export default function AdminRolesPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setSEO("Gestão de Papéis | Cuidar+", "Gerencie papéis de usuários do sistema");
    checkPermissionAndLoadData();
  }, []);

  const checkPermissionAndLoadData = async () => {
    try {
      setLoading(true);

      // Check if current user is pastor
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Acesso negado",
          description: "Você precisa estar logado para acessar esta página",
          variant: "destructive"
        });
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isPastor = roles?.some(r => r.role === "pastor");
      if (!isPastor) {
        setHasPermission(false);
        toast({
          title: "Acesso negado",
          description: "Apenas pastores podem acessar esta página",
          variant: "destructive"
        });
        return;
      }

      setHasPermission(true);
      await loadUsersAndRoles();

    } catch (error) {
      console.error("Error checking permissions:", error);
      toast({
        title: "Erro",
        description: "Erro ao verificar permissões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsersAndRoles = async () => {
    try {
      // Use the secure RPC function to get users with roles
      const { data, error } = await supabase.rpc('get_users_with_roles');

      if (error) throw error;

      // Transform data to match our UserRole interface
      const usersWithRoles: UserRole[] = (data || []).map((user: any) => ({
        user_id: user.user_id,
        email: user.email || 'Email não disponível',
        full_name: user.full_name,
        roles: user.roles || []
      }));

      setUsers(usersWithRoles);

    } catch (error) {
      console.error("Error loading users and roles:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os usuários e papéis",
        variant: "destructive"
      });
    }
  };

  const addRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as "pastor" | "discipulador" | "lider_casa" | "membro" });

      if (error) throw error;

      toast({
        title: "Papel adicionado",
        description: `Papel ${roleLabels[role as keyof typeof roleLabels]} adicionado com sucesso`
      });

      await loadUsersAndRoles();
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Erro ao adicionar papel",
        description: "Não foi possível adicionar o papel",
        variant: "destructive"
      });
    }
  };

  const removeRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as "pastor" | "discipulador" | "lider_casa" | "membro");

      if (error) throw error;

      toast({
        title: "Papel removido",
        description: `Papel ${roleLabels[role as keyof typeof roleLabels]} removido com sucesso`
      });

      await loadUsersAndRoles();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "Erro ao remover papel",
        description: "Não foi possível remover o papel",
        variant: "destructive"
      });
    }
  };

  const getUserDisplayName = (user: UserRole) => {
    return user.full_name || user.email || `Usuário ${user.user_id.slice(0, 8)}...`;
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Gestão de Papéis</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </header>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    );
  }

  if (!hasPermission) {
    return (
      <main className="container mx-auto p-4 space-y-4">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Esta página é restrita a usuários com papel de Pastor.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Gestão de Papéis</h1>
        <p className="text-muted-foreground">Gerencie os papéis dos usuários do sistema.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Usuários e Papéis ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário encontrado com papéis atribuídos.
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user.user_id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{getUserDisplayName(user)}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {user.roles.map((role) => {
                        const Icon = roleIcons[role as keyof typeof roleIcons];
                        return (
                          <Badge key={role} variant="default" className="flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {roleLabels[role as keyof typeof roleLabels]}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Select onValueChange={(role) => addRole(user.user_id, role)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Adicionar papel" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem 
                            key={value} 
                            value={value}
                            disabled={user.roles.includes(value)}
                          >
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {user.roles.map((role) => (
                      <AlertDialog key={`remove-${role}`}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <UserMinus className="w-3 h-3 mr-1" />
                            Remover {roleLabels[role as keyof typeof roleLabels]}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o papel de {roleLabels[role as keyof typeof roleLabels]} 
                              do usuário {getUserDisplayName(user)}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeRole(user.user_id, role)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}