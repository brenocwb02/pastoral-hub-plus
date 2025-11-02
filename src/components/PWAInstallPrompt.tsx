import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    setDismissed(wasDismissed === 'true');
  }, []);

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setDismissed(true);
  };

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-primary/20 animate-in slide-in-from-bottom">
      <CardContent className="p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Instalar Cuidar+</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Instale o app no seu dispositivo para acesso rápido e notificações.
            </p>
            <Button 
              onClick={handleInstall} 
              size="sm" 
              className="w-full"
            >
              Instalar Agora
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
