import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-6 w-6" />
                <CardTitle>Oops! Algo deu errado</CardTitle>
              </div>
              <CardDescription>
                Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <details className="text-sm bg-muted p-3 rounded-md">
                  <summary className="cursor-pointer font-medium mb-2">Detalhes técnicos</summary>
                  <code className="text-xs text-muted-foreground break-all">
                    {this.state.error.message}
                  </code>
                </details>
              )}
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                  Recarregar Página
                </Button>
                <Button onClick={this.handleReset} className="flex-1">
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
