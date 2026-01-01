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
  inputLevel: number; // 0..1 (rough)
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function floatTo16BitPCM(float32: Float32Array) {
  const output = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWav(int16: Int16Array, sampleRate: number) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + int16.byteLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + int16.byteLength, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, int16.byteLength, true);

  // PCM samples
  new Uint8Array(buffer, 44).set(new Uint8Array(int16.buffer));

  return buffer;
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
  const [inputLevel, setInputLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);

      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch {
          // ignore
        }
      }

      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {
          // ignore
        }
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

  const stopRecording = useCallback(() => {
    console.log("[AudioRecorder] Stopping recording...");

    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }

    // Disconnect audio graph first
    try {
      processorRef.current?.disconnect();
    } catch {
      // ignore
    }
    try {
      sourceNodeRef.current?.disconnect();
    } catch {
      // ignore
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Capture sample rate before closing AudioContext
    const sampleRate = audioContextRef.current?.sampleRate ?? 44100;

    // Close context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Build WAV blob from captured PCM
    const chunks = pcmChunksRef.current;
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);

    if (totalLength === 0) {
      console.warn("[AudioRecorder] No PCM samples captured");
      setState("error");
      setErrorMessage(
        "We couldn't capture any audio from your microphone. Please check your microphone input and try again."
      );
      setAnalyserNode(null);
      setInputLevel(0);
      return;
    }

    const pcm = new Float32Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      pcm.set(c, offset);
      offset += c.length;
    }

    const int16 = floatTo16BitPCM(pcm);
    const wavBuffer = encodeWav(int16, sampleRate);

    const blob = new Blob([wavBuffer], { type: "audio/wav" });

    setAudioBlob(blob);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    setState("stopped");
    setAnalyserNode(null);
    setInputLevel(0);

    console.log("[AudioRecorder] Recording stopped, WAV blob created", {
      totalSamples: totalLength,
      secondsApprox: totalLength / sampleRate,
      bytes: blob.size,
    });
  }, []);

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
          channelCount: 1,
        },
      });

      const track = stream.getAudioTracks()[0];
      console.log("[AudioRecorder] Microphone access granted", {
        label: track?.label,
        enabled: track?.enabled,
        muted: (track as any)?.muted,
        readyState: track?.readyState,
      });

      // Some devices return a track but it's "muted" (no signal)
      track?.addEventListener?.("mute", () => console.warn("[AudioRecorder] Track muted (no signal)"));
      track?.addEventListener?.("unmute", () => console.log("[AudioRecorder] Track unmuted"));

      streamRef.current = stream;

      // Create an AudioContext + ScriptProcessor recorder (WAV output)
      const audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // ScriptProcessor for PCM capture
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      pcmChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Copy buffer (inputBuffer reuses memory)
        pcmChunksRef.current.push(new Float32Array(input));

        // Compute a simple input level (RMS)
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        // boost slightly so its more readable
        setInputLevel(clamp01(rms * 4));
      };

      // Connect graph: source -> analyser -> processor
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination); // required to keep processor running

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      processorRef.current = processor;

      // IMPORTANT: set analyser before switching to recording UI
      setAnalyserNode(analyser);

      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setState("recording");
      timerRef.current = requestAnimationFrame(updateTimer);

      console.log("[AudioRecorder] Recording started", { sampleRate: audioContext.sampleRate });
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

  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedTime(0);
    setInputLevel(0);
    setAnalyserNode(null);
    setErrorMessage(null);
    setState("idle");

    pcmChunksRef.current = [];

    console.log("[AudioRecorder] Recording reset");
  }, [audioUrl]);

  return {
    state,
    audioBlob,
    audioUrl,
    elapsedTime,
    analyserNode,
    inputLevel,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
