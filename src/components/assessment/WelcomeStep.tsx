import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { ArrowRight } from "lucide-react";
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

        {/* Hero Tagline - matching kynare.com style */}
        <div className="font-mono text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-6">
          <div>
            <span className="text-foreground">motion </span>
            <span className="text-primary">engineered</span>
          </div>
          <div>
            <span className="text-primary">clinically </span>
            <span className="text-foreground">guided</span>
          </div>
          <div>
            <span className="text-foreground">for every body</span>
            <span className="text-primary">.</span>
          </div>
        </div>

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
        className="mt-12 grid grid-cols-2 gap-8 text-center animate-slide-up max-w-md"
        style={{ animationDelay: "0.5s" }}
      >
        {[
          { label: "Personalized", value: "100%" },
          { label: "AI-Powered", value: "✓" },
        ].map((stat) => (
          <div key={stat.label} className="p-4">
            <div className="text-2xl font-bold text-primary">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </StepContainer>
  );
}