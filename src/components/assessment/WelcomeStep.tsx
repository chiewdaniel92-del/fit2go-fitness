import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { Sparkles, Heart, ArrowRight } from "lucide-react";

interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <StepContainer className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <Heart className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Your Wellness Journey
          <br />
          <span className="text-primary">Starts Here</span>
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
          onClick={onStart}
          className="group px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Begin Assessment
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Takes about 3 minutes
        </p>
      </div>

      <div 
        className="mt-12 grid grid-cols-3 gap-6 text-center animate-slide-up max-w-lg"
        style={{ animationDelay: "0.5s" }}
      >
        {[
          { label: "Personalized", value: "100%" },
          { label: "Questions", value: "4" },
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
