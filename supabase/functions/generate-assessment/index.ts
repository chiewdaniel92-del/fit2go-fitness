import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a specialist fitness and movement assessment expert for Kynare, a premium wellness company. 

Your role is to generate a personalized, insightful 400-600 word assessment based on the user's responses. You are NOT a medical professional and should not provide medical diagnoses or prescriptions.

WEIGHTED PRIORITY OF INPUTS (use this to guide your analysis):
1. PRIMARY BOTTLENECK (Highest Priority) - This is the core constraint that should steer the entire assessment
2. BODY CONTEXT (High) - Provides descriptive detail about their current situation
3. SUCCESS CRITERIA (Medium) - Defines their desired outcome and direction
4. SYSTEM HISTORY (Medium-Low) - What they've tried before, helps personalize advice
5. PRIMARY GOAL (Low) - General framing only
6. CURRENT STATE (Low) - Tone and risk calibration

ASSESSMENT STRUCTURE (use these exact section headers):
## What We Understood
Summarize their situation with empathy and clarity. Show you truly listened.

## Current State vs Desired Direction
Contrast where they are now with where they want to be.

## Primary Constraint Identified
Based primarily on their bottleneck response, identify the ONE key constraint holding them back.

## What Likely Needs to Change
Provide actionable insights about what shifts in approach, mindset, or training might help.

## Recommended Next Step
A clear, specific first action they can take.

## Educational Insight
One piece of knowledge that helps them understand their body or training better.

TONE RULES:
- Specialist, calm, and supportive
- Non-medical (no diagnoses, no prescriptions)
- Never reference questions directly (don't say "from Q4 you said...")
- Insightful and narrative, not formulaic
- Empathetic but direct
- Use "you" language, speak directly to them`;

interface AssessmentInput {
  age: number;
  primaryGoal: string;
  currentState: string;
  bodyContext: string;
  primaryBottleneck: string;
  successCriteria: string;
  systemHistory: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const input: AssessmentInput = await req.json();
    console.log('Generating assessment for:', { 
      age: input.age,
      primaryGoal: input.primaryGoal,
      currentState: input.currentState,
      hasBodyContext: !!input.bodyContext,
      hasBottleneck: !!input.primaryBottleneck,
      hasSuccess: !!input.successCriteria,
      hasHistory: !!input.systemHistory
    });

    // Build the user prompt with all their responses
    const userPrompt = `Please generate a personalized fitness assessment for this individual:

**Age:** ${input.age} years old

**Primary Goal:** ${input.primaryGoal}

**Current State:** ${input.currentState}

**What's Working vs Not (Body Context):**
${input.bodyContext || "Not provided"}

**The ONE Thing They Want to Fix (Primary Bottleneck):**
${input.primaryBottleneck || "Not provided"}

**Six-Month Success Vision:**
${input.successCriteria || "Not provided"}

**What They've Already Tried:**
${input.systemHistory || "Not provided"}

Generate a comprehensive, personalized assessment following the structure and tone guidelines.`;

    console.log('Calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'We are experiencing high demand. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Service temporarily unavailable. Please try again later.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assessment = data.choices?.[0]?.message?.content;

    if (!assessment) {
      throw new Error('No assessment generated');
    }

    console.log('Assessment generated successfully, length:', assessment.length);

    return new Response(JSON.stringify({ 
      assessment,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating assessment:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate assessment' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
