import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Mic, ShieldAlert, ExternalLink, RefreshCw } from "lucide-react";
import { useMediaStream } from "@/contexts/media-stream-context";
import { useEffect } from "react";

function getDirectAppUrl(path: string) {
  return window.location.origin + path;
}

export default function Permissions() {
  const [, setLocation] = useLocation();
  const { requestPermission, error, hasPermission, isRequesting, permissionDenied } = useMediaStream();

  useEffect(() => {
    if (hasPermission) {
      setLocation("/fila");
    }
  }, [hasPermission, setLocation]);

  const handleRequest = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.open(getDirectAppUrl("/permissoes"), "_blank", "noopener,noreferrer");
      return;
    }
    const granted = await requestPermission();
    if (granted) {
      setLocation("/fila");
    }
  };

  const openDirect = () => {
    window.open(getDirectAppUrl("/permissoes"), "_blank", "noopener,noreferrer");
  };

  const noMediaDevices = typeof navigator !== "undefined" && !navigator.mediaDevices;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-card-border shadow-2xl relative z-10 text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center gap-6 text-primary mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Camera e Microfone
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-[85%] mx-auto">
            Para conversar em video, o app precisa acessar sua camera e microfone. Voce pode silenciar a qualquer momento.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {error && (
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-left border border-destructive/20">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
              {permissionDenied && (
                <div className="text-xs text-destructive/80 space-y-1 pl-2">
                  <p className="font-semibold">Como liberar o acesso no navegador:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Clique no cadeado na barra de endereco do navegador</li>
                    <li>Mude Camera e Microfone para Permitir</li>
                    <li>Recarregue esta pagina e clique em Permitir novamente</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {noMediaDevices && !error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 text-amber-400 text-sm text-left border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Seu navegador nao consegue acessar a camera aqui. Abra o app em uma nova aba clicando no botao abaixo.
              </p>
            </div>
          )}

          <Button
            data-testid="button-allow-permission"
            className="w-full h-12 text-lg font-semibold"
            onClick={handleRequest}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Solicitando acesso...
              </>
            ) : noMediaDevices ? (
              <>
                <ExternalLink className="w-5 h-5 mr-2" />
                Abrir em Nova Aba
              </>
            ) : (
              "Permitir e Continuar"
            )}
          </Button>

          {!noMediaDevices && (
            <button
              data-testid="button-open-direct"
              onClick={openDirect}
              className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors flex items-center justify-center gap-1 py-1"
            >
              <ExternalLink className="w-3 h-3" />
              Nao funcionou? Abrir em nova aba
            </button>
          )}

          <p className="text-xs text-muted-foreground">
            Seus dados sao transmitidos ponto a ponto e nao sao gravados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
