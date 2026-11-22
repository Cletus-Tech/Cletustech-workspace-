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

type Provider = {
  id: string;
  name: string;
  category: string;
  website_url: string | null;
  connection_type: string;
  connection_status: string;
  is_enabled: boolean;
  is_default: boolean;
  capabilities: Record<string, unknown> | null;
  notes: string | null;
};

type Account = {
  id: string;
  provider_id: string;
  label: string;
  external_account_label: string | null;
  connection_method: string;
  status: string;
  last_verified_at: string | null;
  last_tested_at: string | null;
  api_base_url: string | null;
  model_id: string | null;
  adapter_key: string | null;
  verified_models: string[] | null;
  connection_error: string | null;
  notes: string | null;
};

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
  const action = body.action ?? "plan";
  if (!projectId || action !== "plan") return reply({ error: "A project ID and supported action are required." }, 400);

  const ownerId = authData.user.id;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, metadata")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .single();
  if (projectError || !project) return reply({ error: "Project not found or access denied." }, 404);

  const metadata = project.metadata && typeof project.metadata === "object"
    ? project.metadata as Record<string, unknown> : {};
  const storyboard = metadata.storyboard && typeof metadata.storyboard === "object"
    ? metadata.storyboard as Record<string, unknown> : null;
  const audioPlan = metadata.audio_plan && typeof metadata.audio_plan === "object"
    ? metadata.audio_plan as Record<string, unknown> : null;

  if (!metadata.approved_script || !metadata.storyboard_approved || !metadata.continuity_approved || !metadata.audio_approved || !storyboard || !audioPlan) {
    return reply({ error: "Approve the screenplay, storyboard, continuity bible and audio plan before provider routing." }, 409);
  }

  const [{ data: providerRows, error: providerError }, { data: accountRows, error: accountError }] = await Promise.all([
    supabase.from("ai_providers")
      .select("id,name,category,website_url,connection_type,connection_status,is_enabled,is_default,capabilities,notes")
      .eq("owner_id", ownerId).eq("is_enabled", true),
    supabase.from("provider_accounts")
      .select("id,provider_id,label,external_account_label,connection_method,status,last_verified_at,last_tested_at,api_base_url,model_id,adapter_key,verified_models,connection_error,notes")
      .eq("owner_id", ownerId),
  ]);
  if (providerError) return reply({ error: "Could not read your provider registry: " + providerError.message }, 500);
  if (accountError) return reply({ error: "Could not read provider account profiles: " + accountError.message }, 500);

  const providers = (providerRows ?? []) as Provider[];
  const accounts = (accountRows ?? []) as Account[];
  const voiceRequired = audioPlan.voiceover_required === true ||
    (Array.isArray(audioPlan.voice_cast) && audioPlan.voice_cast.length > 0) ||
    (Array.isArray(audioPlan.dialogue_cues) && audioPlan.dialogue_cues.length > 0);
  const musicRequired =
    (Array.isArray(audioPlan.music_cues) && audioPlan.music_cues.length > 0) ||
    (Array.isArray(audioPlan.sound_effects) && audioPlan.sound_effects.length > 0) ||
    (Array.isArray(audioPlan.ambience) && audioPlan.ambience.length > 0);

  const requirements = [
    { category: "image", title: "Scene stills & visual references", purpose: "Create consistent scene frames, character references and visual assets." },
    { category: "video", title: "Motion & scene generation", purpose: "Turn approved scene direction into moving footage or clips." },
    ...(voiceRequired ? [{ category: "voice", title: "Voice & dialogue production", purpose: "Record or synthesise approved narration and character performances." }] : []),
    ...(musicRequired ? [{ category: "music", title: "Music, ambience & sound design", purpose: "Create or source original score, ambience and designed effects." }] : []),
    { category: "editing", title: "Editing, synchronisation & export", purpose: "Assemble scenes, audio, captions, transitions and delivery files." },
  ];

  const routes = requirements.map(requirement => {
    const categoryProviders = providers.filter(provider => provider.category === requirement.category);
    const candidates = categoryProviders.map(provider => {
      const providerAccounts = accounts.filter(account => account.provider_id === provider.id);
      const connectedAccounts = providerAccounts.filter(account =>
        account.status === "connected" && provider.connection_status === "connected"
      ).sort((a, b) => Date.parse(b.last_verified_at ?? "") - Date.parse(a.last_verified_at ?? ""));
      const preferredAccount = connectedAccounts[0] ?? providerAccounts[0] ?? null;
      return { provider, providerAccounts, connectedAccounts, preferredAccount };
    }).sort((a, b) => {
      const aReady = a.connectedAccounts.length ? 1 : 0;
      const bReady = b.connectedAccounts.length ? 1 : 0;
      if (aReady !== bReady) return bReady - aReady;
      if (a.provider.is_default !== b.provider.is_default) return a.provider.is_default ? -1 : 1;
      return a.provider.name.localeCompare(b.provider.name);
    });

    const chosen = candidates[0];
    if (!chosen) {
      return {
        ...requirement, route_status: "provider_not_registered", assigned_provider: null,
        alternatives: [], execution_ready: false,
        next_action: "Register a provider with this capability in AI tool manager.",
      };
    }

    const provider = chosen.provider;
    const account = chosen.preferredAccount;
    const connected = chosen.connectedAccounts.length > 0;
    const routeStatus = connected
      ? "account_marked_connected_adapter_missing"
      : chosen.providerAccounts.length > 0
        ? "account_connection_required"
        : "provider_account_required";
    return {
      ...requirement,
      route_status: routeStatus,
      assigned_provider: {
        id: provider.id, name: provider.name, category: provider.category,
        website_url: provider.website_url, connection_type: provider.connection_type,
        registry_connection_status: provider.connection_status,
        account_label: account?.label ?? null,
        account_status: account?.status ?? "no_account_profile",
        account_connection_method: account?.connection_method ?? null,
        last_verified_at: account?.last_verified_at ?? null,
        last_tested_at: account?.last_tested_at ?? null,
        adapter_key: account?.adapter_key ?? null,
        configured_model: account?.model_id ?? null,
        api_base_url: account?.api_base_url ?? null,
        verified_models: account?.verified_models ?? [],
        connection_error: account?.connection_error ?? null,
        provider_notes: provider.notes,
        capabilities: provider.capabilities ?? {},
      },
      alternatives: candidates.slice(1, 4).map(candidate => ({
        id: candidate.provider.id, name: candidate.provider.name,
        connection_status: candidate.provider.connection_status,
        account_status: candidate.preferredAccount?.status ?? "no_account_profile",
      })),
      execution_ready: false,
      next_action: connected
        ? "The provider API credential has been verified and stored. Its production task worker adapter is not installed yet, so this route is not execution-ready."
        : "Complete and verify this provider's official connection before it can be considered for automated execution.",
    };
  });

  const missing = routes.filter(route => route.route_status === "provider_not_registered").length;
  const needsConnection = routes.filter(route =>
    route.route_status === "account_connection_required" || route.route_status === "provider_account_required"
  ).length;
  const adapterPending = routes.filter(route => route.route_status === "account_marked_connected_adapter_missing").length;
  const routePlan = {
    version: 1,
    generated_at: new Date().toISOString(),
    project_name: project.name,
    production_mode: "routing_assessment_only",
    execution_ready: false,
    summary: {
      required_departments: routes.length,
      providers_not_registered: missing,
      connections_required: needsConnection,
      adapters_not_integrated: adapterPending,
    },
    routes,
    safety_note: "This is a provider-routing assessment only. No provider has been called, no external account has been accessed, and no media has been generated. A connected registry label is not proof that an execution adapter works.",
  };

  const { data: jobs, error: jobLookupError } = await supabase.from("production_jobs")
    .select("id").eq("project_id", projectId).eq("owner_id", ownerId)
    .eq("job_type", "idea_to_video").order("created_at", { ascending: false }).limit(1);
  if (jobLookupError) return reply({ error: "Could not locate the production job: " + jobLookupError.message }, 500);
  const jobId = jobs?.[0]?.id;
  if (!jobId) return reply({ error: "This project has no idea-to-video production job to attach routing to." }, 409);

  const { data: steps, error: stepsLookupError } = await supabase.from("production_steps")
    .select("id,stage,step_order").eq("job_id", jobId).eq("owner_id", ownerId).order("step_order", { ascending: true });
  if (stepsLookupError) return reply({ error: "Could not read production stages: " + stepsLookupError.message }, 500);

  const currentSteps = steps ?? [];
  const audioStep = currentSteps.find(step => step.stage === "audio");
  const generationStep = currentSteps.find(step => step.stage === "generation");
  const assemblyStep = currentSteps.find(step => step.stage === "assembly");
  let directorStep = currentSteps.find(step => step.stage === "production_director");
  const directorOrder = (audioStep?.step_order ?? 6) + 1;

  if (!directorStep) {
    // production_steps has UNIQUE(job_id, step_order). Move later stages out of the way
    // before inserting the new stage, then compact them into their final positions.
    const maxOrder = currentSteps.reduce((max, step) => Math.max(max, step.step_order), 0);
    if (generationStep) {
      const { error } = await supabase.from("production_steps").update({
        step_order: maxOrder + 1, status: "pending", updated_at: new Date().toISOString(),
      }).eq("id", generationStep.id).eq("owner_id", ownerId);
      if (error) return reply({ error: "Could not prepare the generation stage for routing: " + error.message }, 500);
    }
    if (assemblyStep) {
      const { error } = await supabase.from("production_steps").update({
        step_order: maxOrder + 2, status: "pending", updated_at: new Date().toISOString(),
      }).eq("id", assemblyStep.id).eq("owner_id", ownerId);
      if (error) return reply({ error: "Could not prepare the assembly stage for routing: " + error.message }, 500);
    }

    const { data: inserted, error: insertError } = await supabase.from("production_steps").insert({
      owner_id: ownerId, job_id: jobId, project_id: projectId,
      step_order: directorOrder, stage: "production_director", title: "Production Director · Provider routing",
      status: "waiting_for_approval", input_payload: { required_departments: requirements.map(item => item.category) },
      output_payload: routePlan,
    }).select("id").single();
    if (insertError || !inserted) return reply({ error: "The routing assessment was built but its workflow stage could not be saved: " + (insertError?.message ?? "Unknown database error.") }, 500);
    directorStep = { id: inserted.id, stage: "production_director", step_order: directorOrder };

    if (generationStep) {
      const { error } = await supabase.from("production_steps").update({
        step_order: directorOrder + 1, updated_at: new Date().toISOString(),
      }).eq("id", generationStep.id).eq("owner_id", ownerId);
      if (error) return reply({ error: "The routing stage was inserted, but generation ordering could not be finalised: " + error.message }, 500);
    }
    if (assemblyStep) {
      const { error } = await supabase.from("production_steps").update({
        step_order: directorOrder + 2, updated_at: new Date().toISOString(),
      }).eq("id", assemblyStep.id).eq("owner_id", ownerId);
      if (error) return reply({ error: "The routing stage was inserted, but assembly ordering could not be finalised: " + error.message }, 500);
    }
  } else {
    const { error: updateError } = await supabase.from("production_steps").update({
      title: "Production Director · Provider routing",
      status: "waiting_for_approval", output_payload: routePlan, error_message: null, updated_at: new Date().toISOString(),
    }).eq("id", directorStep.id).eq("owner_id", ownerId);
    if (updateError) return reply({ error: "Could not save the provider routing assessment: " + updateError.message }, 500);
    if (generationStep) {
      const { error } = await supabase.from("production_steps").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", generationStep.id).eq("owner_id", ownerId);
      if (error) return reply({ error: "Could not reset the generation stage: " + error.message }, 500);
    }
    if (assemblyStep) {
      const { error } = await supabase.from("production_steps").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", assemblyStep.id).eq("owner_id", ownerId);
      if (error) return reply({ error: "Could not reset the assembly stage: " + error.message }, 500);
    }
  }

  const nextMetadata = { ...metadata, production_route: routePlan, production_route_approved: false, generation_manifest: null, generation_manifest_status: null, creative_stage: "provider_routing_ready" };
  const { error: metadataError } = await supabase.from("projects").update({
    metadata: nextMetadata, updated_at: new Date().toISOString(),
  }).eq("id", projectId).eq("owner_id", ownerId);
  if (metadataError) return reply({ error: "The routing assessment was created but could not be attached to the project: " + metadataError.message }, 500);

  const { error: jobUpdateError } = await supabase.from("production_jobs").update({
    status: "waiting_for_approval",
    output_payload: { production_route: routePlan, next_stage: "production_director" },
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("owner_id", ownerId);
  if (jobUpdateError) return reply({ error: "The routing assessment is saved, but the production job could not be updated: " + jobUpdateError.message }, 500);

  return reply({ ok: true, route_plan: routePlan });
});
