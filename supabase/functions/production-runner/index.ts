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

type JsonRecord = Record<string, unknown>;

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
  if (!body.project_id || (body.action ?? "prepare") !== "prepare") {
    return reply({ error: "A project ID and supported action are required." }, 400);
  }

  const ownerId = authData.user.id;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, metadata")
    .eq("id", body.project_id)
    .eq("owner_id", ownerId)
    .single();
  if (projectError || !project) return reply({ error: "Project not found or access denied." }, 404);

  const metadata = (project.metadata && typeof project.metadata === "object")
    ? project.metadata as JsonRecord : {};
  const storyboard = metadata.storyboard && typeof metadata.storyboard === "object"
    ? metadata.storyboard as JsonRecord : null;
  const route = metadata.production_route && typeof metadata.production_route === "object"
    ? metadata.production_route as JsonRecord : null;

  const approvals = {
    screenplay: Boolean(metadata.approved_script),
    storyboard: metadata.storyboard_approved === true,
    continuity: metadata.continuity_approved === true,
    audio: metadata.audio_approved === true,
    routing: metadata.production_route_approved === true,
  };
  const missingApprovals = Object.entries(approvals).filter(([, approved]) => !approved).map(([name]) => name);
  if (missingApprovals.length) {
    return reply({
      error: "The generation manifest cannot be prepared until all production approvals are recorded.",
      code: "PRODUCTION_APPROVALS_REQUIRED",
      missing_approvals: missingApprovals,
    }, 409);
  }
  if (!storyboard || !Array.isArray(storyboard.scenes) || storyboard.scenes.length < 1 || storyboard.scenes.length > 40) {
    return reply({ error: "The approved storyboard is missing valid scene data.", code: "STORYBOARD_INVALID" }, 409);
  }
  if (!route || !Array.isArray(route.routes)) {
    return reply({ error: "Run the Production Director before preparing the generation manifest.", code: "ROUTING_PLAN_REQUIRED" }, 409);
  }

  const routes = route.routes as JsonRecord[];
  const routeByCategory = new Map<string, JsonRecord>();\n  for (const item of routes) routeByCategory.set(String(item.category ?? ""), item);
  const requiredCategories = ["image", "video", "editing"];
  const audioPlan = metadata.audio_plan && typeof metadata.audio_plan === "object"
    ? metadata.audio_plan as JsonRecord : {};
  const voiceRequired = audioPlan.voiceover_required === true ||
    (Array.isArray(audioPlan.voice_cast) && audioPlan.voice_cast.length > 0) ||
    (Array.isArray(audioPlan.dialogue_cues) && audioPlan.dialogue_cues.length > 0);
  const musicRequired = ["music_cues", "sound_effects", "ambience"].some(key =>
    Array.isArray(audioPlan[key]) && (audioPlan[key] as unknown[]).length > 0
  );
  if (voiceRequired) requiredCategories.push("voice");
  if (musicRequired) requiredCategories.push("music");

  const departmentReadiness = requiredCategories.map(category => {
    const item = routeByCategory.get(category);
    const status = String(item?.route_status ?? "provider_not_registered");
    // No adapter is currently declared verified by the Production Director.
    const adapterVerified = item?.adapter_verified === true && item?.execution_ready === true;
    return {
      category,
      title: String(item?.title ?? category),
      provider: item?.assigned_provider && typeof item.assigned_provider === "object"
        ? String((item.assigned_provider as JsonRecord).name ?? "Unassigned") : "Unassigned",
      route_status: status,
      adapter_verified: adapterVerified,
      execution_ready: adapterVerified,
      blocker: adapterVerified ? null : String(item?.next_action ?? "A tested provider adapter is not available for this department."),
    };
  });

  const tasks: JsonRecord[] = [];
  const canRunDepartment = (category: string) =>
    departmentReadiness.some(item => item.category === category && item.execution_ready);
  const addTask = (task: JsonRecord, category: string) => {
    tasks.push({
      ...task,
      status: canRunDepartment(category) ? "ready_for_worker" : "blocked_by_adapter",
      attempts: 0,
      max_attempts: 2,
    });
  };
  const sceneRows = storyboard.scenes as JsonRecord[];
  for (const scene of sceneRows) {
    const sceneNumber = Number(scene.scene_number);
    if (!Number.isInteger(sceneNumber) || sceneNumber < 1 || !Array.isArray(scene.shots) || scene.shots.length < 1 || scene.shots.length > 8) {
      return reply({
        error: "The storyboard contains a scene with invalid numbering or an unsupported shot list.",
        code: "STORYBOARD_SCENE_INVALID",
        scene_number: scene.scene_number ?? null,
      }, 409);
    }
    for (const shot of scene.shots as JsonRecord[]) {
      const shotNumber = Number(shot.shot_number);
      if (!Number.isInteger(shotNumber) || shotNumber < 1 || typeof shot.image_prompt !== "string" || !shot.image_prompt.trim()) {
        return reply({ error: "Every storyboard shot needs a valid shot number and image prompt.", code: "STORYBOARD_SHOT_INVALID", scene_number: sceneNumber }, 409);
      }
      addTask({
        task_key: `${project.id}:scene-${sceneNumber}:shot-${shotNumber}:image`,
        task_type: "image_reference",
        department: "image",
        scene_number: sceneNumber,
        shot_number: shotNumber,
        title: `Scene ${sceneNumber} · Shot ${shotNumber} visual reference`,
        prompt: shot.image_prompt,
      }, "image");
      addTask({
        task_key: `${project.id}:scene-${sceneNumber}:shot-${shotNumber}:video`,
        task_type: "video_clip",
        department: "video",
        scene_number: sceneNumber,
        shot_number: shotNumber,
        title: `Scene ${sceneNumber} · Shot ${shotNumber} motion clip`,
        prompt: [shot.visual_description, shot.framing, shot.camera_movement]
          .filter(value => typeof value === "string").join("\n"),
      }, "video");
    }
  }

  const addCueTasks = (key: string, category: string, taskType: string) => {
    const cues = Array.isArray(audioPlan[key]) ? audioPlan[key] as JsonRecord[] : [];
    cues.forEach((cue, index) => {
      const sceneNumber = Number(cue.scene_number ?? (Array.isArray(cue.scene_numbers) ? cue.scene_numbers[0] : 0));
      const label = String(cue.cue_id ?? cue.character ?? cue.event ?? cue.emotional_purpose ?? key + "-" + (index + 1));
      const prompt = [
        cue.exact_line_or_reference, cue.script, cue.performance_direction,
        cue.sound_description, cue.mood, cue.tempo, cue.instrumentation,
        cue.mix_notes, cue.timing, cue.entry_and_exit, cue.environment, cue.sound_layers,
      ].filter(value => typeof value === "string" && value.trim()).join("\n");
      addTask({
        task_key: `${project.id}:${taskType}:${label.replaceAll(" ", "-").toLowerCase()}`,
        task_type: taskType,
        department: category,
        scene_number: Number.isFinite(sceneNumber) && sceneNumber > 0 ? sceneNumber : null,
        title: label,
        prompt,
        cue,
      }, category);
    });
  };

  if (voiceRequired) {
    if (audioPlan.voiceover_required === true && audioPlan.narration && typeof audioPlan.narration === "object") {
      const narration = audioPlan.narration as JsonRecord;
      addTask({
        task_key: `${project.id}:voiceover:narration`,
        task_type: "voiceover",
        department: "voice",
        scene_number: null,
        title: "Narration performance",
        prompt: String(narration.script ?? ""),
        cue: narration,
      }, "voice");
    }
    addCueTasks("dialogue_cues", "voice", "dialogue_performance");
  }
  if (musicRequired) {
    addCueTasks("music_cues", "music", "original_music");
    addCueTasks("sound_effects", "music", "sound_effect");
    addCueTasks("ambience", "music", "ambience");
  }

  const blockers = departmentReadiness.filter(item => !item.execution_ready);
  const manifest = {
    version: 1,
    prepared_at: new Date().toISOString(),
    project_name: project.name,
    mode: "execution_manifest_only",
    manifest_status: blockers.length ? "blocked_by_adapter" : "ready_for_worker_review",
    execution_started: false,
    execution_ready: blockers.length === 0,
    approvals,
    summary: {
      scenes: sceneRows.length,
      shots: tasks.filter(task => task.task_type === "image_reference").length,
      planned_tasks: tasks.length,
      blocked_departments: blockers.length,
      tasks_blocked: tasks.filter(task => task.status === "blocked_by_adapter").length,
      tasks_ready_for_worker: tasks.filter(task => task.status === "ready_for_worker").length,
    },
    departments: departmentReadiness,
    tasks,
    next_step: blockers.length
      ? "Install and verify provider-specific execution adapters. No provider calls or media generation have started."
      : "A separately deployed worker must claim and execute these tasks before production can start.",
    safety_note: "This is a durable scene-and-shot execution manifest, not a generation run. It does not call external providers, create media, or mark scenes as generated. Each task has a stable idempotency key for a future worker.",
  };

  const { data: jobs, error: jobsError } = await supabase.from("production_jobs")
    .select("id").eq("project_id", project.id).eq("owner_id", ownerId)
    .eq("job_type", "idea_to_video").order("created_at", { ascending: false }).limit(1);
  if (jobsError) return reply({ error: "Could not locate the production job: " + jobsError.message }, 500);
  const jobId = jobs?.[0]?.id;
  if (!jobId) return reply({ error: "This project has no idea-to-video production job." }, 409);

  const nextMetadata = { ...metadata, generation_manifest: manifest, generation_manifest_status: manifest.manifest_status };
  const { error: metadataError } = await supabase.from("projects").update({
    metadata: nextMetadata, updated_at: new Date().toISOString(),
  }).eq("id", project.id).eq("owner_id", ownerId);
  if (metadataError) return reply({ error: "The manifest was prepared but could not be saved to the project: " + metadataError.message }, 500);

  const { error: stepError } = await supabase.from("production_steps").update({
    status: "pending",
    input_payload: { manifest_version: 1, execution_started: false, blocked_by_adapter: blockers.length > 0 },
    output_payload: manifest,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("job_id", jobId).eq("owner_id", ownerId).eq("stage", "generation");
  if (stepError) return reply({ error: "The manifest is saved, but the generation workflow stage could not be updated: " + stepError.message }, 500);

  const { error: jobUpdateError } = await supabase.from("production_jobs").update({
    status: "waiting_for_approval",
    output_payload: { generation_manifest_status: manifest.manifest_status, execution_started: false, next_stage: blockers.length ? "provider_adapter_setup" : "worker_setup" },
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("owner_id", ownerId);
  if (jobUpdateError) return reply({ error: "The manifest is saved, but the production job could not be updated: " + jobUpdateError.message }, 500);

  return reply({ ok: true, manifest });
});
