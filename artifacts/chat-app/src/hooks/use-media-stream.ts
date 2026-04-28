import { useState, useCallback, useRef, useEffect } from 'react';

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const requestPermission = useCallback(async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(userStream);
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get media stream'));
      setHasPermission(false);
      return false;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    stream,
    error,
    hasPermission,
    requestPermission,
    stopStream
  };
}
