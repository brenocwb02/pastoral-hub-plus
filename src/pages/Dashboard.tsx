import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setSEO } from "@/lib/seo";

export default function Dashboard() {
  useEffect(() => {
    setSEO("Dashboard | Cuidar+", "Resumo e navegação do Cuidar+");
  }, []);

  const links = [
    { to: "/members", label: "Membros" },
    { to: "/houses", label: "Casas" },
    { to: "/one-on-ones", label: "Encontros 1 a 1" },
    { to: "/meetings", label: "Reuniões gerais" },
    { to: "/plans", label: "Planos de estudo" },
    { to: "/progress", label: "Progresso" },
    { to: "/calendar", label: "Calendário" },
  ];

  return (
    <main className="container mx-auto p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Acesse as seções principais do Cuidar+.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="rounded-md border p-4 hover:bg-muted/50 transition">
            {l.label}
          </Link>
        ))}
      </section>
    </main>
  );
}
