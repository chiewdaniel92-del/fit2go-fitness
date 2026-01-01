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
  voiceTranscript: string | null;
  voiceAudioUrl: string | null;
}

export type AssessmentStep = 
  | 'welcome' 
  | 'age' 
  | 'primary-goal' 
  | 'current-state' 
  | 'voice-recording' 
  | 'processing' 
  | 'results' 
  | 'email-capture';

export const STEP_ORDER: AssessmentStep[] = [
  'welcome',
  'age',
  'primary-goal',
  'current-state',
  'voice-recording',
  'processing',
  'results',
  'email-capture',
];

export function getStepIndex(step: AssessmentStep): number {
  return STEP_ORDER.indexOf(step);
}

export function getProgressPercent(step: AssessmentStep): number {
  const index = getStepIndex(step);
  // Welcome is 0%, email-capture is 100%
  return Math.round((index / (STEP_ORDER.length - 1)) * 100);
}
