import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Mic, ShieldAlert } from "lucide-react";
import { useMediaStream } from "@/hooks/use-media-stream";
import { useEffect, useState } from "react";

export default function Permissions() {
  const [, setLocation] = useLocation();
  const { requestPermission, error, hasPermission } = useMediaStream();
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // If already granted, move on
    if (hasPermission) {
      setLocation("/fila");
    }
  }, [hasPermission, setLocation]);

  const handleRequest = async () => {
    setIsRequesting(true);
    const granted = await requestPermission();
    setIsRequesting(false);
    
    if (granted) {
      setLocation("/fila");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-card-border shadow-2xl relative z-10 text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center gap-6 text-primary mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Câmera e Microfone
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-[80%] mx-auto">
            Para uma experiência completa, precisamos de acesso à sua câmera e microfone. 
            Você poderá desativá-los a qualquer momento durante a chamada.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-left border border-destructive/20">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <p>
                Acesso negado. Por favor, permita o acesso nas configurações do seu navegador para continuar.
              </p>
            </div>
          )}

          <Button 
            className="w-full h-12 text-lg font-semibold"
            onClick={handleRequest}
            disabled={isRequesting}
          >
            {isRequesting ? "Solicitando..." : "Permitir e Continuar"}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Seus dados são transmitidos ponto a ponto e não são gravados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
