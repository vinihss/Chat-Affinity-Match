import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface SignalEntry {
  id: number;
  type: string;
  payload: string;
  fromUserId: string;
}

async function postSignal(matchId: string, type: string, payload: string, fromUserId: string) {
  await fetch(`/api/matches/${matchId}/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload, fromUserId }),
  });
}

async function pollSignals(matchId: string, forUserId: string, sinceId: number): Promise<SignalEntry[]> {
  const res = await fetch(`/api/matches/${matchId}/signal?forUserId=${forUserId}&since=${sinceId}`);
  if (!res.ok) return [];
  return res.json();
}

export type WebRTCStatus = "idle" | "connecting" | "connected" | "failed";

export function useWebRTC(
  matchId: string | null,
  userId: string | null,
  partnerId: string | null,
  localStream: MediaStream | null,
) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<WebRTCStatus>("idle");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const lastSignalIdRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCaller = useRef(false);
  const isSetupDone = useRef(false);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setStatus("idle");
    isSetupDone.current = false;
  }, []);

  const setupPeerConnection = useCallback(async () => {
    if (!matchId || !userId || !partnerId || isSetupDone.current) return;
    isSetupDone.current = true;

    isCaller.current = userId < partnerId;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    setStatus("connecting");

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    const remoteMs = new MediaStream();
    setRemoteStream(remoteMs);

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => remoteMs.addTrack(track));
      setRemoteStream(new MediaStream(remoteMs.getTracks()));
    };

    pc.onicecandidate = async (e) => {
      if (e.candidate && matchId && userId) {
        await postSignal(matchId, "ice-candidate", JSON.stringify(e.candidate), userId);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") setStatus("connected");
      else if (state === "failed" || state === "closed") setStatus("failed");
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setStatus("connected");
      }
    };

    if (isCaller.current) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      await postSignal(matchId, "offer", JSON.stringify(offer), userId);
    }

    pollTimerRef.current = setInterval(async () => {
      if (!pcRef.current || !matchId || !userId) return;

      const signals = await pollSignals(matchId, userId, lastSignalIdRef.current);
      if (signals.length === 0) return;

      for (const sig of signals) {
        if (sig.id > lastSignalIdRef.current) lastSignalIdRef.current = sig.id;

        try {
          if (sig.type === "offer" && !isCaller.current) {
            await pcRef.current.setRemoteDescription(JSON.parse(sig.payload));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            await postSignal(matchId, "answer", JSON.stringify(answer), userId);
          } else if (sig.type === "answer" && isCaller.current) {
            if (pcRef.current.signalingState === "have-local-offer") {
              await pcRef.current.setRemoteDescription(JSON.parse(sig.payload));
            }
          } else if (sig.type === "ice-candidate") {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(sig.payload)));
            }
          }
        } catch (err) {
          console.warn("Signal handling error:", err);
        }
      }
    }, 500);
  }, [matchId, userId, partnerId, localStream]);

  useEffect(() => {
    if (matchId && userId && partnerId && localStream) {
      setupPeerConnection();
    }
    return () => {
      if (!matchId) cleanup();
    };
  }, [matchId, userId, partnerId, localStream]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return { remoteStream, status };
}
