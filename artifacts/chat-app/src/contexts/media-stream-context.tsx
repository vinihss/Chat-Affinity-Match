import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface MediaStreamContextValue {
  stream: MediaStream | null;
  hasPermission: boolean;
  permissionDenied: boolean;
  isRequesting: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  stopStream: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

const MediaStreamContext = createContext<MediaStreamContextValue | null>(null);

export function MediaStreamProvider({ children }: { children: React.ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) {
      return true;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Seu navegador não suporta acesso à câmera e microfone. Tente abrir o app em uma nova aba.");
      return false;
    }

    setIsRequesting(true);
    setError(null);
    setPermissionDenied(false);

    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = userStream;
      setStream(userStream);
      setHasPermission(true);
      setIsRequesting(false);
      return true;
    } catch (err) {
      setIsRequesting(false);
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionDenied(true);
          setError("Permissão negada. Clique no cadeado na barra de endereço do seu navegador e permita câmera e microfone.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("Câmera ou microfone não encontrado. Verifique se os dispositivos estão conectados.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setError("Câmera ou microfone já está em uso por outro aplicativo.");
        } else if (err.name === "OverconstrainedError") {
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = fallbackStream;
            setStream(fallbackStream);
            setHasPermission(true);
            return true;
          } catch {
            setError("Não foi possível acessar os dispositivos com as configurações solicitadas.");
          }
        } else {
          setError(`Erro ao acessar mídia: ${err.message}`);
        }
      } else {
        setError("Erro inesperado ao solicitar permissões.");
      }
      setHasPermission(false);
      return false;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
      setHasPermission(false);
    }
  }, []);

  const toggleMic = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    const newMuted = !isMicMuted;
    s.getAudioTracks().forEach((t) => { t.enabled = !newMuted; });
    setIsMicMuted(newMuted);
  }, [isMicMuted]);

  const toggleCamera = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    const newOff = !isCameraOff;
    s.getVideoTracks().forEach((t) => { t.enabled = !newOff; });
    setIsCameraOff(newOff);
  }, [isCameraOff]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <MediaStreamContext.Provider value={{
      stream,
      hasPermission,
      permissionDenied,
      isRequesting,
      error,
      requestPermission,
      stopStream,
      toggleMic,
      toggleCamera,
      isMicMuted,
      isCameraOff,
    }}>
      {children}
    </MediaStreamContext.Provider>
  );
}

export function useMediaStream() {
  const ctx = useContext(MediaStreamContext);
  if (!ctx) throw new Error("useMediaStream must be used inside MediaStreamProvider");
  return ctx;
}
