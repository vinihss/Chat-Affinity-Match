import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneMissed, SkipForward, Send, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { 
  useGetMessages, 
  useSendMessage, 
  useSkipMatch, 
  useEndMatch, 
  getGetMessagesQueryKey,
  useGetQueueStatus,
  getGetQueueStatusQueryKey
} from "@workspace/api-client-react";
import { useUserSession } from "@/hooks/use-user-session";
import { useMediaStream } from "@/hooks/use-media-stream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

export default function Chat() {
  const params = useParams();
  const matchId = params.matchId!;
  const [, setLocation] = useLocation();
  const { userId } = useUserSession();
  const { stream } = useMediaStream();
  const queryClient = useQueryClient();

  const [messageInput, setMessageInput] = useState("");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Poll for messages
  const { data: messages = [] } = useGetMessages(matchId, {
    query: {
      enabled: !!matchId,
      refetchInterval: 2000,
      queryKey: getGetMessagesQueryKey(matchId),
    }
  });

  // Poll for queue status to get partner details
  const { data: matchDetails } = useGetQueueStatus(userId || "", {
    query: {
      enabled: !!userId,
      refetchInterval: 5000,
      queryKey: getGetQueueStatusQueryKey(userId || ""),
    }
  });

  const sendMessage = useSendMessage();
  const skipMatch = useSkipMatch();
  const endMatch = useEndMatch();

  // Handle stream assignment
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
    // Simulate remote video with local stream for now
    if (remoteVideoRef.current && stream) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle media controls
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff;
      });
    }
  }, [stream, isMicMuted, isVideoOff]);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle match ended
  useEffect(() => {
    if (matchDetails && matchDetails.status === "waiting") {
      // Partner skipped or ended, or we did
      setLocation("/fila");
    }
  }, [matchDetails, setLocation]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !userId) return;

    sendMessage.mutate({
      matchId,
      data: {
        senderId: userId,
        content: messageInput.trim()
      }
    }, {
      onSuccess: () => {
        setMessageInput("");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(matchId) });
      }
    });
  };

  const handleSkip = () => {
    if (!userId) return;
    skipMatch.mutate({ matchId, data: { userId } }, {
      onSuccess: () => setLocation("/fila")
    });
  };

  const handleEnd = () => {
    if (!userId) return;
    endMatch.mutate({ matchId, data: { userId } }, {
      onSettled: () => setLocation("/")
    });
  };

  if (!userId) {
    setLocation("/");
    return null;
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {/* Remote Video (simulated) */}
        <video 
          ref={remoteVideoRef}
          autoPlay 
          playsInline 
          className="w-full h-full object-cover opacity-90 scale-x-[-1]"
        />
        
        {/* Overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

        {/* Top Info Bar */}
        {matchDetails && matchDetails.partnerNickname && (
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white drop-shadow-md">
                Falando com {matchDetails.partnerNickname}
              </h2>
              {matchDetails.commonTopics && matchDetails.commonTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-white/80 py-1">Tópicos em comum:</span>
                  {matchDetails.commonTopics.map(t => (
                    <Badge key={t} variant="secondary" className="bg-primary/80 text-white border-none">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {matchDetails.affinityScore !== undefined && matchDetails.affinityScore !== null && (
              <Badge variant="outline" className="bg-black/40 text-primary-foreground border-primary/50 backdrop-blur-sm text-lg py-1 px-3">
                Afinidade: {matchDetails.affinityScore}%
              </Badge>
            )}
          </div>
        )}

        {/* Local Video PIP */}
        <div className="absolute bottom-24 right-6 w-32 md:w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10 transition-transform hover:scale-105">
          <video 
            ref={localVideoRef}
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff className="w-8 h-8 text-white/50" />
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center items-center gap-4 z-20">
          <Button 
            variant="outline" 
            size="icon"
            className={`w-12 h-12 rounded-full border-none shadow-lg ${isMicMuted ? 'bg-destructive hover:bg-destructive/90 text-white' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'}`}
            onClick={() => setIsMicMuted(!isMicMuted)}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button 
            variant="outline" 
            size="icon"
            className={`w-12 h-12 rounded-full border-none shadow-lg ${isVideoOff ? 'bg-destructive hover:bg-destructive/90 text-white' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'}`}
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <div className="w-px h-8 bg-white/20 mx-2" />

          <Button 
            onClick={handleSkip}
            disabled={skipMatch.isPending}
            className="h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-semibold tracking-wide"
          >
            {skipMatch.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <SkipForward className="w-5 h-5 mr-2" />}
            Próximo
          </Button>

          <Button 
            onClick={handleEnd}
            disabled={endMatch.isPending}
            className="h-12 px-6 rounded-full bg-destructive/80 hover:bg-destructive text-white shadow-lg backdrop-blur-md border-none font-semibold"
          >
            {endMatch.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PhoneMissed className="w-5 h-5 mr-2" />}
            Sair
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-80 lg:w-96 bg-card border-l border-card-border flex flex-col z-30 h-1/3 md:h-auto shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-card-border bg-card/80 backdrop-blur-sm shrink-0">
          <h3 className="font-semibold text-foreground">Chat</h3>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-4">
                Diga olá para começar a conversa!
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <span className="text-xs text-muted-foreground mb-1 px-1">
                      {isMe ? 'Você' : msg.senderNickname}
                    </span>
                    <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted text-muted-foreground rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 bg-card shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="bg-background/50 border-input focus-visible:ring-primary rounded-full px-4"
              disabled={sendMessage.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!messageInput.trim() || sendMessage.isPending}
              className="rounded-full shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
