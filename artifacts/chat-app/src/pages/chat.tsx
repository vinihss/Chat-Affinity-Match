import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneMissed, SkipForward, Send, Loader2, UserRound, Wifi, WifiOff } from "lucide-react";
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
import { useMediaStream } from "@/contexts/media-stream-context";
import { useWebRTC } from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

export default function Chat() {
  const params = useParams();
  const matchId = params.matchId!;
  const [, setLocation] = useLocation();
  const { userId } = useUserSession();
  const { stream, isSkipped, isMicMuted, isCameraOff, toggleMic, toggleCamera } = useMediaStream();
  const queryClient = useQueryClient();

  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { data: messages = [] } = useGetMessages(matchId, {
    query: {
      enabled: !!matchId,
      refetchInterval: 2000,
      queryKey: getGetMessagesQueryKey(matchId),
    }
  });

  const { data: matchDetails } = useGetQueueStatus(userId || "", {
    query: {
      enabled: !!userId,
      refetchInterval: 5000,
      queryKey: getGetQueueStatusQueryKey(userId || ""),
    }
  });

  const partnerId = matchDetails?.partnerId ?? null;

  const { remoteStream, status: rtcStatus } = useWebRTC(
    matchId,
    userId,
    partnerId,
    stream,
  );

  const sendMessage = useSendMessage();
  const skipMatch = useSkipMatch();
  const endMatch = useEndMatch();

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !userId) return;

    sendMessage.mutate({
      matchId,
      data: { senderId: userId, content: messageInput.trim() }
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

  const noLocalVideo = !stream || isSkipped;
  const remoteConnected = rtcStatus === "connected" && !!remoteStream;
  const rtcConnecting = rtcStatus === "connecting";

  return (
    <div className="h-screen w-full bg-background flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">

        {remoteConnected ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black gap-4">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
              <UserRound className="w-14 h-14 text-white/40" />
            </div>
            {rtcConnecting ? (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Conectando vídeo...</span>
              </div>
            ) : (
              <p className="text-white/40 text-sm">Parceiro sem câmera ativa</p>
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

        {matchDetails?.partnerNickname && (
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">
                  {matchDetails.partnerNickname}
                </h2>
                {!isSkipped && (
                  <div className={`w-2 h-2 rounded-full ${rtcStatus === "connected" ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                )}
              </div>
              {matchDetails.commonTopics && matchDetails.commonTopics.length > 0 && (
                <div className="flex flex-wrap gap-1 md:gap-2 items-center">
                  {matchDetails.commonTopics.map(t => (
                    <Badge key={t} variant="secondary" className="bg-primary/80 text-white border-none text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {matchDetails.affinityScore !== undefined && matchDetails.affinityScore !== null && (
              <Badge variant="outline" className="bg-black/40 text-white border-primary/50 backdrop-blur-sm text-sm py-1 px-2 shrink-0">
                {matchDetails.affinityScore} em comum
              </Badge>
            )}
          </div>
        )}

        {!noLocalVideo && (
          <div className="absolute bottom-24 right-4 md:right-6 w-28 md:w-44 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10 transition-transform hover:scale-105">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="w-6 h-6 text-white/50" />
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex justify-center items-center gap-3 z-20">
          {!noLocalVideo && (
            <>
              <Button
                data-testid="button-toggle-mic"
                variant="outline"
                size="icon"
                className={`w-11 h-11 rounded-full border-none shadow-lg ${isMicMuted ? 'bg-destructive hover:bg-destructive/90 text-white' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'}`}
                onClick={toggleMic}
              >
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                data-testid="button-toggle-camera"
                variant="outline"
                size="icon"
                className={`w-11 h-11 rounded-full border-none shadow-lg ${isCameraOff ? 'bg-destructive hover:bg-destructive/90 text-white' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'}`}
                onClick={toggleCamera}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              <div className="w-px h-8 bg-white/20 mx-1" />
            </>
          )}

          <Button
            data-testid="button-next-user"
            onClick={handleSkip}
            disabled={skipMatch.isPending}
            className="h-11 px-5 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-semibold tracking-wide"
          >
            {skipMatch.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <SkipForward className="w-5 h-5 mr-2" />}
            Próximo
          </Button>

          <Button
            data-testid="button-end-call"
            onClick={handleEnd}
            disabled={endMatch.isPending}
            className="h-11 px-5 rounded-full bg-destructive/80 hover:bg-destructive text-white shadow-lg backdrop-blur-md border-none font-semibold"
          >
            {endMatch.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PhoneMissed className="w-5 h-5 mr-2" />}
            Sair
          </Button>
        </div>
      </div>

      <div className="w-full md:w-80 lg:w-96 bg-card border-l border-card-border flex flex-col z-30 h-[40vh] md:h-auto shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-card-border bg-card/80 backdrop-blur-sm shrink-0">
          <h3 className="font-semibold text-foreground">Chat</h3>
          {isSkipped && (
            <p className="text-xs text-muted-foreground mt-0.5">Sua câmera está desativada</p>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-4 pt-8">
                Diga olá para começar a conversa!
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-muted-foreground mb-1 px-1">
                      {isMe ? 'Você' : msg.senderNickname}
                    </span>
                    <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
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
              data-testid="input-chat-message"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="bg-background/50 border-input focus-visible:ring-primary rounded-full px-4"
              disabled={sendMessage.isPending}
            />
            <Button
              data-testid="button-send-message"
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
