import { useState } from "react";
import { useLocation } from "wouter";
import { useRegisterUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserSession } from "@/hooks/use-user-session";
import { Loader2 } from "lucide-react";

const TOPICS = [
  "Música", "Filmes", "Jogos", "Esportes", "Tecnologia", 
  "Arte", "Culinária", "Viagens", "Moda", "Política", 
  "Ciência", "Livros", "Séries", "Animais", "Humor", 
  "Fitness", "Fotografia", "Teatro", "Dança", "Idiomas"
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { login } = useUserSession();
  const registerMutation = useRegisterUser();
  
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      if (selectedTopics.length < 5) {
        setSelectedTopics([...selectedTopics, topic]);
      }
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError("Por favor, digite um apelido.");
      return;
    }
    if (!gender) {
      setError("Por favor, selecione seu gênero.");
      return;
    }
    if (selectedTopics.length === 0) {
      setError("Por favor, selecione pelo menos um tópico.");
      return;
    }
    
    setError("");

    registerMutation.mutate({
      data: {
        nickname,
        gender,
        topics: selectedTopics,
      }
    }, {
      onSuccess: (user) => {
        login(user.id);
        setLocation("/permissoes");
      },
      onError: () => {
        setError("Ocorreu um erro ao registrar. Tente novamente.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-card-border shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold tracking-tight bg-gradient-to-br from-primary via-accent to-primary-foreground bg-clip-text text-transparent">
            Afinidade
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            Conexões reais, baseadas no que você ama.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center border border-destructive/20">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-foreground/90">Apelido</Label>
            <Input 
              id="nickname"
              placeholder="Como quer ser chamado?" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="bg-background/50 border-input focus:ring-primary"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-foreground/90">Gênero</Label>
            <div className="grid grid-cols-3 gap-2">
              {["Masculino", "Feminino", "Outro"].map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={gender === g ? "default" : "outline"}
                  className={`w-full ${gender === g ? 'shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-background/50 hover:bg-background/80'}`}
                  onClick={() => setGender(g)}
                >
                  {g}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-foreground/90">Tópicos de Interesse</Label>
              <span className="text-xs text-muted-foreground">{selectedTopics.length}/5</span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1 scrollbar-thin">
              {TOPICS.map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                const isDisabled = !isSelected && selectedTopics.length >= 5;
                return (
                  <Badge
                    key={topic}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 text-sm transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary),0.4)]' 
                        : isDisabled
                          ? 'opacity-50 cursor-not-allowed bg-background/30'
                          : 'bg-background/50 hover:bg-background/80 hover:border-primary/50 text-foreground'
                    }`}
                    onClick={() => !isDisabled && toggleTopic(topic)}
                  >
                    {topic}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg font-semibold tracking-wide bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary),0.6)] border-0"
            onClick={handleJoin}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            Entrar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
