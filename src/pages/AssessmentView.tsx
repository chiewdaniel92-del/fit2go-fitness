import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, ArrowLeft, Loader2, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/analytics";

export default function AssessmentView() {
  const { accessToken } = useParams<{ accessToken: string }>();

  // Track page view
  useEffect(() => {
    if (accessToken) {
      trackEvent("results_viewed", { source: "direct_link" });
    }
  }, [accessToken]);

  const { data: assessment, isLoading, error } = useQuery({
    queryKey: ["assessment", accessToken],
    queryFn: async () => {
      if (!accessToken) throw new Error("No access token provided");

      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          primary_goal:assessment_options_primary_goal(label),
          current_state:assessment_options_current_state(label)
        `)
        .eq("access_token", accessToken)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Assessment not found");

      return data;
    },
    enabled: !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Assessment Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find an assessment with this link. It may have been removed or the link is incorrect.
          </p>
          <Button asChild>
            <Link to="/">Start New Assessment</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Start New Assessment
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Your Personalized Assessment
          </h1>
          <p className="text-muted-foreground">
            Completed on {new Date(assessment.completed_at || assessment.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Assessment Meta */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
            Age: {assessment.age}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
            Goal: {assessment.primary_goal?.label}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
            State: {assessment.current_state?.label}
          </span>
        </div>

        {/* Assessment Content */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
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
              {assessment.ai_assessment || "No assessment content available."}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => {
              trackEvent("booking_clicked", { source: "assessment_view" });
              window.open("https://kynare.com/timetable", "_blank");
            }}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Book Your First Visit
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Start a New Assessment</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
