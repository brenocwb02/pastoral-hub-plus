import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  LayoutDashboard, 
  Users, 
  Building2, 
  MessageCircle, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  History,
  Bell,
  FileText,
  Library,
  BarChart3,
  Trophy,
  MessageSquare,
  Lock,
  HomeIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRoles } from "@/hooks/useUserRoles";
import { NotificationBell } from "@/components/NotificationBell";

const navigationItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leader-dashboard", label: "Dashboard Líder", icon: HomeIcon, requiresRole: "lider_casa" },
  { href: "/members", label: "Membros", icon: Users },
  { href: "/houses", label: "Igrejas no Lar", icon: Building2 },
  { href: "/one-on-ones", label: "1 a 1", icon: MessageCircle },
  { href: "/meetings", label: "Reuniões", icon: Calendar },
  { href: "/plans", label: "Planos", icon: BookOpen },
  { href: "/progress", label: "Progresso", icon: TrendingUp },
  { href: "/calendar", label: "Calendário", icon: Calendar },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/reports", label: "Relatórios", icon: FileText },
  { href: "/resources", label: "Recursos", icon: Library },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/achievements", label: "Conquistas", icon: Trophy },
  { href: "/messages", label: "Mensagens", icon: MessageSquare },
  { href: "/admin/roles", label: "Papéis", icon: UserIcon },
  { href: "/admin/audit", label: "Auditoria", icon: History },
];

export function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  // Estado para armazenar a sessão do usuário
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { roles, isLoading: rolesLoading } = useUserRoles();

  // Efeito para verificar o estado de autenticação ao carregar o componente
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    fetchUser();

    // Ouve mudanças no estado de autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_IN') {
        setIsOpen(false); // Fecha o menu mobile ao logar
      }
    });

    // Limpa a inscrição ao desmontar o componente
    return () => subscription.unsubscribe();
  }, []);

  // Função para fazer logout
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // O onAuthStateChange vai atualizar o estado do usuário para null
  };
  
  // Extrai as iniciais do email para o Avatar
  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto h-16 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C+</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Cuidar+
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            // Hide certain links based on roles
            if ((item.href === '/admin/roles' || item.href === '/admin/audit') && !roles.includes('pastor')) {
              return null;
            }
            
            // Hide reports if not pastor or lider_casa
            if (item.href === '/reports' && !roles.includes('pastor') && !roles.includes('lider_casa')) {
              return null;
            }

            // Hide leader dashboard if not lider_casa
            if (item.href === '/leader-dashboard' && !roles.includes('lider_casa')) {
              return null;
            }
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Botão de Autenticação ou Menu do Usuário (Desktop) */}
        <div className="hidden md:flex items-center space-x-2">
          {user && <NotificationBell />}
          {loading ? (
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="Avatar" />
                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Minha Conta</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profile" className="flex w-full">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/privacy" className="flex w-full">
                    <Lock className="mr-2 h-4 w-4" />
                    <span>Privacidade (LGPD)</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              // Hide certain links based on roles
              if ((item.href === '/admin/roles' || item.href === '/admin/audit') && !roles.includes('pastor')) {
                return null;
              }
              
              // Hide reports if not pastor or lider_casa
              if (item.href === '/reports' && !roles.includes('pastor') && !roles.includes('lider_casa')) {
                return null;
              }

              // Hide leader dashboard if not lider_casa
              if (item.href === '/leader-dashboard' && !roles.includes('lider_casa')) {
                return null;
              }
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors w-full",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="pt-4 border-t">
              {user ? (
                 <Button onClick={() => { handleSignOut(); setIsOpen(false); }} variant="outline" className="w-full">
                   <LogOut className="mr-2 h-4 w-4" />
                   Sair ({user.email?.split('@')[0]})
                 </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>Entrar</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
