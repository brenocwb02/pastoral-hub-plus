import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CalendarPage from "./pages/Calendar";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MembersPage from "./pages/Members";
import HousesPage from "./pages/Houses";
import OneOnOnesPage from "./pages/OneOnOnes";
import MeetingsPage from "./pages/Meetings";
import PlansPage from "./pages/Plans";
import ProgressPage from "./pages/Progress";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <nav className="border-b">
          <div className="container mx-auto h-12 flex items-center gap-4">
            <Link to="/" className="font-semibold">Cuidar+</Link>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/members" className="text-sm text-muted-foreground hover:text-foreground">Membros</Link>
            <Link to="/houses" className="text-sm text-muted-foreground hover:text-foreground">Casas</Link>
            <Link to="/one-on-ones" className="text-sm text-muted-foreground hover:text-foreground">1 a 1</Link>
            <Link to="/meetings" className="text-sm text-muted-foreground hover:text-foreground">Reuniões</Link>
            <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground">Planos</Link>
            <Link to="/progress" className="text-sm text-muted-foreground hover:text-foreground">Progresso</Link>
            <Link to="/calendar" className="text-sm text-muted-foreground hover:text-foreground">Calendário</Link>
            <div className="ml-auto" />
            <Link to="/auth" className="text-sm">Entrar</Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/houses" element={<HousesPage />} />
          <Route path="/one-on-ones" element={<OneOnOnesPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
