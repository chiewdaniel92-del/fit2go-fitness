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

    // Set canvas size with proper DPR handling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barCount = 40;
    const barWidth = width / barCount - 2;
    const centerY = height / 2;

    // Animation phase for idle state
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (analyserNode && isRecording) {
        // RECORDING: Draw animated bars based on actual audio frequency data
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * bufferLength);
          const value = dataArray[dataIndex] / 255;
          // Add minimum height so bars are always visible, scale up for better visibility
          const barHeight = Math.max(6, value * (height * 0.85));

          const x = i * (barWidth + 2);
          
          // Create gradient from primary to lighter shade
          const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
          gradient.addColorStop(0, "hsl(76, 80%, 44%)");
          gradient.addColorStop(0.5, "hsl(76, 90%, 60%)");
          gradient.addColorStop(1, "hsl(76, 90%, 74%)");
          
          ctx.fillStyle = gradient;
          
          // Draw bar centered vertically with rounded corners effect
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // IDLE: Draw gentle animated wave to show the component is alive
        phase += 0.02;
        
        ctx.fillStyle = "hsl(76, 40%, 62%)";
        
        for (let i = 0; i < barCount; i++) {
          // Create a gentle wave animation
          const wave = Math.sin(phase + i * 0.2) * 0.5 + 0.5;
          const barHeight = 4 + wave * 8;
          const x = i * (barWidth + 2);
          
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      // ALWAYS schedule the next frame - this keeps the animation loop running
      animationRef.current = requestAnimationFrame(draw);
    };

    // Start the animation loop
    draw();

    // Cleanup: stop animation when component unmounts or dependencies change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [analyserNode, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-16 md:h-24 rounded-lg bg-secondary/30", className)}
    />
  );
}
