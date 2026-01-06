import { cn } from "@/lib/utils";

interface CircularTimerProps {
  elapsed: number;
  maxDuration: number;
  isRecording: boolean;
  className?: string;
  compact?: boolean;
}

export function CircularTimer({ elapsed, maxDuration, isRecording, className, compact = false }: CircularTimerProps) {
  const remaining = Math.max(0, maxDuration - elapsed);
  const progress = elapsed / maxDuration;
  
  // Circle properties - smaller on mobile when compact
  const size = compact ? 120 : 160;
  const strokeWidth = compact ? 6 : 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={remaining < 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-100"
        />
      </svg>
      
      <div className="absolute flex flex-col items-center">
        <span className={cn(
          "font-bold tabular-nums",
          compact ? "text-2xl" : "text-3xl",
          remaining < 10 ? "text-destructive" : "text-foreground"
        )}>
          {formatTime(remaining)}
        </span>
        <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {isRecording ? "remaining" : "max"}
        </span>
      </div>

      {/* Recording pulse indicator */}
      {isRecording && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive"></span>
          </span>
        </div>
      )}
    </div>
  );
}
