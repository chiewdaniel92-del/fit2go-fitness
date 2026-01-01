import { cn } from "@/lib/utils";
import type { AssessmentStep } from "@/types/assessment";
import { getProgressPercent } from "@/types/assessment";

interface ProgressIndicatorProps {
  currentStep: AssessmentStep;
  className?: string;
}

export function ProgressIndicator({ currentStep, className }: ProgressIndicatorProps) {
  const progress = getProgressPercent(currentStep);
  
  // Don't show on welcome screen
  if (currentStep === 'welcome') return null;

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Progress</span>
        <span className="text-sm font-medium text-primary">{progress}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
