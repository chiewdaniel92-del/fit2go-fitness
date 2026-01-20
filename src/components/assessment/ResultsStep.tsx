import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { Calendar, ArrowRight, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trackEvent } from "@/lib/analytics";
import kynareLogo from "@/assets/kynare-logo-orange.png";
import { useMemo } from "react";

interface ResultsStepProps {
  assessment: string;
  onEmailCapture: () => void;
  onRetry: () => void;
}

interface Section {
  number: string;
  title: string;
  content: string;
}

interface MetricsData {
  overallScore: { current: string; target: string } | null;
  whatThisMeans: { current: string; target: string } | null;
  cleanedContent: string;
}

// Pre-process metrics section to extract Overall Score and "What this means for you"
function preprocessMetricsSection(content: string): MetricsData {
  let overallScore: { current: string; target: string } | null = null;
  let whatThisMeans: { current: string; target: string } | null = null;
  let cleanedContent = content;

  // Extract "Overall Score: X/25 -> Target: Y/25" pattern
  // Handle various arrow formats: ->, →, >, and possible spaces
  const scoreMatch = content.match(/Overall Score[:\s]*([\d]+\/[\d]+)\s*(?:->|→|>)\s*Target[:\s]*([\d-]+\/[\d]+)/i);
  if (scoreMatch) {
    overallScore = { current: scoreMatch[1], target: scoreMatch[2] };
  }

  // Extract "What this means for you" with Current/Target bullets
  // Backend uses "- Current:" and "- Target:" format (dashes, not bullets ●)
  const currentMatch = content.match(/-\s*Current:\s*([^\n-]+)/i);
  const targetMatch = content.match(/-\s*Target:\s*([^\n-]+)(?![\d\/])/i);
  
  if (currentMatch && targetMatch) {
    whatThisMeans = {
      current: currentMatch[1].trim().replace(/\s+/g, ' '),
      target: targetMatch[1].trim().replace(/\s+/g, ' ')
    };
  }

  // Remove extracted content from the markdown to clean up the table
  cleanedContent = content
    // Remove Overall Score line (handles various formats)
    .replace(/Overall Score[:\s]*[\d]+\/[\d]+\s*(?:->|→|>)\s*Target[:\s]*[\d-]+\/[\d]+\s*\n?/gi, '')
    // Remove "What this means for you:" header line
    .replace(/What this means for you:?\s*\n?/gi, '')
    // Remove "- Current: ..." line
    .replace(/-\s*Current:\s*[^\n-]+\n?/gi, '')
    // Remove "- Target: ..." line (but not table Target column which doesn't have dash prefix)
    .replace(/-\s*Target:\s*[^\n-]+\n?/gi, '')
    // Also handle bullet format (●) as fallback
    .replace(/●\s*Current:[^●\n]+/gi, '')
    .replace(/●\s*Target:\s*[^●\n\d][^●\n]+/gi, '')
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { overallScore, whatThisMeans, cleanedContent };
}

function parseAssessmentIntoSections(assessment: string): Section[] {
  // Split by the horizontal divider pattern
  const parts = assessment.split(/_{10,}/);
  
  const sections: Section[] = [];
  
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    // Skip if this is just the main page header
    if (trimmed.match(/^\*?\*?Your Personalized Health.*Results\*?\*?$/i)) {
      return;
    }
    
    // Check for numbered section header pattern like "2. Metrics..." or "**3. Next Steps**"
    const headerMatch = trimmed.match(/^\*?\*?(\d+)\.\s*([^\n*]+)\*?\*?\n?([\s\S]*)/);
    
    if (headerMatch) {
      sections.push({
        number: headerMatch[1],
        title: headerMatch[2].trim().replace(/\*+/g, ''),
        content: headerMatch[3].trim()
      });
    } else {
      // Check for "Opening Thoughts" pattern (often in bullet/bold format)
      const openingMatch = trimmed.match(/●?\s*\*?\*?Opening Thoughts\*?\*?\s*([\s\S]*)/i);
      
      if (openingMatch) {
        sections.push({
          number: '1',
          title: 'Opening Thoughts',
          content: openingMatch[1].trim()
        });
      } else {
        // Content without a numbered header - could be intro or outro
        const lines = trimmed.split('\n');
        const firstLine = lines[0].replace(/\*+/g, '').replace(/●/g, '').trim();
        
        // Skip if it's the main header repeated
        if (firstLine && !firstLine.toLowerCase().includes('your personalized health')) {
          sections.push({
            number: '',
            title: firstLine,
            content: lines.slice(1).join('\n').trim()
          });
        }
      }
    }
  });
  
  return sections;
}

function SectionCard({ section, isNextSteps = false }: { section: Section; isNextSteps?: boolean }) {
  const isNextStepsSection = isNextSteps || section.title.toLowerCase().includes('next step');
  const isMetricsSection = section.title.toLowerCase().includes('metrics');
  
  // Pre-process metrics section to extract special elements
  const metricsData = useMemo(() => {
    if (isMetricsSection) {
      return preprocessMetricsSection(section.content);
    }
    return null;
  }, [section.content, isMetricsSection]);
  
  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-2xl font-bold text-foreground mt-4 mb-3 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => {
      const text = String(children);
      
      // Skip rendering "Overall Score" and "What this means for you" in metrics section
      // as they are rendered separately
      if (isMetricsSection) {
        if (text.includes('Overall Score:') && text.includes('Target:')) {
          return null;
        }
        if (text.toLowerCase().startsWith('what this means for you')) {
          return null;
        }
      }
      
      // Detect "Example cascade" and render as styled subheading
      if (text.toLowerCase().startsWith('example cascade')) {
        return (
          <h3 className="text-lg font-bold text-foreground mt-6 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            {children}
          </h3>
        );
      }
      
      return (
        <p className="text-foreground/90 leading-relaxed mb-4 last:mb-0">
          {children}
        </p>
      );
    },
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="text-primary font-semibold">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="text-foreground/80 italic">{children}</em>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="space-y-2 mb-4 text-foreground/90 list-none pl-0">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="space-y-2 mb-4 text-foreground/90 list-none pl-0 counter-reset-item">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed flex items-start gap-3">
        <span className="text-primary mt-1.5 text-xs">●</span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="w-full overflow-x-auto rounded-xl border border-primary/30 my-4">
        <table className="w-full border-collapse text-left text-sm min-w-[400px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-primary/15 border-b-2 border-primary/30">
        {children}
      </thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-border/50">{children}</tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
      <tr className="even:bg-muted/20 hover:bg-muted/30 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-4 py-3 font-bold text-primary uppercase text-xs tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-4 py-3 align-top text-foreground/90 border-l-2 border-l-transparent first:border-l-primary/30">
        {children}
      </td>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-foreground/80 bg-primary/5 py-2 rounded-r-lg">
        {children}
      </blockquote>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="bg-muted/50 text-primary px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    ),
    hr: () => (
      <div className="flex items-center gap-2 my-6">
        <div className="flex-1 h-px bg-border" />
        <div className="w-2 h-2 rounded-full bg-primary" />
        <div className="flex-1 h-px bg-border" />
      </div>
    ),
  };
  
  return (
    <div className={`rounded-2xl p-6 md:p-8 mb-6 ${
      isNextStepsSection 
        ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40' 
        : 'bg-card border border-border'
    }`}>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        {section.number && (
          <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {section.number}
          </span>
        )}
        <h2 className={`text-xl md:text-2xl font-bold text-foreground ${
          isNextStepsSection ? 'text-primary' : ''
        }`}>
          {section.title}
        </h2>
      </div>
      
      {/* Section Content */}
      <div className="prose prose-invert max-w-none">
        {isMetricsSection && metricsData ? (
          <>
            {/* Overall Score Badges - Full Width, Horizontal */}
            {metricsData.overallScore && (
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="bg-primary/20 text-primary border border-primary/40 px-5 py-2.5 rounded-full font-bold text-lg whitespace-nowrap">
                  Current Score: {metricsData.overallScore.current}
                </span>
                <span className="text-primary text-2xl font-light">→</span>
                <span className="bg-primary/20 text-primary border border-primary/40 px-5 py-2.5 rounded-full font-bold text-lg whitespace-nowrap">
                  Target: {metricsData.overallScore.target}
                </span>
              </div>
            )}
            
            {/* Cleaned Table Content */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {metricsData.cleanedContent}
            </ReactMarkdown>
            
            {/* What This Means For You - Styled Subheading with Bullets */}
            {metricsData.whatThisMeans && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  What this means for you
                </h3>
                <ul className="space-y-2 text-foreground/90 list-none pl-0">
                  <li className="leading-relaxed flex items-start gap-3">
                    <span className="text-primary mt-1.5 text-xs">●</span>
                    <span><strong className="text-primary font-semibold">Current:</strong> {metricsData.whatThisMeans.current}</span>
                  </li>
                  <li className="leading-relaxed flex items-start gap-3">
                    <span className="text-primary mt-1.5 text-xs">●</span>
                    <span><strong className="text-primary font-semibold">Target:</strong> {metricsData.whatThisMeans.target}</span>
                  </li>
                </ul>
              </div>
            )}
          </>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {section.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export function ResultsStep({ assessment, onEmailCapture, onRetry }: ResultsStepProps) {
  const sections = useMemo(() => parseAssessmentIntoSections(assessment), [assessment]);
  
  return (
    <StepContainer className="flex flex-col">
      {/* Header with Logo */}
      <div className="text-center mb-8">
        <img 
          src={kynareLogo} 
          alt="KYNARE" 
          className="w-12 h-12 mx-auto mb-4"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Your Personalized Health & Performance Results
        </h1>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="h-px w-12 bg-primary/50" />
          <span className="text-primary font-mono text-sm uppercase tracking-widest">Report Card</span>
          <span className="h-px w-12 bg-primary/50" />
        </div>
        <p className="text-muted-foreground font-mono text-sm mt-3">
          clinically guided | motion engineered
        </p>
      </div>

      {/* Assessment Sections */}
      <div className="w-full max-w-3xl mx-auto">
        {sections.length > 0 ? (
          sections.map((section, index) => (
            <SectionCard 
              key={index} 
              section={section}
              isNextSteps={index === sections.length - 1}
            />
          ))
        ) : (
          // Fallback: render as single card if parsing fails
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {assessment}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
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
        className="mt-4 gap-2 text-muted-foreground hover:text-foreground mx-auto"
      >
        <RefreshCw className="w-3 h-3" />
        Start Over
      </Button>
    </StepContainer>
  );
}
