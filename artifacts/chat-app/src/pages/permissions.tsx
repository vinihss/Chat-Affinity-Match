import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Mic, ShieldAlert, ExternalLink, RefreshCw, Info } from "lucide-react";
import { useMediaStream } from "@/contexts/media-stream-context";
import { useEffect } from "react";

function isInsideIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function Permissions() {
  const [, setLocation] = useLocation();
  const { requestPermission, error, hasPermission, isRequesting, permissionDenied } = useMediaStream();
  const inIframe = isInsideIframe();

  useEffect(() => {
    if (hasPermission) {
      setLocation("/fila");
    }
  }, [hasPermission, setLocation]);

  const handleRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      setLocation("/fila");
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

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
            Para conversar em video, precisamos de acesso a sua camera e microfone. Voce pode desativar a qualquer momento.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {inIframe && !error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 text-primary text-sm text-left border border-primary/20">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Para que a camera funcione corretamente, abra o app em uma aba propria do navegador usando o botao abaixo.
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-left border border-destructive/20">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
              {permissionDenied && (
                <div className="text-xs text-destructive/80 space-y-1 pl-8">
                  <p className="font-semibold">Como liberar o acesso:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Clique no cadeado (ou icone de camera) na barra de endereco</li>
                    <li>Mude Camera e Microfone para Permitir</li>
                    <li>Recarregue a pagina e tente novamente</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {inIframe ? (
            <div className="space-y-3">
              <Button
                data-testid="button-open-new-tab"
                className="w-full h-12 text-lg font-semibold"
                onClick={openInNewTab}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Abrir em Nova Aba
              </Button>
              <Button
                data-testid="button-allow-permission"
                variant="outline"
                className="w-full h-11"
                onClick={handleRequest}
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  "Tentar aqui mesmo"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
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
                ) : (
                  "Permitir e Continuar"
                )}
              </Button>
              {(error || permissionDenied) && (
                <Button
                  data-testid="button-open-new-tab"
                  variant="outline"
                  className="w-full h-11"
                  onClick={openInNewTab}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Seus dados sao transmitidos ponto a ponto e nao sao gravados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
