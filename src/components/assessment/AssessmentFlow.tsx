import { useState, useCallback, useRef } from "react";
import { ProgressIndicator } from "./ProgressIndicator";
import { WelcomeStep } from "./WelcomeStep";
import { AgeStep } from "./AgeStep";
import { PrimaryGoalStep } from "./PrimaryGoalStep";
import { CurrentStateStep } from "./CurrentStateStep";
import { GenericVoiceStep } from "./GenericVoiceStep";
import { ProcessingStep } from "./ProcessingStep";
import { ResultsStep } from "./ResultsStep";
import { EmailCaptureStep } from "./EmailCaptureStep";
import { SuccessStep } from "./SuccessStep";
import { usePrimaryGoalOptions, useCurrentStateOptions } from "@/hooks/useAssessmentOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AssessmentStep, AssessmentData } from "@/types/assessment";
import { VOICE_STEPS, STEP_ORDER } from "@/types/assessment";
import { trackEvent } from "@/lib/analytics";

export function AssessmentFlow() {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>("welcome");
  const [assessment, setAssessment] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  
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
  
  // Fetch options to get labels for AI
  const { data: primaryGoalOptions } = usePrimaryGoalOptions();
  const { data: currentStateOptions } = useCurrentStateOptions();
  
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

  const handleWelcomeStart = () => {
    startTimeRef.current = new Date();
    goToStep("age");
  };

  const handleAgeSubmit = (age: number) => {
    updateData("age", age);
    goToStep("primary-goal");
  };

  // Handlers for primary goal step
  const handlePrimaryGoalChange = (id: string) => {
    updateData("primaryGoalId", id);
  };

  const handlePrimaryGoalContinue = () => {
    if (data.primaryGoalId) {
      goToStep("current-state");
    }
  };

  // Handlers for current state step
  const handleCurrentStateChange = (id: string) => {
    updateData("currentStateId", id);
  };

  const handleCurrentStateContinue = () => {
    if (data.currentStateId) {
      goToStep("voice-body-context");
    }
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

  // Prepare data for AI assessment
  const getAssessmentPayload = () => {
    const primaryGoalLabel = primaryGoalOptions?.find(o => o.id === data.primaryGoalId)?.label || "Not specified";
    const currentStateLabel = currentStateOptions?.find(o => o.id === data.currentStateId)?.label || "Not specified";
    
    return {
      age: data.age || 0,
      primaryGoal: primaryGoalLabel,
      currentState: currentStateLabel,
      bodyContext: data.bodyContextTranscript || "",
      primaryBottleneck: data.primaryBottleneckTranscript || "",
      successCriteria: data.successCriteriaTranscript || "",
      systemHistory: data.systemHistoryTranscript || "",
    };
  };

  // Combine all voice transcripts into a formatted string
  const getCombinedTranscript = () => {
    const sections = [
      { title: "Body Context", content: data.bodyContextTranscript },
      { title: "Primary Bottleneck", content: data.primaryBottleneckTranscript },
      { title: "Success Criteria", content: data.successCriteriaTranscript },
      { title: "What You've Tried", content: data.systemHistoryTranscript },
    ];

    return sections
      .filter(s => s.content)
      .map(s => `## ${s.title}\n${s.content}`)
      .join("\n\n");
  };

  // Calculate completion time in seconds
  const getCompletionTimeSeconds = () => {
    if (!startTimeRef.current) return null;
    return Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
  };

  // Save assessment to database
  const handleSaveAssessment = async (email: string | null, honeypotValue: string) => {
    if (!data.primaryGoalId || !data.currentStateId || !data.age) {
      toast.error("Missing required assessment data");
      return;
    }

    setIsSaving(true);

    try {
      const completionTime = getCompletionTimeSeconds();
      const combinedTranscript = getCombinedTranscript();
      const honeypotTriggered = honeypotValue.length > 0;

      const { data: insertedData, error } = await supabase
        .from("assessments")
        .insert({
          age: data.age,
          primary_goal_id: data.primaryGoalId,
          current_state_id: data.currentStateId,
          voice_transcript: combinedTranscript || null,
          ai_assessment: assessment,
          email: email,
          status: "completed",
          completed_at: new Date().toISOString(),
          honeypot_triggered: honeypotTriggered,
          completion_time_seconds: completionTime,
        })
        .select("access_token")
        .single();

      if (error) {
        console.error("Error saving assessment:", error);
        throw new Error("Failed to save assessment");
      }

      setAccessToken(insertedData.access_token);
      
      // Track the save event
      trackEvent("assessment_saved", { has_email: !!email });

      // Send email if provided and honeypot not triggered
      if (email && !honeypotTriggered) {
        try {
          // Get first ~200 words of assessment as summary
          const summaryWords = assessment.split(/\s+/).slice(0, 50).join(" ");
          const assessmentSummary = summaryWords + (assessment.split(/\s+/).length > 50 ? "..." : "");

          const { error: emailError } = await supabase.functions.invoke("send-assessment-email", {
            body: {
              email,
              assessmentSummary,
              accessToken: insertedData.access_token,
            },
          });

          if (emailError) {
            console.error("Failed to send email:", emailError);
            // Don't show error to user - email is best effort
          } else {
            toast.success("Results sent to your email!");
          }
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }
      }

      goToStep("success");
      toast.success("Assessment saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save assessment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssessmentComplete = useCallback((generatedAssessment: string) => {
    setAssessment(generatedAssessment);
    goToStep("results");
  }, [goToStep]);

  const handleAssessmentError = useCallback((error: string) => {
    toast.error(error);
    goToStep("voice-history"); // Go back to last step
  }, [goToStep]);

  const handleRetry = useCallback(() => {
    setData({
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
    setAssessment("");
    setAccessToken(null);
    startTimeRef.current = null;
    audioBlobsRef.current = {};
    goToStep("welcome");
  }, [goToStep]);

  // Find config for current voice step
  const currentVoiceConfig = VOICE_STEPS.find(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 py-4 px-6">
        <ProgressIndicator currentStep={currentStep} />
      </header>

      <main className="flex-1 flex items-center justify-center">
        {currentStep === "welcome" && (
          <WelcomeStep onStart={handleWelcomeStart} />
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
            onChange={handlePrimaryGoalChange}
            onContinue={handlePrimaryGoalContinue}
            onBack={() => goToStep("age")}
          />
        )}

        {currentStep === "current-state" && (
          <CurrentStateStep
            value={data.currentStateId}
            onChange={handleCurrentStateChange}
            onContinue={handleCurrentStateContinue}
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
          <ProcessingStep
            assessmentData={getAssessmentPayload()}
            onComplete={handleAssessmentComplete}
            onError={handleAssessmentError}
          />
        )}

        {currentStep === "results" && (
          <ResultsStep
            assessment={assessment}
            onEmailCapture={() => goToStep("email-capture")}
            onRetry={handleRetry}
          />
        )}

        {currentStep === "email-capture" && (
          <EmailCaptureStep
            onSave={handleSaveAssessment}
            isLoading={isSaving}
            onBack={() => goToStep("results")}
          />
        )}

        {currentStep === "success" && accessToken && (
          <SuccessStep
            accessToken={accessToken}
            onStartNew={handleRetry}
          />
        )}
      </main>
    </div>
  );
}
