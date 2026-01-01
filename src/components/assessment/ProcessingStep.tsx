import { useEffect, useState } from "react";
import { StepContainer } from "./StepContainer";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface ProcessingStepProps {
  onComplete: (assessment: string) => void;
  onError: (error: string) => void;
  assessmentData: {
    age: number;
    primaryGoal: string;
    currentState: string;
    bodyContext: string;
    primaryBottleneck: string;
    successCriteria: string;
    systemHistory: string;
  };
}

const LOADING_MESSAGES = [
  "Analyzing your responses...",
  "Understanding your goals...",
  "Identifying key patterns...",
  "Crafting personalized insights...",
  "Preparing your assessment...",
];

export function ProcessingStep({ onComplete, onError, assessmentData }: ProcessingStepProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Cycle through loading messages
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const generateAssessment = async () => {
      try {
        const response = await fetch(
          'https://epyjjkwzwjjveqqfttpj.supabase.co/functions/v1/generate-assessment',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(assessmentData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate assessment');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        trackEvent("assessment_generated", { word_count: data.assessment?.split(/\s+/).length || 0 });
        onComplete(data.assessment);
      } catch (error) {
        console.error('Error generating assessment:', error);
        onError(error instanceof Error ? error.message : 'Something went wrong');
      }
    };

    generateAssessment();
  }, [assessmentData, onComplete, onError]);

  return (
    <StepContainer className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-8">
        {/* Animated loader */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-primary/20 mx-auto" />
          <Loader2 className="w-24 h-24 text-primary animate-spin absolute top-0 left-1/2 -translate-x-1/2" />
        </div>

        {/* Loading message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {LOADING_MESSAGES[messageIndex]}
          </h2>
          <p className="text-muted-foreground">
            This usually takes 10-20 seconds
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i === messageIndex ? 'bg-primary' : 'bg-primary/20'
              }`}
            />
          ))}
        </div>
      </div>
    </StepContainer>
  );
}
