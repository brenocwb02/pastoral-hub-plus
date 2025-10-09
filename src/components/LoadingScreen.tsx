import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Carregando..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-16 h-16 mb-4 relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary-glow opacity-20 animate-pulse"></div>
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
