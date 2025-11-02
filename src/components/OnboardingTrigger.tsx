import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export function OnboardingTrigger() {
  const { hasCompletedOnboarding, startOnboarding } = useOnboarding();
  const location = useLocation();

  useEffect(() => {
    // Auto-start onboarding for first-time users on dashboard
    if (!hasCompletedOnboarding && location.pathname === '/dashboard') {
      const timer = setTimeout(() => {
        startOnboarding('dashboard');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, location.pathname]);

  const handleManualStart = () => {
    let page: 'dashboard' | 'members' | 'houses' = 'dashboard';
    
    if (location.pathname === '/members') page = 'members';
    else if (location.pathname === '/houses') page = 'houses';
    
    startOnboarding(page);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleManualStart}
      className="fixed bottom-4 left-4 z-40"
      title="Iniciar tour guiado"
    >
      <HelpCircle className="w-4 h-4 mr-2" />
      Tour Guiado
    </Button>
  );
}
