import { useState, useCallback, useRef } from "react";
import { ProgressIndicator } from "./ProgressIndicator";
import { WelcomeStep } from "./WelcomeStep";
import { AgeStep } from "./AgeStep";
import { PrimaryGoalStep } from "./PrimaryGoalStep";
import { CurrentStateStep } from "./CurrentStateStep";
import { GenericVoiceStep } from "./GenericVoiceStep";
import type { AssessmentStep, AssessmentData } from "@/types/assessment";
import { VOICE_STEPS, STEP_ORDER } from "@/types/assessment";

export function AssessmentFlow() {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>("welcome");
  const [data, setData] = useState<AssessmentData>({
    age: null,
    primaryGoalId: null,
    currentStateId: null,
    bodyContextTranscript: null,
    bodyContextAudioUrl: null,
    primaryBottleneckTranscript: null,
    primaryBottleneckAudioUrl: null,
    successCriteriaTranscript: null,
    successCriteriaAudioUrl: null,
    systemHistoryTranscript: null,
    systemHistoryAudioUrl: null,
  });
  
  // Store audio blobs for upload later
  const audioBlobsRef = useRef<Record<string, Blob>>({});

  const goToStep = useCallback((step: AssessmentStep) => {
    setCurrentStep(step);
  }, []);

  const updateData = useCallback(<K extends keyof AssessmentData>(
    key: K, 
    value: AssessmentData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Get next step in the flow
  const getNextStep = (current: AssessmentStep): AssessmentStep => {
    const currentIndex = STEP_ORDER.indexOf(current);
    return STEP_ORDER[currentIndex + 1] || 'processing';
  };

  // Get previous step in the flow
  const getPreviousStep = (current: AssessmentStep): AssessmentStep => {
    const currentIndex = STEP_ORDER.indexOf(current);
    return STEP_ORDER[currentIndex - 1] || 'welcome';
  };

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
    goToStep("voice-body-context");
  };

  // Generic handler for voice/text steps
  const handleVoiceSubmit = (stepId: AssessmentStep, audioBlob: Blob | null, transcript: string) => {
    const config = VOICE_STEPS.find(s => s.id === stepId);
    if (!config) return;

    if (audioBlob) {
      // Store blob for later upload
      audioBlobsRef.current[stepId] = audioBlob;
      
      // Create temporary URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      updateData(config.audioUrlKey as keyof AssessmentData, audioUrl as AssessmentData[keyof AssessmentData]);
    }
    
    // Store transcript (either typed or will be transcribed later)
    if (transcript) {
      updateData(config.transcriptKey as keyof AssessmentData, transcript as AssessmentData[keyof AssessmentData]);
    }
    
    // Move to next step
    goToStep(getNextStep(stepId));
  };

  // Find config for current voice step
  const currentVoiceConfig = VOICE_STEPS.find(s => s.id === currentStep);

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

        {/* Render voice/text steps using generic component */}
        {currentVoiceConfig && (
          <GenericVoiceStep
            key={currentVoiceConfig.id}
            config={currentVoiceConfig}
            onSubmit={(blob, transcript) => handleVoiceSubmit(currentStep, blob, transcript)}
            onBack={() => goToStep(getPreviousStep(currentStep))}
          />
        )}

        {currentStep === "processing" && (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Analyzing your responses...</h2>
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
