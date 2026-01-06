import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { Calendar, ArrowRight, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/analytics";
import kynareLogo from "@/assets/kynare-logo-orange.png";

interface ResultsStepProps {
  assessment: string;
  onEmailCapture: () => void;
  onRetry: () => void;
}

export function ResultsStep({ assessment, onEmailCapture, onRetry }: ResultsStepProps) {
  return (
    <StepContainer className="flex flex-col">
      {/* Header with Logo */}
      <div className="text-center mb-8">
        <img 
          src={kynareLogo} 
          alt="KYNARE" 
          className="w-12 h-12 mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Your Personalized Assessment
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          clinically guided | motion engineered
        </p>
      </div>

      {/* Assessment Content */}
      <div className="w-full max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0 border-b border-border pb-2">
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="text-primary font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-foreground/90">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
            }}
          >
            {assessment}
          </ReactMarkdown>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="lg"
          onClick={() => {
            trackEvent("booking_clicked", { source: "results_page" });
            window.open("https://kynare.com/timetable", "_blank");
          }}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Book a Session
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onEmailCapture}
          className="gap-2"
        >
          Save My Assessment
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="mt-4 gap-2 text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="w-3 h-3" />
        Start Over
      </Button>
    </StepContainer>
  );
}