import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepContainer } from "./StepContainer";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";

interface AgeStepProps {
  value: number | null;
  onSubmit: (age: number) => void;
  onBack: () => void;
}

export function AgeStep({ value, onSubmit, onBack }: AgeStepProps) {
  const [age, setAge] = useState<string>(value?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const ageNum = parseInt(age, 10);
    
    if (isNaN(ageNum)) {
      setError("Please enter your age");
      return;
    }
    
    if (ageNum < 18) {
      setError("You must be at least 18 years old");
      return;
    }
    
    if (ageNum > 99) {
      setError("Please enter a valid age");
      return;
    }

    setError(null);
    onSubmit(ageNum);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <StepContainer className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-3xl font-bold text-foreground mb-3">
          How old are you?
        </h2>
        <p className="text-muted-foreground mb-8">
          This helps us personalize your assessment
        </p>

        <div className="mb-6">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Enter your age"
            value={age}
            onChange={(e) => {
              setAge(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            className="text-center text-2xl h-16 font-semibold"
            min={18}
            max={99}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
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
            onClick={handleSubmit}
            disabled={!age}
            className="px-8"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </StepContainer>
  );
}
