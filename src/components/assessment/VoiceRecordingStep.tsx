import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { CircularTimer } from "./CircularTimer";
import { AudioWaveform } from "./AudioWaveform";
import { AudioPlayback } from "./AudioPlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { ArrowLeft, ArrowRight, Mic, Square, AlertCircle, Loader2 } from "lucide-react";

interface VoiceRecordingStepProps {
  onSubmit: (audioBlob: Blob) => void;
  onBack: () => void;
}

const MAX_DURATION = 60;

export function VoiceRecordingStep({ onSubmit, onBack }: VoiceRecordingStepProps) {
  const {
    state,
    audioBlob,
    audioUrl,
    elapsedTime,
    analyserNode,
    inputLevel,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder({ maxDuration: MAX_DURATION });

  const handleSubmit = () => {
    if (audioBlob) {
      onSubmit(audioBlob);
    }
  };

  const showNoInputWarning =
    state === "recording" && elapsedTime > 1.5 && inputLevel < 0.03;

  return (
    <StepContainer className="flex flex-col items-center">
      <div className="w-full max-w-lg text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Mic className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">Tell us more about you</h2>
        <p className="text-muted-foreground leading-relaxed">
          Record a brief message about your wellness goals, challenges, or anything you'd like us to know.
          This helps personalize your assessment.
        </p>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        {/* Error State */}
        {state === "error" && (
          <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {errorMessage || "Unable to access microphone"}
              </p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm text-destructive"
                onClick={startRecording}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Idle State - Ready to record */}
        {state === "idle" && (
          <>
            <CircularTimer elapsed={0} maxDuration={MAX_DURATION} isRecording={false} />

            <AudioWaveform analyserNode={null} isRecording={false} className="opacity-50" />

            <button
              onClick={startRecording}
              className="group relative w-24 h-24 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30"
            >
              <Mic className="w-10 h-10 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </button>

            <p className="text-sm text-muted-foreground">Tap to start recording</p>
          </>
        )}

        {/* Requesting Permission */}
        {state === "requesting" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Requesting microphone access...</p>
          </div>
        )}

        {/* Recording State */}
        {state === "recording" && (
          <>
            <CircularTimer elapsed={elapsedTime} maxDuration={MAX_DURATION} isRecording={true} />

            <AudioWaveform analyserNode={analyserNode} isRecording={true} />

            {/* Input level meter */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Mic input</span>
                <span className="text-sm font-medium text-foreground">
                  {Math.round(inputLevel * 100)}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-100"
                  style={{ width: `${Math.round(inputLevel * 100)}%` }}
                />
              </div>
            </div>

            {showNoInputWarning && (
              <div className="w-full max-w-md p-3 rounded-xl border border-border bg-card text-left">
                <p className="text-sm font-medium text-foreground">We cant hear your microphone yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If youre speaking and the bar stays near 0%, your device may be using a different mic,
                  or the browser isnt sending the mic audio to the recorder.
                </p>
              </div>
            )}

            <button
              onClick={stopRecording}
              className="group relative w-24 h-24 rounded-full bg-destructive shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-destructive/30"
            >
              <Square className="w-8 h-8 text-destructive-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </button>

            <p className="text-sm text-muted-foreground">Tap to stop recording</p>
          </>
        )}

        {/* Stopped State - Review recording */}
        {state === "stopped" && audioUrl && (
          <>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-sm font-medium text-primary">
                  Recording complete ({Math.floor(elapsedTime)}s)
                </span>
              </div>
            </div>

            <AudioPlayback audioUrl={audioUrl} onReset={resetRecording} />

            <p className="text-sm text-muted-foreground text-center">
              Listen to your recording or record again if you'd like
            </p>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-center mt-8">
        <Button variant="outline" size="lg" onClick={onBack} className="px-6">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>

        {state === "stopped" && audioBlob && (
          <Button size="lg" onClick={handleSubmit} className="px-8">
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        )}
      </div>
    </StepContainer>
  );
}
