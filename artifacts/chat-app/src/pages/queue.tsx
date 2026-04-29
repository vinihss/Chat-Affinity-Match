import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUserSession } from "@/hooks/use-user-session";
import { useJoinQueue, useLeaveQueue, useGetQueueStatus, getGetQueueStatusQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Queue() {
  const [, setLocation] = useLocation();
  const { userId } = useUserSession();
  const queryClient = useQueryClient();

  const joinQueue = useJoinQueue();
  const leaveQueue = useLeaveQueue();

  const [hasJoined, setHasJoined] = useState(false);
  const isMatchedRef = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const { data: queueStatus } = useGetQueueStatus(userId || "", {
    query: {
      enabled: !!userId && hasJoined,
      refetchInterval: 2000,
      queryKey: getGetQueueStatusQueryKey(userId || ""),
    }
  });

  useEffect(() => {
    if (!userId) {
      setLocation("/");
      return;
    }
    if (!hasJoined) {
      joinQueue.mutate(
        { data: { userId } },
        {
          onSuccess: () => setHasJoined(true),
          onError: () => setLocation("/"),
        }
      );
    }
  }, [userId, hasJoined]);

  useEffect(() => {
    if (queueStatus?.status === "matched" && queueStatus.matchId) {
      isMatchedRef.current = true;
      setLocation(`/chat/${queueStatus.matchId}`);
    }
  }, [queueStatus?.status, queueStatus?.matchId]);

  useEffect(() => {
    return () => {
      if (!isMatchedRef.current && userIdRef.current) {
        leaveQueue.mutate({ data: { userId: userIdRef.current } });
      }
    };
  }, []);

  const handleCancel = () => {
    isMatchedRef.current = true;
    if (userId) {
      leaveQueue.mutate({ data: { userId } }, {
        onSettled: () => setLocation("/")
      });
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] animation-delay-500" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md text-center space-y-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <Loader2 className="w-12 h-12 text-primary animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Procurando Conexões</h1>
          <p className="text-muted-foreground text-lg">
            Buscando alguém com interesses em comum...
          </p>
        </div>

        {queueStatus && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            <Users className="w-4 h-4" />
            <span>{queueStatus.waitingCount} {queueStatus.waitingCount === 1 ? "pessoa na fila" : "pessoas na fila"}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="lg"
          onClick={handleCancel}
          className="mt-8 border-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          Cancelar Busca
        </Button>
      </div>
    </div>
  );
}
