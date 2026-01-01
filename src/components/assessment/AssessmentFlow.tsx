import { useState, useCallback, useRef } from "react";
import { ProgressIndicator } from "./ProgressIndicator";
import { WelcomeStep } from "./WelcomeStep";
import { AgeStep } from "./AgeStep";
import { PrimaryGoalStep } from "./PrimaryGoalStep";
import { CurrentStateStep } from "./CurrentStateStep";
import { VoiceRecordingStep } from "./VoiceRecordingStep";
import type { AssessmentStep, AssessmentData } from "@/types/assessment";

export function AssessmentFlow() {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>("welcome");
  const [data, setData] = useState<AssessmentData>({
    age: null,
    primaryGoalId: null,
    currentStateId: null,
    voiceTranscript: null,
    voiceAudioUrl: null,
  });
  const audioBlobRef = useRef<Blob | null>(null);

  const goToStep = useCallback((step: AssessmentStep) => {
    setCurrentStep(step);
  }, []);

  const updateData = useCallback(<K extends keyof AssessmentData>(
    key: K, 
    value: AssessmentData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAgeSubmit = (age: number) => {
    updateData("age", age);
    goToStep("primary-goal");
  };

  const handlePrimaryGoalSelect = (id: string) => {
    updateData("primaryGoalId", id);
    goToStep("current-state");
  };

  const handleCurrentStateSelect = (id: string) => {
    updateData("currentStateId", id);
    goToStep("voice-recording");
  };

  const handleVoiceSubmit = (audioBlob: Blob) => {
    audioBlobRef.current = audioBlob;
    const audioUrl = URL.createObjectURL(audioBlob);
    updateData("voiceAudioUrl", audioUrl);
    // Phase 4 will handle processing
    goToStep("processing");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 py-4 px-6">
        <ProgressIndicator currentStep={currentStep} />
      </header>

      <main className="flex-1 flex items-center justify-center">
        {currentStep === "welcome" && (
          <WelcomeStep onStart={() => goToStep("age")} />
        )}

        {currentStep === "age" && (
          <AgeStep
            value={data.age}
            onSubmit={handleAgeSubmit}
            onBack={() => goToStep("welcome")}
          />
        )}

        {currentStep === "primary-goal" && (
          <PrimaryGoalStep
            value={data.primaryGoalId}
            onSelect={handlePrimaryGoalSelect}
            onBack={() => goToStep("age")}
          />
        )}

        {currentStep === "current-state" && (
          <CurrentStateStep
            value={data.currentStateId}
            onSelect={handleCurrentStateSelect}
            onBack={() => goToStep("primary-goal")}
          />
        )}

        {currentStep === "voice-recording" && (
          <VoiceRecordingStep
            onSubmit={handleVoiceSubmit}
            onBack={() => goToStep("current-state")}
          />
        )}

        {currentStep === "processing" && (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Processing...</h2>
            <p className="text-muted-foreground">AI Assessment coming in Phase 4</p>
            <pre className="mt-8 p-4 bg-muted rounded-lg text-left text-sm max-w-md mx-auto overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
