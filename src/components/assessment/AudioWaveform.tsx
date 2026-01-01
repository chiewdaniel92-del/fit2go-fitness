import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  className?: string;
}

export function AudioWaveform({ analyserNode, isRecording, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const width = rect.width;
      const height = rect.height;
      
      ctx.clearRect(0, 0, width, height);

      if (!analyserNode || !isRecording) {
        // Draw idle state - static bars
        const barCount = 40;
        const barWidth = width / barCount - 2;
        const centerY = height / 2;

        ctx.fillStyle = "hsl(158, 45%, 42%)";
        
        for (let i = 0; i < barCount; i++) {
          const barHeight = 4 + Math.sin(i * 0.3) * 2;
          const x = i * (barWidth + 2);
          ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
        }
        return;
      }

      // Get frequency data
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      const barCount = 40;
      const barWidth = width / barCount - 2;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex] / 255;
        const barHeight = Math.max(4, value * (height * 0.8));

        const x = i * (barWidth + 2);
        
        // Create gradient from primary to accent
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, "hsl(158, 45%, 42%)");
        gradient.addColorStop(1, "hsl(158, 50%, 55%)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-24 rounded-lg bg-secondary/30", className)}
    />
  );
}
