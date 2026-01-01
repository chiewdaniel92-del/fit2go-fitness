import { useState } from "react";
import { StepContainer } from "./StepContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, Save, ArrowLeft } from "lucide-react";

interface EmailCaptureStepProps {
  onSave: (email: string | null, honeypotValue: string) => Promise<void>;
  isLoading: boolean;
  onBack: () => void;
}

export function EmailCaptureStep({ onSave, isLoading, onBack }: EmailCaptureStepProps) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(email.trim() || null, honeypot);
  };

  const handleSkip = async () => {
    await onSave(null, honeypot);
  };

  return (
    <StepContainer>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Save Your Results</h2>
        <p className="text-muted-foreground">
          Enter your email to access your assessment anytime, or skip to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base">
            Email Address <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="h-12 text-base"
          />
        </div>

        {/* Honeypot field - hidden from real users, bots will fill it */}
        <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save My Results
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full"
          >
            Skip for now
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="w-full mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>
      </form>
    </StepContainer>
  );
}
