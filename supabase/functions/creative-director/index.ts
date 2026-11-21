import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseJson(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI response was not valid JSON.");
  return JSON.parse(content.slice(start, end + 1));
  return JSON.parse(cleaned);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in to continue." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) return reply({ error: "Workspace backend configuration is incomplete." }, 503);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice("Bearer ".length);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Your session is invalid or expired. Please sign in again." }, 401);

  let body: { project_id?: string; action?: string };
  try { body = await req.json(); } catch { return reply({ error: "A valid JSON request is required." }, 400); }
  const projectId = body.project_id;
  const action = body.action ?? "analyze";
  if (!projectId || !["analyze", "concepts"].includes(action)) {
    return reply({ error: "A project ID and supported action are required." }, 400);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, production_type, description, target_duration_seconds, metadata")
    .eq("id", projectId)
    .eq("owner_id", authData.user.id)
    .single();

  if (projectError || !project) return reply({ error: "Project not found or access denied." }, 404);

  const apiKey = Deno.env.get("AI_API_KEY");
  const model = Deno.env.get("AI_MODEL");
  const endpoint = Deno.env.get("AI_CHAT_COMPLETIONS_URL") ?? "https://api.openai.com/v1/chat/completions";
  if (!apiKey || !model) {
    return reply({
      error: "The creative AI engine is not connected yet. Add AI_API_KEY and AI_MODEL as Supabase Edge Function secrets before running analysis.",
      code: "AI_PROVIDER_NOT_CONFIGURED",
    }, 503);
  }

  const metadata = (project.metadata && typeof project.metadata === "object") ? project.metadata as Record<string, unknown> : {};
  const intake = metadata.intake && typeof metadata.intake === "object" ? metadata.intake as Record<string, unknown> : {};
  const bible = metadata.production_bible && typeof metadata.production_bible === "object" ? metadata.production_bible : {};
  const existingAnalysis = metadata.project_analysis;

  if (action === "concepts" && !existingAnalysis) {
    return reply({ error: "Run the project analysis before developing concepts." }, 409);
  }

  const system = action === "analyze"
    ? "You are the senior Project Analyzer in a professional film and video production studio. Understand the user's idea deeply before production. Do not write the full script yet. Return only valid JSON with keys: creative_thesis (string), objective (string), audience_insight (string), core_message (string), emotional_journey (array of strings), genre_and_tone (string), recommended_format (string), recommended_duration (string), visual_direction (string), storytelling_approach (string), production_considerations (array of strings), risks_and_sensitivities (array of strings), clarification_questions (array of strings). Be specific, thoughtful, culturally aware and practical. Never invent factual research; distinguish creative interpretation from facts."
    : "You are the Concept Developer in a professional film and video production studio. Based on the approved project analysis, propose exactly three clearly different creative concepts. Return only valid JSON with key concepts: an array of exactly three objects. Each object must have id (concept_1, concept_2, concept_3), title, logline, synopsis, creative_approach, emotional_hook, visual_identity, audience_appeal, strengths (array), production_complexity (low, medium or high), and estimated_duration. Make the concepts meaningfully different, not cosmetic variations. Do not write the full script yet.";

  const userInput = {
    project: { name: project.name, production_type: project.production_type, description: project.description, target_duration_seconds: project.target_duration_seconds },
    original_intake: intake,
    production_bible: bible,
    previous_analysis: action === "concepts" ? existingAnalysis : undefined,
    instruction: action === "analyze" ? "Analyze the idea and recommend the strongest creative direction." : "Develop three alternative concepts for the user's approval."
  };

  const { data: jobs } = await supabase.from("production_jobs")
    .select("id").eq("project_id", projectId).eq("owner_id", authData.user.id)
    .eq("job_type", "idea_to_video").order("created_at", { ascending: false }).limit(1);
  const jobId = jobs?.[0]?.id ?? null;

  try {
    if (jobId) {
      await supabase.from("production_jobs").update({ status: "running", error_message: null, updated_at: new Date().toISOString() }).eq("id", jobId).eq("owner_id", authData.user.id);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(userInput) }],
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error("AI provider returned " + response.status + ": " + detail.slice(0, 500));
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("The AI provider returned an empty response.");
    const result = parseJson(content);

    const nextMetadata = action === "analyze"
      ? { ...metadata, project_analysis: result, concept_options: null, creative_stage: "analysis_complete" }
      : { ...metadata, concept_options: result.concepts, creative_stage: "awaiting_concept_selection" };

    const { error: saveError } = await supabase.from("projects")
      .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
      .eq("id", projectId).eq("owner_id", authData.user.id);
    if (saveError) throw new Error("The AI response was created but could not be saved: " + saveError.message);

    if (jobId) {
      const stage = action === "analyze" ? "analysis" : "concepts";
      await supabase.from("production_steps").update({
        status: action === "analyze" ? "succeeded" : "waiting_for_approval",
        output_payload: result,
        error_message: null,
        updated_at: new Date().toISOString(),
      }).eq("job_id", jobId).eq("owner_id", authData.user.id).eq("stage", stage);

      await supabase.from("production_jobs").update({
        status: "waiting_for_approval",
        output_payload: { latest_stage: stage, result },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", jobId).eq("owner_id", authData.user.id);
    }

    return reply({ ok: true, action, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The creative AI request failed.";
    if (jobId) {
      await supabase.from("production_jobs").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", jobId).eq("owner_id", authData.user.id);
      await supabase.from("production_steps").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("job_id", jobId).eq("owner_id", authData.user.id).eq("stage", action === "analyze" ? "analysis" : "concepts");
    }
    return reply({ error: message }, 502);
  }
});
