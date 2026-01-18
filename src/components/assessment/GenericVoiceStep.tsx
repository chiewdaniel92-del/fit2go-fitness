import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StepContainer } from "./StepContainer";
import { CircularTimer } from "./CircularTimer";
import { AudioWaveform } from "./AudioWaveform";
import { AudioPlayback } from "./AudioPlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Mic, Square, AlertCircle, Loader2, Keyboard } from "lucide-react";
import type { VoiceStepConfig } from "@/types/assessment";
import { trackEvent } from "@/lib/analytics";

interface GenericVoiceStepProps {
  config: VoiceStepConfig;
  onSubmit: (audioBlob: Blob | null, transcript: string) => void;
  onBack: () => void;
}

const MAX_DURATION = 60;

export function GenericVoiceStep({ config, onSubmit, onBack }: GenericVoiceStepProps) {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  
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

  const handleSubmit = async () => {
    if (inputMode === "text") {
      trackEvent("step_completed", { step: config.id, input_mode: "text" });
      onSubmit(null, textInput);
      return;
    }
    
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Audio = btoa(binary);

      console.log('Sending audio for transcription, size:', arrayBuffer.byteLength);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio },
      });

      if (error) {
        console.error('Transcription error:', error);
        throw new Error(error.message || 'Failed to transcribe audio');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const transcript = data?.text || '';
      console.log('Transcription received, length:', transcript.length);
      
      trackEvent("step_completed", { step: config.id, input_mode: "voice" });
      onSubmit(audioBlob, transcript);
    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscriptionError(error instanceof Error ? error.message : 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSwitchToText = () => {
    setInputMode("text");
    resetRecording();
    setTranscriptionError(null);
  };

  const handleSwitchToVoice = () => {
    setInputMode("voice");
    setTextInput("");
    setTranscriptionError(null);
  };

  const canSubmit = inputMode === "text" 
    ? textInput.trim().length > 10 
    : state === "stopped" && audioBlob && !isTranscribing;

  return (
    <StepContainer className="flex flex-col items-center">
      <div className="w-full max-w-lg text-center mb-3 md:mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-3 md:mb-6">
          <Mic className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        </div>

        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2 md:mb-4 leading-tight">
          {config.title}
        </h2>
        {config.subtitle && (
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            {config.subtitle}
          </p>
        )}
        {/* Hint: String or Scrollable Pills */}
        {config.hint && typeof config.hint === 'string' && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 italic">
            {config.hint}
          </p>
        )}
        {config.hint && Array.isArray(config.hint) && (
          <div className="mt-3 md:mt-4 w-full">
            <p className="text-xs text-muted-foreground mb-2 italic text-left">Examples:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {config.hint.map((item, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-muted/60 text-muted-foreground text-xs rounded-lg border border-border/50 text-left leading-relaxed"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-2 mb-3 md:mb-6">
        <Button
          variant={inputMode === "voice" ? "default" : "outline"}
          size="sm"
          onClick={handleSwitchToVoice}
          className="gap-2"
          disabled={isTranscribing}
        >
          <Mic className="w-4 h-4" />
          Voice
        </Button>
        <Button
          variant={inputMode === "text" ? "default" : "outline"}
          size="sm"
          onClick={handleSwitchToText}
          className="gap-2"
          disabled={isTranscribing}
        >
          <Keyboard className="w-4 h-4" />
          Type
        </Button>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center gap-3 md:gap-6">
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

            {/* Transcription Error */}
            {transcriptionError && state === "stopped" && (
              <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {transcriptionError}
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-destructive"
                    onClick={() => {
                      setTranscriptionError(null);
                      handleSubmit();
                    }}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {/* Transcribing State */}
            {isTranscribing && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Transcribing your response...</p>
              </div>
            )}

            {/* Idle State - Ready to record */}
            {state === "idle" && !isTranscribing && (
              <>
                <p className="hidden md:block text-sm text-muted-foreground">
                  Voice recording up to 60 seconds
                </p>
                
                <CircularTimer elapsed={0} maxDuration={MAX_DURATION} isRecording={false} compact className="md:hidden" />
                <CircularTimer elapsed={0} maxDuration={MAX_DURATION} isRecording={false} className="hidden md:flex" />

                <AudioWaveform analyserNode={null} isRecording={false} className="opacity-50" />

                <button
                  onClick={startRecording}
                  className="group relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30"
                >
                  <Mic className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </button>

                <p className="text-xs md:text-sm text-muted-foreground">Tap to start recording</p>
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
                <CircularTimer elapsed={elapsedTime} maxDuration={MAX_DURATION} isRecording={true} compact className="md:hidden" />
                <CircularTimer elapsed={elapsedTime} maxDuration={MAX_DURATION} isRecording={true} className="hidden md:flex" />

                <AudioWaveform analyserNode={analyserNode} isRecording={true} />

                <button
                  onClick={stopRecording}
                  className="group relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-destructive shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-destructive/30"
                >
                  <Square className="w-7 h-7 md:w-8 md:h-8 text-destructive-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </button>

                <p className="text-xs md:text-sm text-muted-foreground">Tap to stop recording</p>
              </>
            )}

            {/* Stopped State - Review recording */}
            {state === "stopped" && audioUrl && !isTranscribing && (
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50 md:bg-background/95 md:backdrop-blur-sm">
        <div className="flex gap-3 justify-center max-w-lg mx-auto">
          <Button variant="outline" size="lg" onClick={onBack} className="px-6" disabled={isTranscribing}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>

          <Button size="lg" onClick={handleSubmit} className="px-8" disabled={!canSubmit || isTranscribing}>
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-24" />
    </StepContainer>
  );
}
