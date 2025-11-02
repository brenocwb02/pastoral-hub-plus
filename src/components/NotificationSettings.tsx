import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Check } from 'lucide-react';
import { 
  requestNotificationPermission, 
  getNotificationPermission,
  isNotificationSupported 
} from '@/lib/pwa-notifications';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isNotificationSupported()) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);
      setIsEnabled(currentPermission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    setIsEnabled(newPermission === 'granted');

    if (newPermission === 'granted') {
      toast({
        title: 'Notificações ativadas',
        description: 'Você receberá notificações sobre eventos importantes.',
      });
    } else if (newPermission === 'denied') {
      toast({
        title: 'Notificações bloqueadas',
        description: 'Você bloqueou as notificações. Ative-as nas configurações do navegador.',
        variant: 'destructive',
      });
    }
  };

  if (!isNotificationSupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Notificações não são suportadas neste navegador
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba notificações sobre reuniões, encontros e atualizações importantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications">Ativar Notificações</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'granted' 
                ? 'Notificações estão ativadas' 
                : permission === 'denied'
                ? 'Notificações foram bloqueadas'
                : 'Ative para receber alertas'}
            </p>
          </div>
          {permission === 'granted' ? (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Ativo</span>
            </div>
          ) : (
            <Button 
              onClick={handleEnableNotifications}
              disabled={permission === 'denied'}
            >
              Ativar
            </Button>
          )}
        </div>

        {permission === 'denied' && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-3">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              As notificações foram bloqueadas. Para ativá-las, vá até as configurações do seu navegador e permita notificações para este site.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
