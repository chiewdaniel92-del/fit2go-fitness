import { useState } from "react";
import { StepContainer } from "./StepContainer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, ExternalLink, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

interface SuccessStepProps {
  accessToken: string;
  onStartNew: () => void;
}

export function SuccessStep({ accessToken, onStartNew }: SuccessStepProps) {
  const [copied, setCopied] = useState(false);
  
  const shareableLink = `${window.location.origin}/assessment/${accessToken}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleViewAssessment = () => {
    window.open(shareableLink, "_blank");
  };

  return (
    <StepContainer>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
          <CheckCircle className="w-6 h-6 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Assessment Saved!</h2>
        <p className="text-muted-foreground">
          Your personalized assessment has been saved. Use the link below to access it anytime.
        </p>
      </div>

      <div className="space-y-6 w-full max-w-md mx-auto">
        {/* Link display */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-2">Your shareable link:</p>
          <p className="text-sm font-mono break-all text-foreground">
            {shareableLink}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleCopyLink}
            size="lg"
            className="w-full h-12 text-base"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy Link
              </>
            )}
          </Button>

          <Button
            onClick={handleViewAssessment}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            View My Assessment
          </Button>

          <Button
            onClick={onStartNew}
            variant="ghost"
            size="lg"
            className="w-full"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Start New Assessment
          </Button>
        </div>
      </div>
    </StepContainer>
  );
}
