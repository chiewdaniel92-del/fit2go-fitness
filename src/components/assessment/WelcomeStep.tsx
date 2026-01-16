import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { ArrowRight, CheckCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import kynareLogo from "@/assets/kynare-logo-orange.png";

interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <StepContainer className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        {/* Kynare Logo */}
        <div className="mb-8">
          <img 
            src={kynareLogo} 
            alt="KYNARE" 
            className="w-20 h-20 mx-auto"
          />
        </div>

        {/* Assessment-focused headline */}
        <h1 className="font-mono text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-6">
          <span className="text-foreground">The Kynare Ecosystem</span>
          <br />
          <span className="text-primary">Health & Performance Assessment</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Take a personalized assessment to discover insights tailored to your 
          unique health and fitness goals.
        </p>
      </div>

      <div 
        className="flex flex-col gap-4 items-center animate-slide-up" 
        style={{ animationDelay: "0.3s" }}
      >
        <Button 
          size="lg" 
          onClick={() => {
            trackEvent("assessment_started");
            onStart();
          }}
          className="group px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Begin Assessment
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p className="text-sm text-muted-foreground font-mono">
          Takes about 5 minutes
        </p>
      </div>

      <div 
        className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-center animate-slide-up max-w-2xl"
        style={{ animationDelay: "0.5s" }}
      >
        {[
          "Adaptive Insights Engine",
          "Personalized by your constraints",
          "Outcome Measured Framework",
        ].map((feature) => (
          <div key={feature} className="flex items-center justify-center gap-2 p-3">
            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm text-muted-foreground font-mono">{feature}</span>
          </div>
        ))}
      </div>
    </StepContainer>
  );
}