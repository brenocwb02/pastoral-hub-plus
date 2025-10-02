import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, signInSchema, type SignUpFormData, type SignInFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function AuthPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0);

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    setSEO("Entrar | Cuidar+", "Autenticação para acessar o Cuidar+");
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSignUp(data: SignUpFormData) {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
    setLoading(false);
    
    if (error) {
      toast({ 
        title: "Erro ao criar conta", 
        description: error.message, 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ 
      title: "Conta criada com sucesso!", 
      description: "Verifique seu e-mail para confirmar sua conta." 
    });
    signUpForm.reset();
  }

  async function handleSignIn(data: SignInFormData) {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    
    setLoading(false);
    
    if (error) {
      toast({ 
        title: "Erro ao fazer login", 
        description: error.message, 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ title: "Login realizado com sucesso!" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast({ title: "Saiu da conta" });
  }

  async function handlePasswordReset() {
    if (resetCooldown > 0) {
      toast({
        title: "Aguarde um momento",
        description: `Por favor, aguarde ${resetCooldown} segundos antes de tentar novamente.`,
        variant: "destructive",
      });
      return;
    }

    if (!resetEmail || !resetEmail.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: redirectUrl,
    });

    setLoading(false);

    if (error) {
      // Handle rate limiting error specifically
      if (error.message.includes("For security purposes")) {
        setResetCooldown(10);
        const interval = setInterval(() => {
          setResetCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        toast({
          title: "Muitas tentativas",
          description: "Por favor, aguarde 10 segundos antes de tentar novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao recuperar senha",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "E-mail enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
    setShowForgotPassword(false);
    setResetEmail("");
  }

  if (userId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle>Sessão Ativa</CardTitle>
            <CardDescription>Você já está autenticado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">ID do usuário: {userId}</p>
            <Button onClick={signOut} className="w-full">Sair</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader>
          <CardTitle>Bem-vindo ao Cuidar+</CardTitle>
          <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reset-email">E-mail para recuperação</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={loading || resetCooldown > 0}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePasswordReset}
                  disabled={loading || resetCooldown > 0}
                  className="flex-1"
                >
                  {loading ? "Enviando..." : resetCooldown > 0 ? `Aguarde ${resetCooldown}s` : "Enviar link"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                  }}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="seu@email.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col gap-2">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loading}
                      >
                        {loading ? "Entrando..." : "Entrar"}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="seu@email.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? "Criando conta..." : "Criar conta"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
