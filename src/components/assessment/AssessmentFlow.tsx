import { useState, useCallback, useRef, useEffect } from "react";
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
import type { AssessmentStep, AssessmentData, AssessmentGenerationResult } from "@/types/assessment";
import { VOICE_STEPS, STEP_ORDER } from "@/types/assessment";
import { trackEvent } from "@/lib/analytics";

export function AssessmentFlow() {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>("welcome");
  const [assessment, setAssessment] = useState<string>("");
  const [assessmentMeta, setAssessmentMeta] = useState<Omit<AssessmentGenerationResult, "assessment"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const autoSaveRef = useRef<Promise<{ id: string; access_token: string } | null> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Measure header height for centering ProcessingStep
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => setHeaderHeight(header.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  
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

  const buildResultForSave = (): AssessmentGenerationResult | null => {
    if (!assessmentMeta) return null;
    return {
      assessment,
      metrics: assessmentMeta.metrics,
      cluster: assessmentMeta.cluster,
      riskFlags: assessmentMeta.riskFlags,
      opportunityFlags: assessmentMeta.opportunityFlags,
      kbVersionId: assessmentMeta.kbVersionId,
      retrieval: assessmentMeta.retrieval,
      evidenceMap: assessmentMeta.evidenceMap ?? null,
    };
  };

  const persistAssessment = useCallback(async (result: AssessmentGenerationResult) => {
    if (assessmentId && accessToken) {
      return { id: assessmentId, access_token: accessToken };
    }

    if (autoSaveRef.current) {
      return await autoSaveRef.current;
    }

    if (!data.primaryGoalId || !data.currentStateId || !data.age) {
      throw new Error("Missing required assessment data");
    }

    autoSaveRef.current = (async () => {
      const completionTime = getCompletionTimeSeconds();
      const combinedTranscript = getCombinedTranscript();
      const metrics = result.metrics;

      const { data: insertedData, error } = await supabase.rpc("create_assessment", {
        p_age: data.age,
        p_primary_goal_id: data.primaryGoalId,
        p_current_state_id: data.currentStateId,
        p_voice_transcript: combinedTranscript || null,
        p_ai_assessment: result.assessment,
        p_ai_recommendations: {
          cluster: result.cluster,
          risk_flags: result.riskFlags,
          opportunity_flags: result.opportunityFlags,
          evidence_map: result.evidenceMap ?? null,
        },
        p_kb_version_id: result.kbVersionId || null,
        p_bss_score: metrics?.bss ?? null,
        p_lrb_score: metrics?.lrb ?? null,
        p_pcc_score: metrics?.pcc ?? null,
        p_sis_score: metrics?.sis ?? null,
        p_oas_score: metrics?.oas ?? null,
        p_status: "completed",
        p_completed_at: new Date().toISOString(),
        p_completion_time_seconds: completionTime,
      });

      if (error) {
        console.error("Error saving assessment:", error);
        throw new Error("Failed to save assessment");
      }

      const created = Array.isArray(insertedData) ? insertedData[0] : null;
      if (!created) {
        throw new Error("Failed to save assessment");
      }

      setAssessmentId(created.id);
      setAccessToken(created.access_token);

      if (result.retrieval?.length) {
        const logRows = result.retrieval.map((entry) => ({
          assessment_id: created.id,
          kb_version_id: result.kbVersionId,
          kb_chunk_id: entry.chunkId,
          similarity: entry.similarity,
        }));

        const { error: logError } = await supabase
          .from("assessment_kb_logs")
          .insert(logRows);

        if (logError) {
          console.error("Failed to save KB retrieval logs:", logError);
        }
      }

      return created;
    })()
      .finally(() => {
        autoSaveRef.current = null;
      });

    return await autoSaveRef.current;
  }, [accessToken, assessmentId, data.age, data.currentStateId, data.primaryGoalId, getCombinedTranscript, getCompletionTimeSeconds]);

  // Save assessment to database
  const handleSaveAssessment = async (email: string | null, honeypotValue: string) => {
    if (!data.primaryGoalId || !data.currentStateId || !data.age) {
      toast.error("Missing required assessment data");
      return;
    }

    setIsSaving(true);

    try {
      const completionTime = getCompletionTimeSeconds();
      const honeypotTriggered = honeypotValue.length > 0;

      let record = assessmentId && accessToken ? { id: assessmentId, access_token: accessToken } : null;
      if (!record) {
        const result = buildResultForSave();
        if (!result) {
          throw new Error("Assessment not ready to save");
        }
        record = await persistAssessment(result);
      }

      const { data: updateData, error: updateError } = await supabase.rpc(
        "update_assessment_by_token",
        {
          p_access_token: record.access_token,
          p_email: email,
          p_status: "completed",
          p_completed_at: new Date().toISOString(),
          p_honeypot_triggered: honeypotTriggered,
          p_completion_time_seconds: completionTime,
        }
      );

      if (updateError) {
        console.error("Error updating assessment:", updateError);
        throw new Error("Failed to save assessment");
      }

      const updated = Array.isArray(updateData) ? updateData[0] : null;
      if (!updated) {
        throw new Error("Failed to save assessment");
      }

      if (!accessToken && record.access_token) {
        setAccessToken(record.access_token);
      }

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
              accessToken: record.access_token,
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

  const handleAssessmentComplete = useCallback((result: AssessmentGenerationResult) => {
    setAssessment(result.assessment);
    setAssessmentMeta({
      metrics: result.metrics,
      cluster: result.cluster,
      riskFlags: result.riskFlags,
      opportunityFlags: result.opportunityFlags,
      kbVersionId: result.kbVersionId,
      retrieval: result.retrieval,
    });
    persistAssessment(result)
      .catch((error) => {
        console.error("Auto-save failed:", error);
      })
      .finally(() => {
        goToStep("results");
      });
  }, [goToStep, persistAssessment]);

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
    setAssessmentMeta(null);
    setAssessmentId(null);
    setAccessToken(null);
    autoSaveRef.current = null;
    startTimeRef.current = null;
    audioBlobsRef.current = {};
    goToStep("welcome");
  }, [goToStep]);

  // Find config for current voice step
  const currentVoiceConfig = VOICE_STEPS.find(s => s.id === currentStep);

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <header ref={headerRef} className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 py-4 px-6">
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
            headerOffsetPx={headerHeight / 2}
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
