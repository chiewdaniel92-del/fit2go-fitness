export interface AssessmentOption {
  id: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface AssessmentData {
  age: number | null;
  primaryGoalId: string | null;
  currentStateId: string | null;
  // Voice transcripts for each voice step
  bodyContextTranscript: string | null;
  bodyContextAudioUrl: string | null;
  primaryBottleneckTranscript: string | null;
  primaryBottleneckAudioUrl: string | null;
  successCriteriaTranscript: string | null;
  successCriteriaAudioUrl: string | null;
  systemHistoryTranscript: string | null;
  systemHistoryAudioUrl: string | null;
}

export interface AssessmentMetrics {
  bss: number | null;
  lrb: number | null;
  pcc: number | null;
  sis: number | null;
  oas: number | null;
}

export interface AssessmentRetrievalLog {
  chunkId: string;
  similarity: number | null;
  section?: string | null;
  page?: number | null;
}

export interface AssessmentEvidenceMapEntry {
  kbRefs: string[];
  inputRefs: string[];
}

export interface AssessmentEvidenceMap {
  openingThoughts: AssessmentEvidenceMapEntry;
  metrics: AssessmentEvidenceMapEntry;
  connect: AssessmentEvidenceMapEntry;
  scenarios: AssessmentEvidenceMapEntry;
  roadmap: AssessmentEvidenceMapEntry;
}

export interface AssessmentGenerationResult {
  assessment: string;
  metrics: AssessmentMetrics;
  cluster: string | null;
  riskFlags: string[];
  opportunityFlags: string[];
  kbVersionId: string | null;
  retrieval: AssessmentRetrievalLog[];
  evidenceMap?: AssessmentEvidenceMap | null;
}

export type AssessmentStep = 
  | 'welcome' 
  | 'age' 
  | 'primary-goal' 
  | 'current-state' 
  | 'voice-body-context'      // Step 3: What's working vs not
  | 'voice-bottleneck'        // Step 4: Fix ONE thing
  | 'voice-success'           // Step 5: Six months from now
  | 'voice-history'           // Step 6: What have you tried
  | 'processing' 
  | 'results' 
  | 'email-capture'
  | 'success';

export const STEP_ORDER: AssessmentStep[] = [
  'welcome',
  'age',
  'primary-goal',
  'current-state',
  'voice-body-context',
  'voice-bottleneck',
  'voice-success',
  'voice-history',
  'processing',
  'results',
  'email-capture',
  'success',
];

export function getStepIndex(step: AssessmentStep): number {
  return STEP_ORDER.indexOf(step);
}

export function getProgressPercent(step: AssessmentStep): number {
  const index = getStepIndex(step);
  
  // Results, email-capture, and success are all 100% - the assessment is complete
  const resultsIndex = getStepIndex('results');
  if (index >= resultsIndex) {
    return 100;
  }
  
  // For steps before results, calculate percentage relative to reaching results
  return Math.round((index / resultsIndex) * 100);
}

// Voice step configuration
export interface VoiceStepConfig {
  id: AssessmentStep;
  title: string;
  subtitle: string;
  hint?: string | string[]; // String for simple hint, array for scrollable pills
  transcriptKey: keyof AssessmentData;
  audioUrlKey: keyof AssessmentData;
}

export const VOICE_STEPS: VoiceStepConfig[] = [
  {
    id: 'voice-body-context',
    title: "Tell us what's working, what keeps breaking down, and where you feel unsure how to progress",
    subtitle: "Share where your body or training feels reliable, where it doesn't and what you can't quite explain yet",
    transcriptKey: 'bodyContextTranscript',
    audioUrlKey: 'bodyContextAudioUrl',
  },
  {
    id: 'voice-bottleneck',
    title: "If you could fix ONE thing about your body or performance right now, what would it be?",
    subtitle: "",
    hint: [
      "Ongoing or recurring pain that changes how you move or train",
      "Low or inconsistent energy, even with rest",
      "Feeling weak or unstable despite training",
      "Limited mobility that affects performance or confidence",
      "Poor recovery between sessions or days",
      "Struggling with consistency due to flare-ups or fatigue",
    ],
    transcriptKey: 'primaryBottleneckTranscript',
    audioUrlKey: 'primaryBottleneckAudioUrl',
  },
  {
    id: 'voice-success',
    title: "Think about your body, performance, and daily life. What would feel different if you succeeded?",
    subtitle: "Be specific. Small details help us guide your plan precisely",
    hint: [
      "Feeling strong and pain-free in daily movement or training",
      "Being able to recover faster between sessions or days",
      "Having consistent energy levels for work, training, or life",
      "Achieving a new strength, skill, or mobility milestone",
      "Feeling confident in your body's reliability",
      "Knowing your efforts are aligned and compounding towards bigger goals",
    ],
    transcriptKey: 'successCriteriaTranscript',
    audioUrlKey: 'successCriteriaAudioUrl',
  },
  {
    id: 'voice-history',
    title: "What steps, programs, or support have you tried so far? And what actually made a difference?",
    subtitle: "Be honest about what helped, didn't help, or felt confusing",
    hint: [
      "Physiotherapy or manual therapy",
      "Personal training or coaching",
      "Strength or rehab programs",
      "Supplements or nutrition changes",
      "Medical tests or imaging",
      "Physical therapy",
    ],
    transcriptKey: 'systemHistoryTranscript',
    audioUrlKey: 'systemHistoryAudioUrl',
  },
];
