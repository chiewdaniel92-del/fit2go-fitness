import { Button } from "@/components/ui/button";
import { StepContainer } from "./StepContainer";
import { Calendar, ArrowRight, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trackEvent } from "@/lib/analytics";
import fit2goLogo from "@/assets/fit2go-logo.svg";
import { openBooking } from "@/lib/brand";
import { useMemo, Children, Fragment, type ReactNode } from "react";

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

const LINE_BREAK_TOKEN = "[[BR]]";
const METRICS_SUMMARY_TITLE = "Your System Summary";

const renderTableCell = (children: ReactNode) => {
  const childArray = Children.toArray(children);
  if (childArray.every((child) => typeof child === "string")) {
    const text = childArray.join("");
    if (text.includes(LINE_BREAK_TOKEN)) {
      const parts = text
        .split(LINE_BREAK_TOKEN)
        .map((part) => part.trim())
        .filter(Boolean);

      return parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {part}
          {index < parts.length - 1 && <br />}
        </Fragment>
      ));
    }
  }
  return children;
};

// Pre-process metrics section to extract Overall Score and "{METRICS_SUMMARY_TITLE}"
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

  // Extract "{METRICS_SUMMARY_TITLE}" with Current/Target bullets
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
    // Remove metrics summary header line
    .replace(/(What this means for you|Your System Summary):?\s*\n?/gi, '')
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

interface ConnectSectionData {
  mainContent: string;
  cascadeTitle: string | null;
  cascadeBullets: string[];
}

// Pre-process connect section to extract "Example cascade in your case"
function preprocessConnectSection(content: string): ConnectSectionData {
  let cascadeTitle: string | null = null;
  let cascadeBullets: string[] = [];
  let mainContent = content;

  // Use indexOf for case-insensitive search
  const lowerContent = content.toLowerCase();
  const cascadePhrase = 'example cascade in your case';
  const splitIndex = lowerContent.indexOf(cascadePhrase);
  
  if (splitIndex !== -1) {
    cascadeTitle = "Example cascade in your case";
    
    // Split content AT the cascade phrase
    mainContent = content.substring(0, splitIndex).trim();
    
    // afterCascade = everything AFTER the cascade phrase
    const afterPhraseStart = splitIndex + cascadePhrase.length;
    let afterCascade = content.substring(afterPhraseStart);
    afterCascade = afterCascade.replace(/^:?\s*/, '');
    
    // Extract cascade items - support numbered lists, bullets, and emoji bullets
    const lines = afterCascade.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Match numbered format: "1. text" or "1) text"
      const numberedMatch = trimmed.match(/^\d+[\.\)]\s*(.+)$/);
      if (numberedMatch && numberedMatch[1]) {
        cascadeBullets.push(numberedMatch[1].trim());
        continue;
      }
      
      // Match bullet format: "- text", "● text", "* text"
      const bulletMatch = trimmed.match(/^[●\-\*]\s*(.+)$/);
      if (bulletMatch && bulletMatch[1]) {
        cascadeBullets.push(bulletMatch[1].trim());
        continue;
      }
      
      // Plain text line items
      if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('*')) {
        if (!trimmed.match(/^\d+\.\s+[A-Z]/)) {
          cascadeBullets.push(trimmed);
        }
      }
    }
  }

  return { mainContent, cascadeTitle, cascadeBullets };
}

interface ProgressionScenario {
  title: string;
  bullets: Array<{ label?: string; text: string }>;
}

interface ProgressionSectionData {
  introText: string;
  scenarios: ProgressionScenario[];
}

// Pre-process progression section to extract individual scenarios
function preprocessProgressionSection(content: string): ProgressionSectionData {
  let introText = '';
  const scenarios: ProgressionScenario[] = [];
  
  // Find all "Scenario X:" matches using regex
  const scenarioPattern = /Scenario\s+\d+:/gi;
  const matches: { index: number; match: string }[] = [];
  let match;
  
  while ((match = scenarioPattern.exec(content)) !== null) {
    matches.push({ index: match.index, match: match[0] });
  }
  
  if (matches.length === 0) {
    // No scenarios found, return content as intro
    return { introText: content.trim(), scenarios: [] };
  }
  
  // Extract intro text (before first scenario)
  introText = content.substring(0, matches[0].index).trim();
  
  // Process each scenario
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index;
    const endIdx = i < matches.length - 1 ? matches[i + 1].index : content.length;
    const scenarioBlock = content.substring(startIdx, endIdx).trim();
    
    // Extract title (first line) and bullets (rest)
    const lines = scenarioBlock.split('\n');
    const titleLine = lines[0].trim();
    const bulletLines = lines.slice(1);
    
    const bullets: Array<{ label?: string; text: string }> = [];
    for (const line of bulletLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match bullet format: "- text", "* text", or bullet glyphs
      const bulletMatch = trimmed.match(/^[•●\-*]\s*(.+)$/);
      const rawText = bulletMatch?.[1]?.trim() ?? trimmed;
      if (!rawText || trimmed.match(/^Scenario\s+\d+:/i)) {
        continue;
      }

      const labelMatch = rawText.match(/^\*{0,2}\s*(Current|Improved|Impact)\s*\*{0,2}\s*:\s*(.+)$/i);

      if (labelMatch) {
        const cleanedText = labelMatch[2]
          .trim()
          .replace(/^\*+\s*/, "")
          .replace(/\*+$/, "")
          .replace(/\*\*/g, "");
        bullets.push({ label: labelMatch[1], text: cleanedText });
      } else {
        bullets.push({ text: rawText.replace(/\*\*/g, "") });
      }
    }
    
    scenarios.push({
      title: titleLine,
      bullets
    });
  }
  
  return { introText, scenarios };
}

interface RoadmapSectionData {
  tableContent: string;
  outcomeText: string | null;
  nextStepsText: string | null;
}

// Pre-process roadmap section to extract Outcome and Next Steps text
function preprocessRoadmapSection(content: string): RoadmapSectionData {
  let outcomeText: string | null = null;
  let nextStepsText: string | null = null;
  let tableContent = content;
  
  // Extract "Outcome:" text (stops at "Next Steps:" if present, or end of string)
  const outcomeMatch = content.match(/Outcome:\s*(.+?)(?=Next Steps:|$)/is);
  if (outcomeMatch) {
    outcomeText = outcomeMatch[1].trim().replace(/\|/g, '').trim();
  }
  
  // Extract "Next Steps:" text
  const nextStepsMatch = content.match(/Next Steps:\s*(.+?)$/is);
  if (nextStepsMatch) {
    nextStepsText = nextStepsMatch[1].trim().replace(/\|/g, '').trim();
  }
  
  // Remove both from table content
  tableContent = content
    .replace(/Outcome:.*$/is, '')
    .trim();
  // Clean up any trailing empty table rows
  tableContent = tableContent.replace(/\|\s*\|\s*\|\s*$/gm, '').trim();
  
  return { tableContent, outcomeText, nextStepsText };
}

interface CtaSectionData {
  introText: string;
  entryPoints: Array<{ number: string; title: string; description: string }>;
  consultationText: string;
  sessionIncludes: string[];
  ctaLink: string;
  ctaText: string;
}

// Pre-process CTA section (Section 6) to extract structured content
function preprocessCtaSection(content: string): CtaSectionData {
  let introText = '';
  let entryPoints: Array<{ number: string; title: string; description: string }> = [];
  let consultationText = '';
  let sessionIncludes: string[] = [];
  let ctaLink = '';
  let ctaText = '';
  
  // Extract intro text (marked with INTRO:)
  const introMatch = content.match(/INTRO:\s*(.+?)(?=ENTRY_POINTS_START:|$)/is);
  if (introMatch) {
    introText = introMatch[1].trim();
  }
  
  // Extract entry points
  const entryPointsMatch = content.match(/ENTRY_POINTS_START:\s*([\s\S]*?)ENTRY_POINTS_END:/i);
  if (entryPointsMatch) {
    const lines = entryPointsMatch[1].trim().split('\n');
    lines.forEach(line => {
      const match = line.match(/^(\d+)\.\s*([^|]+)\s*\|\s*(.+)$/);
      if (match) {
        entryPoints.push({
          number: match[1],
          title: match[2].trim(),
          description: match[3].trim()
        });
      }
    });
  }
  
  // Extract consultation text
  const consultMatch = content.match(/CONSULTATION:\s*(.+?)(?=SESSION_INCLUDES_START:|$)/is);
  if (consultMatch) {
    consultationText = consultMatch[1].trim();
  }
  
  // Extract session includes
  const sessionMatch = content.match(/SESSION_INCLUDES_START:\s*([\s\S]*?)SESSION_INCLUDES_END:/i);
  if (sessionMatch) {
    sessionIncludes = sessionMatch[1].trim().split('\n').map(line => line.trim()).filter(Boolean);
  }
  
  // Extract CTA link
  const linkMatch = content.match(/CTA_LINK:\s*(.+?)(?=\n|$)/i);
  if (linkMatch) {
    ctaLink = linkMatch[1].trim();
  }
  
  // Extract CTA text
  const textMatch = content.match(/CTA_TEXT:\s*(.+?)$/is);
  if (textMatch) {
    ctaText = textMatch[1].trim();
  }
  
  return { introText, entryPoints, consultationText, sessionIncludes, ctaLink, ctaText };
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
  const isOpeningSection = section.title.toLowerCase().includes('opening thoughts');
  const isProgressionSection = section.title.toLowerCase().includes('progression') || 
                               section.title.toLowerCase().includes('scenarios');
  const isMetricsSection = section.title.toLowerCase().includes('metrics') && 
                           !section.title.toLowerCase().includes('connect') &&
                           !section.title.toLowerCase().includes('progression');
  const isConnectSection = section.title.toLowerCase().includes('how these metrics connect');
  const isRoadmapSection = section.title.toLowerCase().includes('implementation roadmap') || 
                           section.title.toLowerCase().includes('roadmap');
  const isCtaSection = section.title.toLowerCase().includes('ready to make progress') || 
                       section.title.toLowerCase().includes('predictable, repeatable');
  
  // Pre-process metrics section to extract special elements
  const metricsData = useMemo(() => {
    if (isMetricsSection) {
      return preprocessMetricsSection(section.content);
    }
    return null;
  }, [section.content, isMetricsSection]);
  
  // Pre-process connect section to extract cascade subsection
  const connectData = useMemo(() => {
    if (isConnectSection) {
      return preprocessConnectSection(section.content);
    }
    return null;
  }, [section.content, isConnectSection]);
  
  // Pre-process progression section to extract scenarios
  const progressionData = useMemo(() => {
    if (isProgressionSection) {
      return preprocessProgressionSection(section.content);
    }
    return null;
  }, [section.content, isProgressionSection]);
  
  // Pre-process roadmap section to extract Outcome text
  const roadmapData = useMemo(() => {
    if (isRoadmapSection) {
      return preprocessRoadmapSection(section.content);
    }
    return null;
  }, [section.content, isRoadmapSection]);
  
  // Pre-process CTA section (Section 6)
  const ctaData = useMemo(() => {
    if (isCtaSection) {
      return preprocessCtaSection(section.content);
    }
    return null;
  }, [section.content, isCtaSection]);

  const openingContent = useMemo(() => {
    if (!isOpeningSection) return section.content;
    const blocks = section.content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    const paragraphs = blocks.length > 1
      ? blocks
      : section.content.split(/\n+/).map((block) => block.trim()).filter(Boolean);
    const cappedParagraphs = paragraphs.slice(0, 3).map((paragraph) => {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [paragraph];
      return sentences.slice(0, 2).join(" ").trim();
    });
    return cappedParagraphs.join("\n\n");
  }, [section.content, isOpeningSection]);
  
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
      
      // Skip rendering "Overall Score" and "{METRICS_SUMMARY_TITLE}" in metrics section
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
    table: ({ children, node }: { children?: React.ReactNode; node?: any }) => {
      const headerRow = node?.children?.find((child: any) => child.tagName === "thead")?.children?.[0];
      const bodyRow = node?.children?.find((child: any) => child.tagName === "tbody")?.children?.[0];
      const firstRow = headerRow ?? bodyRow;
      const columnCount = firstRow?.children?.length ?? 0;
      const dataColumns = columnCount ? String(columnCount) : undefined;
      return (
      <div className="w-full overflow-x-auto rounded-xl border border-primary/30 my-4">
        <table
          data-columns={dataColumns}
          className={`w-full border-collapse text-left text-sm min-w-[400px] ${isRoadmapSection ? 'roadmap-table' : ''}`}
        >
          {children}
        </table>
      </div>
      );
    },
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
    th: ({ children, node }: { children?: React.ReactNode; node?: any }) => {
      // For roadmap tables, make the Week column narrower
      const text = String(children).toLowerCase();
      const isWeekColumn = isRoadmapSection && text.includes('week');
      return (
        <th className={`px-4 py-3 font-bold text-primary uppercase text-xs tracking-wider ${isWeekColumn ? 'w-20' : ''}`}>
          {children}
        </th>
      );
    },
    td: ({ children, node }: { children?: React.ReactNode; node?: any }) => (
      <td className="px-4 py-3 align-top text-foreground/90 border-l-2 border-l-transparent first:border-l-primary/30 first:w-20">
        {renderTableCell(children)}
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
                  {METRICS_SUMMARY_TITLE}
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
        ) : isConnectSection && connectData ? (
          <>
            {/* Main "→" bullet points */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {connectData.mainContent}
            </ReactMarkdown>
            
            {/* Example Cascade Subheading */}
            {connectData.cascadeTitle && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  {connectData.cascadeTitle}
                </h3>
                
                {/* Cascade Bullet Points */}
                {connectData.cascadeBullets.length > 0 && (
                  <ul className="space-y-2 text-foreground/90 list-none pl-0">
                    {connectData.cascadeBullets.map((bullet, idx) => (
                      <li key={idx} className="leading-relaxed flex items-start gap-3">
                        <span className="text-primary mt-1.5 text-xs">●</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        ) : isProgressionSection && progressionData ? (
          <>
            {/* Intro text if any */}
            {progressionData.introText && (
              <p className="text-foreground/90 leading-relaxed mb-4">
                {progressionData.introText}
              </p>
            )}
            
            {/* Each Scenario as a separate subheading */}
            {progressionData.scenarios.map((scenario, idx) => (
              <div key={idx} className="mt-6 first:mt-0">
                {/* Scenario Title as subheading */}
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  {scenario.title}
                </h3>
                
                {/* Scenario Bullets */}
                {scenario.bullets.length > 0 && (
                  <ul className="space-y-2 text-foreground/90 list-none pl-0">
                    {scenario.bullets.map((bullet, bulletIdx) => (
                      <li key={bulletIdx} className="leading-relaxed flex items-start gap-3">
                        <span className="text-primary mt-1.5 text-xs">●</span>
                        <span>
                          {bullet.label ? (
                            <>
                              <strong className="text-primary font-semibold">{bullet.label}:</strong>{" "}
                              {bullet.text}
                            </>
                          ) : (
                            bullet.text
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </>
        ) : isRoadmapSection && roadmapData ? (
          <>
            {/* Table Content (without Outcome row) */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {roadmapData.tableContent}
            </ReactMarkdown>
            
            {/* Outcome Subheading - Separate from table */}
            {roadmapData.outcomeText && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Outcome
                </h3>
                <p className="text-foreground/90 leading-loose">
                  {roadmapData.outcomeText}
                </p>
              </div>
            )}
            
            {/* Next Steps Subheading - Separate from table */}
            {roadmapData.nextStepsText && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Next Steps
                </h3>
                <p className="text-foreground/90 leading-loose">
                  {roadmapData.nextStepsText}
                </p>
              </div>
            )}
          </>
        ) : isCtaSection && ctaData ? (
          <>
            {/* Intro Text */}
            {ctaData.introText && (
              <p className="text-foreground/90 leading-relaxed mb-6">
                {ctaData.introText}
              </p>
            )}
            
            {/* Entry Points Subheading */}
            {ctaData.entryPoints.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  With Two Entry Points
                </h3>
                
                {/* Entry Point Cards */}
                <div className="space-y-3">
                  {ctaData.entryPoints.map((point, idx) => (
                    <div 
                      key={idx}
                      className="bg-muted/30 border border-border rounded-xl p-4 flex items-start gap-4"
                    >
                      <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                        {point.number}
                      </span>
                      <div>
                        <h4 className="font-bold text-foreground mb-1">{point.title}</h4>
                        <p className="text-foreground/70 text-sm">{point.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Consultation Text */}
            {ctaData.consultationText && (
              <p className="text-foreground/80 leading-relaxed mb-6 text-sm italic">
                {ctaData.consultationText}
              </p>
            )}
            
            {/* Session Includes Subheading */}
            {ctaData.sessionIncludes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Your First Fit2Go Session Includes
                </h3>
                
                {/* Checklist Items */}
                <ul className="space-y-3 list-none pl-0">
                  {ctaData.sessionIncludes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-primary mt-0.5 shrink-0">✓</span>
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* CTA Block */}
            {ctaData.ctaLink && (
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 rounded-2xl p-6 text-center mt-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Schedule Your First Session Today
                </h3>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors mb-4"
                  onClick={() => {
                    trackEvent('cta_book_session_click', { location: 'section_6' });
                    openBooking();
                  }}
                >
                  <Calendar className="w-5 h-5" />
                  Book Now
                </button>
                {ctaData.ctaText && (
                  <p className="text-foreground/70 text-sm leading-relaxed mt-4">
                    {ctaData.ctaText}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {openingContent}
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
          src={fit2goLogo} 
          alt="Fit2Go" 
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
          train smart | move daily | stay consistent
        </p>
      </div>

      {/* Mini CTA Banner - shown between Section 1 and Section 2 */}
      {(() => {
        const MiniCtaBanner = () => (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-4 px-4 my-6 bg-card/50 border border-border/50 rounded-xl">
            <span className="text-sm text-muted-foreground">Ready to take the next step?</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                trackEvent("mini_cta_clicked", { location: "after_section_1" });
                openBooking();
              }}
            >
              <Calendar className="w-4 h-4" />
              Schedule Your First Session
            </Button>
          </div>
        );

        return null; // Component defined, rendered below
      })()}

      {/* Assessment Sections */}
      <div className="w-full max-w-3xl mx-auto">
        {sections.length > 0 ? (
          sections.map((section, index) => (
            <Fragment key={index}>
              <SectionCard 
                section={section}
                isNextSteps={index === sections.length - 1}
              />
              {/* Insert mini CTA after Section 1 (Opening Thoughts) */}
              {section.number === '1' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-4 px-4 my-6 bg-card/50 border border-border/50 rounded-xl">
                  <span className="text-sm text-muted-foreground">Ready to take the next step?</span>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      trackEvent("mini_cta_clicked", { location: "after_section_1" });
                      openBooking();
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Your First Session
                  </Button>
                </div>
              )}
            </Fragment>
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
            openBooking();
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
