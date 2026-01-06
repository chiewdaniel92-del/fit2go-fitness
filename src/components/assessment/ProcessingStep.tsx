import { useEffect, useState, useRef } from "react";
import { StepContainer } from "./StepContainer";
import { CircularProgress } from "./CircularProgress";
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
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Cycle through loading messages
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Simulated progress animation
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      
      let newProgress: number;
      if (elapsed <= 5) {
        // Phase 1: 0-5s → 0% to 50% (fast)
        newProgress = (elapsed / 5) * 50;
      } else if (elapsed <= 15) {
        // Phase 2: 5-15s → 50% to 85% (medium)
        newProgress = 50 + ((elapsed - 5) / 10) * 35;
      } else {
        // Phase 3: 15s+ → 85% to 95% (slow)
        const slowProgress = Math.min((elapsed - 15) / 20, 1);
        newProgress = 85 + slowProgress * 10;
      }
      
      setProgress(Math.min(newProgress, 95));
    }, 100);

    return () => clearInterval(interval);
  }, [isComplete]);

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

        // Animate to 100% before completing
        setIsComplete(true);
        setProgress(100);
        
        // Small delay to show 100% before transitioning
        setTimeout(() => {
          trackEvent("assessment_generated", { word_count: data.assessment?.split(/\s+/).length || 0 });
          onComplete(data.assessment);
        }, 500);
      } catch (error) {
        console.error('Error generating assessment:', error);
        onError(error instanceof Error ? error.message : 'Something went wrong');
      }
    };

    generateAssessment();
  }, [assessmentData, onComplete, onError]);

  return (
    <StepContainer className="flex flex-col items-center justify-center py-12">
      <div className="text-center space-y-8">
        {/* Circular progress indicator */}
        <CircularProgress progress={progress} size={160} strokeWidth={10} />

        {/* Loading message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {LOADING_MESSAGES[messageIndex]}
          </h2>
          <p className="text-muted-foreground">
            This usually takes 10-20 seconds
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
