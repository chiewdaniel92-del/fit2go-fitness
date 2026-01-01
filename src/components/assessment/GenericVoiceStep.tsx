import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StepContainer } from "./StepContainer";
import { CircularTimer } from "./CircularTimer";
import { AudioWaveform } from "./AudioWaveform";
import { AudioPlayback } from "./AudioPlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { ArrowLeft, ArrowRight, Mic, Square, AlertCircle, Loader2, Keyboard } from "lucide-react";
import type { VoiceStepConfig } from "@/types/assessment";

interface GenericVoiceStepProps {
  config: VoiceStepConfig;
  onSubmit: (audioBlob: Blob | null, transcript: string) => void;
  onBack: () => void;
}

const MAX_DURATION = 60;

export function GenericVoiceStep({ config, onSubmit, onBack }: GenericVoiceStepProps) {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  
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
    if (inputMode === "text") {
      onSubmit(null, textInput);
    } else if (audioBlob) {
      // For now, transcript will be empty - Phase 4 will handle transcription
      onSubmit(audioBlob, "");
    }
  };

  const handleSwitchToText = () => {
    setInputMode("text");
    resetRecording();
  };

  const handleSwitchToVoice = () => {
    setInputMode("voice");
    setTextInput("");
  };

  const showNoInputWarning =
    state === "recording" && elapsedTime > 1.5 && inputLevel < 0.03;

  const canSubmit = inputMode === "text" 
    ? textInput.trim().length > 10 
    : state === "stopped" && audioBlob;

  return (
    <StepContainer className="flex flex-col items-center">
      <div className="w-full max-w-lg text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Mic className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
          {config.title}
        </h2>
        {config.subtitle && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {config.subtitle}
          </p>
        )}
        {config.hint && (
          <p className="text-sm text-muted-foreground mt-2 italic">
            {config.hint}
          </p>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Button
          variant={inputMode === "voice" ? "default" : "outline"}
          size="sm"
          onClick={handleSwitchToVoice}
          className="gap-2"
        >
          <Mic className="w-4 h-4" />
          Voice
        </Button>
        <Button
          variant={inputMode === "text" ? "default" : "outline"}
          size="sm"
          onClick={handleSwitchToText}
          className="gap-2"
        >
          <Keyboard className="w-4 h-4" />
          Type
        </Button>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        {/* TEXT INPUT MODE */}
        {inputMode === "text" && (
          <div className="w-full space-y-4">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your response here..."
              className="min-h-[180px] text-base resize-none"
              maxLength={2000}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Minimum 10 characters</span>
              <span>{textInput.length}/2000</span>
            </div>
          </div>
        )}

        {/* VOICE INPUT MODE */}
        {inputMode === "voice" && (
          <>
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
                <p className="text-sm text-muted-foreground">
                  Voice recording up to 60 seconds
                </p>
                
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
                    <p className="text-sm font-medium text-foreground">We can&apos;t hear your microphone yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      If you&apos;re speaking and the bar stays near 0%, your device may be using a different mic,
                      or the browser isn&apos;t sending the mic audio to the recorder.
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
                  Listen to your recording or record again if you&apos;d like
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-center mt-8">
        <Button variant="outline" size="lg" onClick={onBack} className="px-6">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>

        {canSubmit && (
          <Button size="lg" onClick={handleSubmit} className="px-8">
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        )}
      </div>
    </StepContainer>
  );
}
