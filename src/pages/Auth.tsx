import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, signInSchema, type SignUpFormData, type SignInFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft } from "lucide-react";

// Traduz mensagens de erro do Supabase para português
function translateAuthError(error: string): string {
  const translations: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos",
    "Email not confirmed": "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
    "User already registered": "Este e-mail já está cadastrado",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres",
    "For security purposes, you can only request this once every 60 seconds": 
      "Por segurança, aguarde 60 segundos antes de tentar novamente",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos.",
    "Invalid email": "E-mail inválido",
    "Signup requires a valid password": "Senha inválida",
  };
  
  for (const [key, value] of Object.entries(translations)) {
    if (error.includes(key)) return value;
  }
  return error;
}

export default function AuthPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [view, setView] = useState<"auth" | "forgot">("auth");
  const [resetEmail, setResetEmail] = useState("");

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    setSEO("Entrar | Cuidar+", "Autenticação para acessar o Cuidar+");
    
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSignUp(data: SignUpFormData) {
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    
    setLoading(false);
    
    if (error) {
      toast({ 
        title: "Erro ao criar conta", 
        description: translateAuthError(error.message), 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ 
      title: "Conta criada!", 
      description: "Verifique seu e-mail para confirmar o cadastro." 
    });
    signUpForm.reset();
  }

  async function handleSignIn(data: SignInFormData) {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });
    
    setLoading(false);
    
    if (error) {
      toast({ 
        title: "Erro ao entrar", 
        description: translateAuthError(error.message), 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ title: "Bem-vindo de volta!" });
  }

  async function handlePasswordReset() {
    const email = resetEmail.trim().toLowerCase();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Digite um e-mail válido para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "E-mail enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
    setView("auth");
    setResetEmail("");
  }

  // Componente de input de senha com toggle de visibilidade
  const PasswordInput = ({ 
    field, 
    show, 
    onToggle, 
    placeholder = "••••••••" 
  }: { 
    field: any; 
    show: boolean; 
    onToggle: () => void; 
    placeholder?: string;
  }) => (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className="pl-10 pr-10"
        {...field}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
        onClick={onToggle}
        tabIndex={-1}
      >
        {show ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );

  // Tela de recuperação de senha
  if (view === "forgot") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setView("auth")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Recuperar Senha
            </CardTitle>
            <CardDescription>
              Digite seu e-mail para receber um link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordReset()}
              />
            </div>
            <Button
              onClick={handlePasswordReset}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cuidar+</CardTitle>
          <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
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
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="email" 
                              placeholder="seu@email.com"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
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
                          <PasswordInput 
                            field={field} 
                            show={showPassword} 
                            onToggle={() => setShowPassword(!showPassword)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm text-muted-foreground"
                      onClick={() => setView("forgot")}
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
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="email" 
                              placeholder="seu@email.com"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
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
                          <PasswordInput 
                            field={field} 
                            show={showPassword} 
                            onToggle={() => setShowPassword(!showPassword)} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Mínimo 8 caracteres, com maiúscula, minúscula e número
                        </p>
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
                          <PasswordInput 
                            field={field} 
                            show={showConfirmPassword} 
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)} 
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
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
