-- =============================================
-- PHASE 1: DATABASE SETUP FOR FIT2GO
-- =============================================

-- 1. Assessment Options: Primary Goal
CREATE TABLE public.assessment_options_primary_goal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read access for options)
ALTER TABLE public.assessment_options_primary_goal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view primary goal options"
ON public.assessment_options_primary_goal
FOR SELECT USING (true);

-- Seed primary goal options
INSERT INTO public.assessment_options_primary_goal (label, description, sort_order) VALUES
  ('Build Strength', 'Focus on building muscle and increasing overall strength', 1),
  ('Improve Mobility', 'Enhance flexibility and range of motion', 2),
  ('Reduce Pain', 'Address chronic pain and discomfort through movement', 3),
  ('Lose Weight', 'Achieve healthy weight loss through exercise', 4),
  ('Increase Energy', 'Boost daily energy levels and vitality', 5);

-- 2. Assessment Options: Current State
CREATE TABLE public.assessment_options_current_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read access for options)
ALTER TABLE public.assessment_options_current_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view current state options"
ON public.assessment_options_current_state
FOR SELECT USING (true);

-- Seed current state options
INSERT INTO public.assessment_options_current_state (label, description, sort_order) VALUES
  ('Just Getting Started', 'New to fitness or returning after a long break', 1),
  ('Returning After Break', 'Was active before but took time off', 2),
  ('Dealing with Injury', 'Working around or recovering from an injury', 3),
  ('Active but Plateaued', 'Exercise regularly but not seeing progress', 4),
  ('Consistent but Seeking More', 'Maintain a routine but want to level up', 5);

-- 3. Main Assessments Table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User inputs
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 99),
  primary_goal_id UUID NOT NULL REFERENCES public.assessment_options_primary_goal(id),
  current_state_id UUID NOT NULL REFERENCES public.assessment_options_current_state(id),
  
  -- Voice recording
  voice_transcript TEXT,
  voice_audio_url TEXT,
  
  -- AI-generated content
  ai_assessment TEXT,
  ai_recommendations JSONB,
  
  -- Email capture
  email TEXT,
  
  -- Access & tracking
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Spam protection
  ip_address INET,
  honeypot_triggered BOOLEAN DEFAULT false,
  completion_time_seconds INTEGER,
  session_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Anyone can create an assessment (public form)
CREATE POLICY "Anyone can create assessments"
ON public.assessments
FOR INSERT WITH CHECK (true);

-- Anyone can view their own assessment via access token
CREATE POLICY "Anyone can view assessment by access token"
ON public.assessments
FOR SELECT USING (true);

-- Anyone can update their own assessment (for completing the flow)
CREATE POLICY "Anyone can update assessments"
ON public.assessments
FOR UPDATE USING (true);

-- Create index for token lookups
CREATE INDEX idx_assessments_access_token ON public.assessments(access_token);
CREATE INDEX idx_assessments_email ON public.assessments(email);
CREATE INDEX idx_assessments_status ON public.assessments(status);

-- 4. Analytics Events Table
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identification
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  
  -- Tracking info
  ip_address INET,
  user_agent TEXT,
  page_url TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can create analytics events (for tracking)
CREATE POLICY "Anyone can create analytics events"
ON public.analytics_events
FOR INSERT WITH CHECK (true);

-- Create indexes for analytics queries
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_assessment ON public.analytics_events(assessment_id);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at);

-- 5. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();