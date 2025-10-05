import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CalendarPage from "./pages/Calendar";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MembersPage from "./pages/Members";
import MemberDetailsPage from "./pages/MemberDetails";
import HousesPage from "./pages/Houses";
import OneOnOnesPage from "./pages/OneOnOnes";
import MeetingsPage from "./pages/Meetings";
import PlansPage from "./pages/Plans";
import ProgressPage from "./pages/Progress";
import AdminRolesPage from "./pages/AdminRoles";
import ReportsPage from "./pages/Reports";
import AuditLogsPage from "./pages/AuditLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/members/:id" element={<ProtectedRoute><MemberDetailsPage /></ProtectedRoute>} />
          <Route path="/houses" element={<ProtectedRoute><HousesPage /></ProtectedRoute>} />
          <Route path="/one-on-ones" element={<ProtectedRoute><OneOnOnesPage /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute><AdminRolesPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
