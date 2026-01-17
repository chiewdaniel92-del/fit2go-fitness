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

export interface AssessmentGenerationResult {
  assessment: string;
  metrics: AssessmentMetrics;
  cluster: string | null;
  riskFlags: string[];
  opportunityFlags: string[];
  kbVersionId: string | null;
  retrieval: AssessmentRetrievalLog[];
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
  hint?: string;
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
    hint: "Examples: pain, energy, strength, mobility, recovery, consistency, confidence",
    transcriptKey: 'primaryBottleneckTranscript',
    audioUrlKey: 'primaryBottleneckAudioUrl',
  },
  {
    id: 'voice-success',
    title: "Six months from now, what needs to be true for you to feel like this was a win?",
    subtitle: "",
    transcriptKey: 'successCriteriaTranscript',
    audioUrlKey: 'successCriteriaAudioUrl',
  },
  {
    id: 'voice-history',
    title: "What have you already tried?",
    subtitle: "What helped? What didn't?",
    transcriptKey: 'systemHistoryTranscript',
    audioUrlKey: 'systemHistoryAudioUrl',
  },
];
