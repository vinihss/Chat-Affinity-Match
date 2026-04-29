import { useEffect, useRef, useState } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com" },
];

interface SignalEntry {
  id: number;
  type: string;
  payload: string;
  fromUserId: string;
}

async function postSignal(matchId: string, type: string, payload: string, fromUserId: string) {
  try {
    await fetch(`/api/matches/${matchId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload, fromUserId }),
    });
  } catch (e) {
    console.warn("[WebRTC] postSignal error:", e);
  }
}

async function fetchSignals(matchId: string, forUserId: string, sinceId: number): Promise<SignalEntry[]> {
  try {
    const res = await fetch(`/api/matches/${matchId}/signal?forUserId=${forUserId}&since=${sinceId}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
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
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescReadyRef = useRef(false);

  // Add tracks when stream becomes available (e.g. user grants camera mid-session)
  useEffect(() => {
    if (!localStream || !pcRef.current) return;
    const pc = pcRef.current;
    const existing = new Set(pc.getSenders().map((s) => s.track?.id));
    localStream.getTracks().forEach((track) => {
      if (!existing.has(track.id)) pc.addTrack(track, localStream);
    });
  }, [localStream]);

  useEffect(() => {
    if (!matchId || !userId || !partnerId) return;

    const isCaller = userId < partnerId;
    pendingCandidatesRef.current = [];
    remoteDescReadyRef.current = false;
    lastSignalIdRef.current = 0;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    setStatus("connecting");

    // Attach local tracks immediately if available
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    // Remote track handler — create stream from incoming tracks
    pc.ontrack = (e) => {
      const incomingStream = e.streams?.[0];
      if (incomingStream) {
        setRemoteStream(incomingStream);
      } else {
        // No stream associated — build one from the track
        setRemoteStream((prev) => {
          const ms = prev ?? new MediaStream();
          ms.addTrack(e.track);
          return new MediaStream(ms.getTracks());
        });
      }
    };

    // Send ICE candidates as they are gathered
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        postSignal(matchId, "ice-candidate", JSON.stringify(e.candidate), userId);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      else if (s === "failed" || s === "closed") setStatus("failed");
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setStatus("connected");
      }
    };

    // Helper: flush buffered ICE candidates after remote description is set
    const flushCandidates = async () => {
      const queued = pendingCandidatesRef.current.splice(0);
      for (const c of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn("[WebRTC] addIceCandidate (flushed) error:", err);
        }
      }
    };

    const applyRemoteDescription = async (sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      remoteDescReadyRef.current = true;
      await flushCandidates();
    };

    // Caller creates offer immediately
    if (isCaller) {
      (async () => {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          await postSignal(matchId, "offer", JSON.stringify(pc.localDescription), userId);
        } catch (err) {
          console.warn("[WebRTC] createOffer error:", err);
        }
      })();
    }

    // Poll for signals every 600ms
    pollTimerRef.current = setInterval(async () => {
      if (!pcRef.current) return;

      const signals = await fetchSignals(matchId, userId, lastSignalIdRef.current);
      for (const sig of signals) {
        if (sig.id > lastSignalIdRef.current) lastSignalIdRef.current = sig.id;

        try {
          if (sig.type === "offer" && !isCaller) {
            if (pcRef.current.signalingState === "stable") {
              await applyRemoteDescription(JSON.parse(sig.payload));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              await postSignal(matchId, "answer", JSON.stringify(pcRef.current.localDescription), userId);
            }
          } else if (sig.type === "answer" && isCaller) {
            if (pcRef.current.signalingState === "have-local-offer") {
              await applyRemoteDescription(JSON.parse(sig.payload));
            }
          } else if (sig.type === "ice-candidate") {
            const c = JSON.parse(sig.payload) as RTCIceCandidateInit;
            if (remoteDescReadyRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            } else {
              pendingCandidatesRef.current.push(c);
            }
          }
        } catch (err) {
          console.warn("[WebRTC] signal handling error:", err, sig);
        }
      }
    }, 600);

    return () => {
      clearInterval(pollTimerRef.current!);
      pollTimerRef.current = null;
      pc.close();
      pcRef.current = null;
      pendingCandidatesRef.current = [];
      remoteDescReadyRef.current = false;
      setStatus("idle");
      setRemoteStream(null);
    };
  }, [matchId, userId, partnerId]); // intentionally excludes localStream

  return { remoteStream, status };
}
