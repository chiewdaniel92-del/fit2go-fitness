import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "requesting" | "recording" | "stopped" | "error";

interface UseAudioRecorderOptions {
  maxDuration?: number; // in seconds
  onTimeUpdate?: (elapsed: number) => void;
}

interface UseAudioRecorderReturn {
  state: RecordingState;
  audioBlob: Blob | null;
  audioUrl: string | null;
  elapsedTime: number;
  analyserNode: AnalyserNode | null;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

export function useAudioRecorder({
  maxDuration = 60,
  onTimeUpdate,
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const updateTimer = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setElapsedTime(elapsed);
    onTimeUpdate?.(elapsed);

    if (elapsed >= maxDuration) {
      stopRecording();
      return;
    }

    timerRef.current = requestAnimationFrame(updateTimer);
  }, [maxDuration, onTimeUpdate]);

  const startRecording = useCallback(async () => {
    try {
      setState("requesting");
      setErrorMessage(null);

      console.log("[AudioRecorder] Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("[AudioRecorder] Microphone access granted");

      streamRef.current = stream;

      // Set up audio context and analyser for waveform visualization
      const audioContext = new AudioContext();
      
      // Resume audio context if it's suspended (required by some browsers)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
        console.log("[AudioRecorder] AudioContext resumed");
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // Configure analyser for better visualization
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("stopped");
        console.log("[AudioRecorder] Recording stopped, blob created");
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      // IMPORTANT: Set analyserNode BEFORE changing state to "recording"
      // This ensures the waveform component receives both values together
      setAnalyserNode(analyser);
      
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setState("recording");
      timerRef.current = requestAnimationFrame(updateTimer);

      console.log("[AudioRecorder] Recording started");
    } catch (error) {
      console.error("[AudioRecorder] Error accessing microphone:", error);
      setState("error");
      
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          setErrorMessage("Microphone access was denied. Please allow microphone access to continue.");
        } else if (error.name === "NotFoundError") {
          setErrorMessage("No microphone found. Please connect a microphone and try again.");
        } else {
          setErrorMessage("Unable to access microphone. Please check your device settings.");
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    }
  }, [updateTimer]);

  const stopRecording = useCallback(() => {
    console.log("[AudioRecorder] Stopping recording...");
    
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAnalyserNode(null);
  }, []);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedTime(0);
    setErrorMessage(null);
    setState("idle");
    console.log("[AudioRecorder] Recording reset");
  }, [audioUrl]);

  return {
    state,
    audioBlob,
    audioUrl,
    elapsedTime,
    analyserNode,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
