import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the Kynare assessment engine. Use only the provided Kynare knowledge base excerpts and the user's inputs. Do not use outside knowledge. If the KB does not cover a topic, produce a minimal, safe assessment using only the user's input and KB principles without inventing facts.

You are not a medical professional. Do not diagnose, prescribe, or use medical certainty.

Output must be valid JSON with these keys:
- assessment_markdown: string
- metric_scores: object with integer values 1-5 for bss, lrb, pcc, sis, oas
- cluster: string or null
- risk_flags: array of strings
- opportunity_flags: array of strings

The assessment_markdown must use ONLY these exact H2 section headers:
## System Operating Principles
## Client Input Sources
## Client Metrics Framework
## Metric Interpretation Combinations
## Risk Flags vs Opportunity Flags
## Ecosystem Components
## Outcome-Based Sequencing Rules

Within "Client Metrics Framework", include each metric name with its score and a brief KB-aligned rationale. Use direct, empathetic "you" language but never reference question numbers. Do not include citations.`;

const CHAT_MODEL = "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";
const KB_MATCH_COUNT = 10;

interface AssessmentInput {
  age: number;
  primaryGoal: string;
  currentState: string;
  bodyContext: string;
  primaryBottleneck: string;
  successCriteria: string;
  systemHistory: string;
}

interface KnowledgeChunk {
  id: string;
  content: string;
  section: string | null;
  page: number | null;
  similarity: number | null;
}

interface AssessmentResult {
  assessment_markdown: string;
  metric_scores: {
    bss: number;
    lrb: number;
    pcc: number;
    sis: number;
    oas: number;
  };
  cluster: string | null;
  risk_flags: string[];
  opportunity_flags: string[];
}

const clampScore = (value: number) => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(1, rounded));
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars are not configured");
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: activeVersions, error: versionError } = await supabase
      .from("kb_versions")
      .select("id, version_label")
      .eq("is_active", true)
      .limit(1);

    if (versionError) {
      throw new Error(`Failed to fetch KB version: ${versionError.message}`);
    }

    const activeVersion = activeVersions?.[0];
    if (!activeVersion) {
      throw new Error("No active KB version found");
    }

    const retrievalQuery = [
      `Age: ${input.age}`,
      `Primary goal: ${input.primaryGoal}`,
      `Current state: ${input.currentState}`,
      `Body context: ${input.bodyContext || "Not provided"}`,
      `Primary bottleneck: ${input.primaryBottleneck || "Not provided"}`,
      `Success criteria: ${input.successCriteria || "Not provided"}`,
      `System history: ${input.systemHistory || "Not provided"}`,
      "Kynare assessment metrics, clusters, and sequencing rules",
    ].join("\n");

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: retrievalQuery,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      throw new Error(`OpenAI embeddings error: ${embeddingResponse.status} ${errorText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData?.data?.[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error("Failed to generate query embedding");
    }

    const { data: matches, error: matchError } = await supabase.rpc("match_kynare_knowledge", {
      p_version_id: activeVersion.id,
      p_query_embedding: queryEmbedding,
      p_match_count: KB_MATCH_COUNT,
    });

    if (matchError) {
      throw new Error(`KB match error: ${matchError.message}`);
    }

    const kbMatches: KnowledgeChunk[] = (matches || []).map((match: KnowledgeChunk) => ({
      id: match.id,
      content: match.content,
      section: match.section ?? null,
      page: match.page ?? null,
      similarity: match.similarity ?? null,
    }));

    const kbContext = kbMatches
      .map((chunk, index) => {
        const label = `KB-${index + 1}`;
        const section = chunk.section ? `Section: ${chunk.section}` : "Section: Unspecified";
        const page = chunk.page ? `Page: ${chunk.page}` : "Page: Unspecified";
        return `[${label}] ${section} | ${page}\n${chunk.content}`;
      })
      .join("\n\n");

    const userPrompt = `KYNARE_KB_EXCERPTS:\n${kbContext}\n\nUSER_INPUT:\n- Age: ${input.age}\n- Primary goal: ${input.primaryGoal}\n- Current state: ${input.currentState}\n- Body context: ${input.bodyContext || "Not provided"}\n- Primary bottleneck: ${input.primaryBottleneck || "Not provided"}\n- Success criteria: ${input.successCriteria || "Not provided"}\n- System history: ${input.systemHistory || "Not provided"}`;

    console.log("Calling OpenAI chat completion...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1600,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'We are experiencing high demand. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'API key is invalid. Please check your OpenAI API key.' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No assessment generated");
    }

    let parsed: AssessmentResult;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse assessment JSON:", content);
      throw new Error("Assessment response was not valid JSON");
    }

    const scores = parsed.metric_scores || {};
    const metrics = {
      bss: clampScore(scores.bss),
      lrb: clampScore(scores.lrb),
      pcc: clampScore(scores.pcc),
      sis: clampScore(scores.sis),
      oas: clampScore(scores.oas),
    };

    if (!parsed.assessment_markdown) {
      throw new Error("Assessment content missing");
    }

    console.log("Assessment generated successfully, length:", parsed.assessment_markdown.length);

    return new Response(JSON.stringify({ 
      assessment: parsed.assessment_markdown,
      metrics,
      cluster: parsed.cluster ?? null,
      risk_flags: parsed.risk_flags ?? [],
      opportunity_flags: parsed.opportunity_flags ?? [],
      kb_version_id: activeVersion.id,
      retrieval: kbMatches.map((chunk) => ({
        chunk_id: chunk.id,
        similarity: chunk.similarity,
        section: chunk.section,
        page: chunk.page,
      })),
      generatedAt: new Date().toISOString(),
      model: CHAT_MODEL
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
