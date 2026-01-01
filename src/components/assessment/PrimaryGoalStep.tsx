import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { OptionCard } from "./OptionCard";
import { usePrimaryGoalOptions } from "@/hooks/useAssessmentOptions";
import { ArrowLeft, ArrowRight, Target, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PrimaryGoalStepProps {
  value: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
}

export function PrimaryGoalStep({ value, onSelect, onBack }: PrimaryGoalStepProps) {
  const { data: options, isLoading, error } = usePrimaryGoalOptions();

  return (
    <StepContainer className="flex flex-col items-center">
      <div className="w-full max-w-lg text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Target className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-3xl font-bold text-foreground mb-3">
          What's your primary goal?
        </h2>
        <p className="text-muted-foreground">
          Choose the goal that matters most to you right now
        </p>
      </div>

      <div className="w-full max-w-lg space-y-3 mb-8">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-2">Failed to load options</p>
            <p className="text-sm text-muted-foreground">Please refresh the page</p>
          </div>
        ) : (
          options?.map((option) => (
            <OptionCard
              key={option.id}
              label={option.label}
              description={option.description}
              isSelected={value === option.id}
              onClick={() => onSelect(option.id)}
            />
          ))
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          className="px-6"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          disabled={!value}
          onClick={() => value && onSelect(value)}
          className="px-8"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </StepContainer>
  );
}
