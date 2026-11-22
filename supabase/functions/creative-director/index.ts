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

function getSupabaseCredential(kind: "publishable" | "secret") {
  const legacy = kind === "publishable"
    ? Deno.env.get("SUPABASE_ANON_KEY")
    : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return { key: legacy, legacy: true };
  const raw = Deno.env.get(kind === "publishable" ? "SUPABASE_PUBLISHABLE_KEYS" : "SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const key = parsed.default ?? Object.values(parsed)[0];
      if (typeof key === "string" && key) return { key, legacy: false };
    } catch { /* handled by the missing-credential response */ }
  }
  const fallback = kind === "publishable"
    ? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    : Deno.env.get("SUPABASE_SECRET_KEY");
  return fallback ? { key: fallback, legacy: !fallback.startsWith("sb_") } : null;
}

async function readProviderSecret(
  supabaseUrl: string,
  ownerId: string,
  providerId: string,
  accountId: string,
) {
  const credential = getSupabaseCredential("secret");
  if (!credential) throw new Error("Secure provider credential access is not configured on the server.");
  const headers: Record<string, string> = {
    "apikey": credential.key,
    "Content-Type": "application/json",
  };
  if (credential.legacy) headers.Authorization = "Bearer " + credential.key;
  const response = await fetch(supabaseUrl + "/rest/v1/rpc/read_provider_secret", {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_owner_id: ownerId,
      p_provider_id: providerId,
      p_account_id: accountId,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("The saved provider credential could not be retrieved securely.");
  const value = await response.json();
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseJson(content: string) {
  const normalized = content.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, "").replace(/\s*\x60\x60\x60$/, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI response was not valid JSON.");
  return JSON.parse(normalized.slice(start, end + 1));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in to continue." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishable = getSupabaseCredential("publishable");
  if (!supabaseUrl || !publishable) return reply({ error: "Workspace backend configuration is incomplete." }, 503);
  const supabaseKey = publishable.key;

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
  if (!projectId || !["analyze", "concepts", "script", "refine", "storyboard", "continuity", "audio"].includes(action)) {
    return reply({ error: "A project ID and supported action are required." }, 400);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, production_type, description, target_duration_seconds, metadata")
    .eq("id", projectId)
    .eq("owner_id", authData.user.id)
    .single();

  if (projectError || !project) return reply({ error: "Project not found or access denied." }, 404);

  // Prefer the user's verified default language-model provider. The global environment
  // variables remain a backwards-compatible fallback for an existing single-provider setup.
  let apiKey = Deno.env.get("AI_API_KEY") ?? "";
  let model = Deno.env.get("AI_MODEL") ?? "";
  let endpoint = Deno.env.get("AI_CHAT_COMPLETIONS_URL") ?? "https://api.openai.com/v1/chat/completions";

  const { data: defaultProvider, error: defaultProviderError } = await supabase
    .from("ai_providers")
    .select("id,name,category,connection_status")
    .eq("owner_id", authData.user.id)
    .eq("is_enabled", true)
    .eq("is_default", true)
    .eq("category", "script")
    .maybeSingle();
  if (defaultProviderError) return reply({ error: "Could not read your default AI provider: " + defaultProviderError.message }, 500);

  let selectedProvider = defaultProvider;
  if (!selectedProvider) {
    const { data: generalProvider, error: generalProviderError } = await supabase
      .from("ai_providers")
      .select("id,name,category,connection_status")
      .eq("owner_id", authData.user.id)
      .eq("is_enabled", true)
      .eq("is_default", true)
      .eq("category", "general")
      .maybeSingle();
    if (generalProviderError) return reply({ error: "Could not read your default AI provider: " + generalProviderError.message }, 500);
    selectedProvider = generalProvider;
  }

  if (selectedProvider) {
    if (selectedProvider.connection_status !== "connected") {
      return reply({ error: "Your default language-model provider is not verified. Reconnect it in AI tool manager.", code: "AI_PROVIDER_NOT_VERIFIED" }, 409);
    }
    const { data: connectedAccount, error: accountError } = await supabase
      .from("provider_accounts")
      .select("id,api_base_url,model_id,adapter_key,status")
      .eq("owner_id", authData.user.id)
      .eq("provider_id", selectedProvider.id)
      .eq("status", "connected")
      .eq("adapter_key", "openai_compatible_chat")
      .order("last_verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (accountError) return reply({ error: "Could not read the verified provider account: " + accountError.message }, 500);
    if (!connectedAccount?.api_base_url || !connectedAccount.model_id) {
      return reply({ error: "Your default provider has no verified language-model account. Connect an account in AI tool manager.", code: "AI_PROVIDER_ACCOUNT_MISSING" }, 409);
    }
    try {
      const savedKey = await readProviderSecret(supabaseUrl, authData.user.id, selectedProvider.id, connectedAccount.id);
      if (!savedKey) return reply({ error: "The provider credential is missing from secure storage. Reconnect this account in AI tool manager.", code: "AI_PROVIDER_SECRET_MISSING" }, 409);
      apiKey = savedKey;
      model = connectedAccount.model_id;
      endpoint = connectedAccount.api_base_url.replace(/\/$/, "") + "/chat/completions";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Secure provider access failed.";
      return reply({ error: message, code: "AI_PROVIDER_SECRET_ERROR" }, 503);
    }
  }

  if (!apiKey || !model) {
    return reply({
      error: "No verified default language-model provider is configured. Connect a supported provider and choose Set as default in AI tool manager.",
      code: "AI_PROVIDER_NOT_CONFIGURED",
    }, 503);
  }

  const metadata = (project.metadata && typeof project.metadata === "object") ? project.metadata as Record<string, unknown> : {};
  const intake = metadata.intake && typeof metadata.intake === "object" ? metadata.intake as Record<string, unknown> : {};
  const bible = metadata.production_bible && typeof metadata.production_bible === "object" ? metadata.production_bible : {};
  const existingAnalysis = metadata.project_analysis;
  const selectedConcept = metadata.selected_concept;
  const scriptDraft = metadata.script_draft;
  const approvedScript = metadata.approved_script;
  const storyboard = metadata.storyboard;
  const continuityBible = metadata.continuity_bible;

  if (action === "audio" && (!approvedScript || !storyboard || !metadata.storyboard_approved || !continuityBible || !metadata.continuity_approved)) {
    return reply({ error: "Approve the screenplay, storyboard and continuity bible before preparing the audio plan." }, 409);
  }
  if (action === "storyboard" && !approvedScript) {
    return reply({ error: "Approve the screenplay before creating its storyboard." }, 409);
  }
  if (action === "continuity" && (!approvedScript || !storyboard)) {
    return reply({ error: "Create the storyboard from the approved screenplay before building continuity references." }, 409);
  }
  if (action === "concepts" && !existingAnalysis) {
    return reply({ error: "Run the project analysis before developing concepts." }, 409);
  }
  if (action === "script" && !selectedConcept) {
    return reply({ error: "Choose a creative concept before writing the screenplay." }, 409);
  }
  if (action === "refine" && !scriptDraft) {
    return reply({ error: "Create a first script draft before requesting refinement." }, 409);
  }

  const prompts: Record<string, string> = {
    analyze: "You are the senior Project Analyzer in a professional film and video production studio. Understand the user's idea deeply before production. Do not write the full script yet. Return only valid JSON with keys: creative_thesis (string), objective (string), audience_insight (string), core_message (string), emotional_journey (array of strings), genre_and_tone (string), recommended_format (string), recommended_duration (string), visual_direction (string), storytelling_approach (string), production_considerations (array of strings), risks_and_sensitivities (array of strings), clarification_questions (array of strings). Be specific, thoughtful, culturally aware and practical. Never invent factual research; distinguish creative interpretation from facts.",
    concepts: "You are the Concept Developer in a professional film and video production studio. Based on the approved project analysis, propose exactly three clearly different creative concepts. Return only valid JSON with key concepts: an array of exactly three objects. Each object must have id (concept_1, concept_2, concept_3), title, logline, synopsis, creative_approach, emotional_hook, visual_identity, audience_appeal, strengths (array), production_complexity (low, medium or high), and estimated_duration. Make the concepts meaningfully different, not cosmetic variations. Do not write the full script yet.",
    script: "You are the lead Screenwriter. Write a complete, production-ready screenplay based on the selected concept and project analysis. Do not replace the chosen concept with a different story. Return only valid JSON with keys: title, logline, screenplay (full formatted screenplay as a string with scene headings, action and dialogue), scene_breakdown (array of objects with scene_number, heading, action, dialogue, camera_direction, audio_direction, continuity_notes, duration_seconds), characters (array), locations (array), estimated_total_duration, and writer_notes. Give dialogue natural human rhythm, clear motivations, visual storytelling, meaningful interaction and a satisfying progression. Avoid filler and rushed endings.",
    refine: "You are the senior Script Editor and Story Consultant. Refine the existing screenplay without losing its approved premise, character intent or essential message. Strengthen hooks, scene transitions, dialogue, emotional logic, pacing, character interaction and ending. Return only valid JSON with the same screenplay keys: title, logline, screenplay, scene_breakdown, characters, locations, estimated_total_duration, writer_notes, plus revision_notes (array of concrete changes) and pacing_notes (string). Preserve production practicality and continuity.",
    storyboard: "You are the Storyboard Director in a professional film production studio. Convert the approved screenplay into a practical, visually coherent storyboard. Do not change the story, character intentions or approved dialogue. Return only valid JSON with keys: title, story_summary, visual_approach, total_duration_seconds, scenes. scenes must be an ordered array of 1 to 40 scene objects. Each scene must contain scene_number (integer), title, story_purpose, location, time_of_day, description, characters (array of names), dialogue (string), visual_prompt (detailed standalone image-generation prompt), camera_direction (shot size, angle, lens feel and movement), audio_direction (dialogue delivery, ambience, music and sound effects), continuity_notes, duration_seconds (number), and shots (array of 1 to 8 shot objects). Each shot must contain shot_number, shot_type, framing, camera_movement, visual_description, image_prompt and duration_seconds. Make prompts self-contained and specific. Maintain geography, screen direction, emotional progression, realistic shot durations and clear transitions. Do not claim assets have been generated.",
    continuity: "You are the Continuity Director and visual bible supervisor. Read the approved screenplay and storyboard together. Build a detailed, reusable continuity bible that prevents character, wardrobe, location, prop, lighting and camera inconsistencies across all scenes. Return only valid JSON with keys: title, characters (array of objects with name, narrative_role, age_range, physical_appearance, wardrobe, hair_makeup, voice_and_delivery, behavior_and_performance, continuity_anchors), locations (array of objects with name, visual_description, layout, lighting, environmental_details, continuity_anchors), recurring_props (array of objects with name, description, owner_or_user, state_and_position_rules), visual_style (object with realism_level, medium, texture, composition, color_treatment, reference_mood), color_palette (array), lighting_rules (array), camera_language (array), continuity_rules (array of precise rules), negative_constraints (array of things to avoid), and master_visual_prompt (string). Extract only what the approved story supports. Where a detail is unspecified, label it as a proposed production choice rather than pretending it was in the script. Ensure each character and location has stable identifiers and unambiguous repeatable details.",
    audio: "You are the Audio Director for a professional film and video production. Use the approved screenplay, storyboard and approved continuity bible to create a practical, scene-synchronised audio plan. Do not rewrite approved dialogue or invent a voiceover unless it serves the story. Decide explicitly whether narration/voiceover is needed and explain why. Return only valid JSON with keys: title, audio_strategy (string), voiceover_required (boolean), voiceover_rationale (string), narration (object with script, language, accent_or_dialect, vocal_character, delivery_direction, scene_coverage), voice_cast (array of objects with character, voice_profile, language, accent_or_dialect, vocal_age_and_texture, performance_direction), dialogue_cues (array of objects with scene_number, character, exact_line_or_reference, performance_direction, timing_notes), music_cues (array of objects with cue_id, scene_numbers, emotional_purpose, mood, tempo, instrumentation, entry_and_exit, mix_notes), sound_effects (array of objects with cue_id, scene_number, event, sound_description, timing, perspective), ambience (array of objects with scene_number, environment, sound_layers, transition_notes), mixing_guidelines (array), captions_and_localization (object with caption_style, language, speaker_labels, localization_notes), estimated_audio_duration_seconds (number), and delivery_specifications (array). Match every cue to a real scene. Keep music and effects subordinate to dialogue. Avoid copyrighted-song imitation; describe original music characteristics instead. If a voiceover is unnecessary, return an empty narration script and explain the decision."
  };
  const system = prompts[action];

  const userInput = {
    project: { name: project.name, production_type: project.production_type, description: project.description, target_duration_seconds: project.target_duration_seconds },
    original_intake: intake,
    production_bible: bible,
    previous_analysis: existingAnalysis,
    selected_concept: selectedConcept,
    existing_script: action === "refine" ? scriptDraft : undefined,
    approved_script: action === "storyboard" || action === "continuity" ? approvedScript : undefined,
    storyboard: action === "continuity" || action === "audio" ? storyboard : undefined,
    continuity_bible: action === "audio" ? continuityBible : undefined,
    instruction: ({
      analyze: "Analyze the idea and recommend the strongest creative direction.",
      concepts: "Develop three alternative concepts for the user's approval.",
      script: "Write the complete screenplay for the selected concept.",
      refine: "Refine the screenplay while preserving its approved creative direction.",
      storyboard: "Create a complete scene-by-scene storyboard from the approved screenplay.",
      continuity: "Create a detailed continuity bible from the approved screenplay and storyboard.",
      audio: "Create a complete scene-synchronised audio plan using the approved screenplay, storyboard and continuity bible."
    } as Record<string, string>)[action]
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
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("The AI provider returned an unexpected response structure.");
    }
    if (action === "analyze" && typeof result.creative_thesis !== "string") throw new Error("The project analysis was incomplete. Please retry.");
    if (action === "concepts" && (!Array.isArray(result.concepts) || result.concepts.length !== 3)) throw new Error("The concept developer must return exactly three complete concepts. Please retry.");
    if ((action === "script" || action === "refine") && typeof result.screenplay !== "string") throw new Error("The screenplay response was incomplete. Please retry.");
    if (action === "storyboard" && (!Array.isArray(result.scenes) || result.scenes.length < 1 || result.scenes.length > 40)) throw new Error("The storyboard must contain between 1 and 40 structured scenes. Please retry.");
    if (action === "continuity" && (!Array.isArray(result.characters) || !Array.isArray(result.locations) || !Array.isArray(result.continuity_rules) || typeof result.master_visual_prompt !== "string")) throw new Error("The continuity bible response was incomplete. Please retry.");
    if (action === "audio" && (typeof result.voiceover_required !== "boolean" || !Array.isArray(result.voice_cast) || !Array.isArray(result.dialogue_cues) || !Array.isArray(result.music_cues) || !Array.isArray(result.sound_effects) || !Array.isArray(result.ambience) || !Array.isArray(result.mixing_guidelines))) throw new Error("The audio plan response was incomplete. Please retry.");

    const creativeMetadata = action === "analyze"
      ? { ...metadata, project_analysis: result, concept_options: null, selected_concept: null, script_draft: null, refined_script: null, approved_script: null, storyboard: null, storyboard_approved: false, continuity_bible: null, continuity_approved: false, audio_plan: null, audio_approved: false, creative_stage: "analysis_complete" }
      : action === "concepts"
        ? { ...metadata, concept_options: result.concepts, selected_concept: null, script_draft: null, refined_script: null, approved_script: null, storyboard: null, storyboard_approved: false, continuity_bible: null, continuity_approved: false, audio_plan: null, audio_approved: false, creative_stage: "awaiting_concept_selection" }
        : action === "script"
          ? { ...metadata, script_draft: result, refined_script: null, approved_script: null, storyboard: null, storyboard_approved: false, continuity_bible: null, continuity_approved: false, audio_plan: null, audio_approved: false, creative_stage: "script_draft_ready" }
          : action === "refine"
            ? { ...metadata, refined_script: result, approved_script: null, storyboard: null, storyboard_approved: false, continuity_bible: null, continuity_approved: false, audio_plan: null, audio_approved: false, creative_stage: "script_refined" }
            : action === "storyboard"
              ? { ...metadata, storyboard: result, storyboard_approved: false, continuity_bible: null, continuity_approved: false, audio_plan: null, audio_approved: false, creative_stage: "storyboard_ready" }
              : action === "continuity"
                ? { ...metadata, continuity_bible: result, continuity_approved: false, audio_plan: null, audio_approved: false, creative_stage: "continuity_ready" }
                : { ...metadata, audio_plan: result, audio_approved: false, creative_stage: "audio_ready" };
    const nextMetadata = { ...creativeMetadata, production_route: null, production_route_approved: false, generation_manifest: null, generation_manifest_status: null };

    const { error: saveError } = await supabase.from("projects")
      .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
      .eq("id", projectId).eq("owner_id", authData.user.id);
    if (saveError) throw new Error("The AI response was created but could not be saved: " + saveError.message);

    if (jobId) {
      const stage = ({ analyze: "analysis", concepts: "concepts", script: "script", refine: "refinement", storyboard: "storyboard", continuity: "continuity", audio: "audio" } as Record<string, string>)[action];
      const downstreamStages: Record<string, string[]> = {
        analyze: ["concepts", "script", "refinement", "storyboard", "continuity", "audio", "generation", "assembly"],
        concepts: ["script", "refinement", "storyboard", "continuity", "audio", "generation", "assembly"],
        script: ["refinement", "storyboard", "continuity", "audio", "generation", "assembly"],
        refine: ["storyboard", "continuity", "audio", "generation", "assembly"],
        storyboard: ["continuity", "audio", "generation", "assembly"],
        continuity: ["audio", "generation", "assembly"],
        audio: ["generation", "assembly"],
      };
      const { error: stageError } = await supabase.from("production_steps").update({
        status: action === "analyze" ? "succeeded" : "waiting_for_approval",
        output_payload: result,
        error_message: null,
        updated_at: new Date().toISOString(),
      }).eq("job_id", jobId).eq("owner_id", authData.user.id).eq("stage", stage);
      if (stageError) throw new Error("The AI result was saved, but its production stage could not be updated: " + stageError.message);

      const { error: resetError } = await supabase.from("production_steps").update({
        status: "pending", output_payload: {}, error_message: null, updated_at: new Date().toISOString(),
      }).eq("job_id", jobId).eq("owner_id", authData.user.id).in("stage", downstreamStages[action]);
      if (resetError) throw new Error("The AI result was saved, but downstream stages could not be reset: " + resetError.message);

      const { error: jobUpdateError } = await supabase.from("production_jobs").update({
        status: "waiting_for_approval",
        output_payload: { latest_stage: stage, result },
        updated_at: new Date().toISOString(),
      }).eq("id", jobId).eq("owner_id", authData.user.id);
      if (jobUpdateError) throw new Error("The AI result was saved, but the production job could not be updated: " + jobUpdateError.message);
    }

    return reply({ ok: true, action, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The creative AI request failed.";
    if (jobId) {
      await supabase.from("production_jobs").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", jobId).eq("owner_id", authData.user.id);
      await supabase.from("production_steps").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("job_id", jobId).eq("owner_id", authData.user.id).eq("stage", ({ analyze: "analysis", concepts: "concepts", script: "script", refine: "refinement", storyboard: "storyboard", continuity: "continuity", audio: "audio" } as Record<string, string>)[action]);
    }
    return reply({ error: message }, 502);
  }
});
