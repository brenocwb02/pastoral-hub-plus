import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setSEO } from "@/lib/seo";

export default function AuthPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setSEO("Entrar | Cuidar+", "Autenticação para acessar o Cuidar+");
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setUserId(sess?.user?.id ?? null));
    return () => { sub?.subscription.unsubscribe(); };
  }, []);

  async function signIn() {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) return toast({ title: "Erro ao enviar link", description: error.message, variant: "destructive" });
    toast({ title: "Verifique seu e-mail", description: "Enviamos um link de acesso." });
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast({ title: "Saiu da conta" });
  }

  return (
    <main className="container mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Autenticação</h1>
        <p className="text-muted-foreground">Use seu e-mail para receber um link mágico.</p>
      </header>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{userId ? "Sessão ativa" : "Entrar com e-mail"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {userId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">ID do usuário: {userId}</p>
              <Button onClick={signOut}>Sair</Button>
            </div>
          ) : (
            <>
              <Input placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button onClick={signIn} disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
