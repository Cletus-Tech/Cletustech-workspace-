"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Bible = { characters: string; locations: string; visual_style: string; audio_style: string; rules: string };
type Project = {
  id: string; owner_id: string; name: string; production_type: string; description: string | null;
  status: string; aspect_ratio: string; target_duration_seconds: number | null; updated_at: string;
  metadata: Record<string, unknown> | null;
};
type Scene = {
  id: string; scene_number: number; title: string; description: string | null; dialogue: string | null;
  visual_prompt: string | null; camera_direction: string | null; audio_direction: string | null;
  continuity_notes: string | null; status: string; target_duration_seconds: number | null;
};
type Asset = { id: string; asset_type: string; storage_bucket: string; storage_path: string; file_name: string; mime_type: string | null; file_size_bytes: number | null; created_at: string };
type Job = { id: string; title: string; job_type: string; status: string; created_at: string };
type Step = { id: string; job_id: string; step_order: number; stage: string; title: string; status: string; attempts: number };
type CreativeConcept = { id: string; title: string; logline: string; synopsis: string; creative_approach: string; emotional_hook: string; visual_identity: string; audience_appeal: string; strengths: string[]; production_complexity: string; estimated_duration: string };
type StoryboardShot = { shot_number: number; shot_type: string; framing: string; camera_movement: string; visual_description: string; image_prompt: string; duration_seconds: number };
type StoryboardScene = { scene_number: number; title: string; story_purpose: string; location: string; time_of_day: string; description: string; characters: string[]; dialogue: string; visual_prompt: string; camera_direction: string; audio_direction: string; continuity_notes: string; duration_seconds: number; shots: StoryboardShot[] };

const emptyBible: Bible = { characters: "", locations: "", visual_style: "", audio_style: "", rules: "" };
const pipeline = [
  { stage: "planning", title: "Creative direction", detail: "Confirm brief, audience, tone and production goal." },
  { stage: "script", title: "Script & storyboard", detail: "Develop story beats, dialogue and shot structure." },
  { stage: "visuals", title: "Visual development", detail: "Prepare character, location and visual references." },
  { stage: "audio", title: "Voice & sound", detail: "Plan narration, dialogue, music and sound effects." },
  { stage: "post", title: "Edit & delivery", detail: "Assemble, review, caption and export the final work." }
];
const stageDetails: Record<string, string> = {
  analysis: "Understand the idea, audience and creative objective.",
  concepts: "Develop alternative creative directions for approval.",
  script: "Write the complete script for the selected concept.",
  refinement: "Improve storytelling, dialogue, pacing and emotional impact.",
  storyboard: "Turn the approved screenplay into scene-by-scene shots for review.",
  continuity: "Lock character, wardrobe, location, prop, lighting and camera consistency.",
  audio: "Prepare voiceover, dialogue, music and sound requirements.",
  production_director: "Assess registered providers and prepare a truthful routing plan.",
  generation: "Create approved visual and audio assets with connected providers.",
  assembly: "Edit, synchronise, review and export the final production."
};

export default function ProjectWorkspacePage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("");
  const [bible, setBible] = useState<Bible>(emptyBible);
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [sceneDialogue, setSceneDialogue] = useState("");
  const [cameraDirection, setCameraDirection] = useState("");
  const [audioDirection, setAudioDirection] = useState("");
  const [continuityNotes, setContinuityNotes] = useState("");
  const [sceneDuration, setSceneDuration] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [conceptBusy, setConceptBusy] = useState(false);
  const [projectAnalysis, setProjectAnalysis] = useState<Record<string, unknown> | null>(null);
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [scriptDraft, setScriptDraft] = useState<Record<string, unknown> | null>(null);
  const [refinedScript, setRefinedScript] = useState<Record<string, unknown> | null>(null);
  const [scriptApproved, setScriptApproved] = useState(false);
  const [storyboard, setStoryboard] = useState<Record<string, unknown> | null>(null);
  const [storyboardApproved, setStoryboardApproved] = useState(false);
  const [continuityBible, setContinuityBible] = useState<Record<string, unknown> | null>(null);
  const [continuityApproved, setContinuityApproved] = useState(false);
  const [audioPlan, setAudioPlan] = useState<Record<string, unknown> | null>(null);
  const [audioApproved, setAudioApproved] = useState(false);
  const [productionRoute, setProductionRoute] = useState<Record<string, unknown> | null>(null);
  const [routeApproved, setRouteApproved] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [generationManifest, setGenerationManifest] = useState<Record<string, unknown> | null>(null);
  const [runnerBusy, setRunnerBusy] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { router.replace("/login"); return; }
    setUser(currentUser);
    const [projectResult, sceneResult, assetResult, jobResult] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("scenes").select("*").eq("project_id", projectId).order("scene_number", { ascending: true }),
      supabase.from("assets").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("production_jobs").select("id,title,job_type,status,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(5)
    ]);
    if (projectResult.error) setError(projectResult.error.message);
    else {
      const p = projectResult.data as Project;
      setProject(p);
      const savedMetadata = p.metadata ?? {};
      setProjectAnalysis(savedMetadata.project_analysis && typeof savedMetadata.project_analysis === "object" ? savedMetadata.project_analysis as Record<string, unknown> : null);
      setConcepts(Array.isArray(savedMetadata.concept_options) ? savedMetadata.concept_options as CreativeConcept[] : []);
      setScriptDraft(savedMetadata.script_draft && typeof savedMetadata.script_draft === "object" ? savedMetadata.script_draft as Record<string, unknown> : null);
      setRefinedScript(savedMetadata.refined_script && typeof savedMetadata.refined_script === "object" ? savedMetadata.refined_script as Record<string, unknown> : null);
      setScriptApproved(Boolean(savedMetadata.approved_script));
      setStoryboard(savedMetadata.storyboard && typeof savedMetadata.storyboard === "object" ? savedMetadata.storyboard as Record<string, unknown> : null);
      setStoryboardApproved(Boolean(savedMetadata.storyboard_approved));
      setContinuityBible(savedMetadata.continuity_bible && typeof savedMetadata.continuity_bible === "object" ? savedMetadata.continuity_bible as Record<string, unknown> : null);
      setContinuityApproved(Boolean(savedMetadata.continuity_approved));
      setAudioPlan(savedMetadata.audio_plan && typeof savedMetadata.audio_plan === "object" ? savedMetadata.audio_plan as Record<string, unknown> : null);
      setAudioApproved(Boolean(savedMetadata.audio_approved));
      setProductionRoute(savedMetadata.production_route && typeof savedMetadata.production_route === "object" ? savedMetadata.production_route as Record<string, unknown> : null);
      setRouteApproved(Boolean(savedMetadata.production_route_approved));
      setGenerationManifest(savedMetadata.generation_manifest && typeof savedMetadata.generation_manifest === "object" ? savedMetadata.generation_manifest as Record<string, unknown> : null);
      const savedSelection = savedMetadata.selected_concept && typeof savedMetadata.selected_concept === "object" ? savedMetadata.selected_concept as { id?: string } : null;
      setSelectedConceptId(savedSelection?.id ?? "");
      setDescription(p.description ?? "");
      setAspectRatio(p.aspect_ratio ?? "16:9");
      setDuration(p.target_duration_seconds?.toString() ?? "");
      const savedBible = p.metadata && typeof p.metadata.production_bible === "object" && p.metadata.production_bible !== null ? p.metadata.production_bible as Partial<Bible> : {};
      setBible({ ...emptyBible, ...savedBible });
    }
    if (sceneResult.error) setError(sceneResult.error.message);
    else setScenes((sceneResult.data ?? []) as Scene[]);
    if (assetResult.error) setError(assetResult.error.message);
    else setAssets((assetResult.data ?? []) as Asset[]);
    if (jobResult.error) setError(jobResult.error.message);
    else {
      const loadedJobs = (jobResult.data ?? []) as Job[];
      setJobs(loadedJobs);
      if (loadedJobs.length) {
        const stepResult = await supabase.from("production_steps").select("*").in("job_id", loadedJobs.map(job => job.id)).order("step_order", { ascending: true });
        if (stepResult.error) setError(stepResult.error.message);
        else setSteps((stepResult.data ?? []) as Step[]);
      } else setSteps([]);
    }
    setLoading(false);
  }, [projectId, router, supabase]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) { setError("This project link is missing its project ID."); setLoading(false); return; }
      setProjectId(id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load, projectId]);

  const activeJob = jobs.find(job => job.job_type === "idea_to_video") ?? jobs[0] ?? null;
  const activeSteps = useMemo(() => activeJob ? steps.filter(step => step.job_id === activeJob.id) : [], [activeJob, steps]);

  async function runCreativeStage(action: "analyze" | "concepts" | "script" | "refine" | "storyboard" | "continuity" | "audio") {
    if (!project) return;
    if (action === "concepts" && !projectAnalysis) { setError("Complete project analysis before developing concepts."); return; }
    if (action === "script" && !selectedConceptId) { setError("Choose a concept before writing the screenplay."); return; }
    if (action === "refine" && !scriptDraft) { setError("Create a script draft before refining it."); return; }
    if (action === "storyboard" && !scriptApproved) { setError("Approve the screenplay before creating its storyboard."); return; }
    if (action === "continuity" && (!scriptApproved || !storyboardApproved)) { setError("Approve the storyboard before building continuity references."); return; }
    if (action === "audio" && (!scriptApproved || !storyboardApproved || !continuityApproved)) { setError("Approve the screenplay, storyboard and continuity bible before preparing audio."); return; }
    if (action === "analyze") setAnalysisBusy(true); else if (action === "concepts") setConceptBusy(true); else setSaving(true);
    setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("creative-director", { body: { project_id: project.id, action } });
    if (action === "analyze") setAnalysisBusy(false); else if (action === "concepts") setConceptBusy(false); else setSaving(false);
    if (invokeError) {
      let message = invokeError.message;
      const context = (invokeError as unknown as { context?: unknown }).context;
      if (context instanceof Response) {
        try {
          const detail = await context.clone().json();
          if (typeof detail.error === "string") message = detail.error;
        } catch { /* Keep the SDK error when no JSON response is available. */ }
      }
      setError(message);
      return;
    }
    if (data?.error) { setError(String(data.error)); return; }
    setNotice(({
      analyze: "Project analysis is complete. Review the direction, then develop alternative concepts.",
      concepts: "Three creative concepts are ready for your review.",
      script: "Your first screenplay draft is ready for review.",
      refine: "The script editor has completed its refinement. Review the revised screenplay.",
      storyboard: "The storyboard is ready. Review the scenes and shot directions before approving it.",
      continuity: "The continuity bible is ready. Review the identity and visual rules before approving it.",
      audio: "The Audio Director has prepared the narration, dialogue, music and sound cue plan. Review it before approval."
    } as Record<string, string>)[action]);
    await load();
  }

  async function chooseConcept(concept: CreativeConcept) {
    if (!project || !user) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), selected_concept: concept, creative_stage: "concept_selected" };
    const { error: updateError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", user.id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setSelectedConceptId(concept.id);
    const workflowJob = jobs.find(job => job.job_type === "idea_to_video");
    if (workflowJob) {
      const { error: conceptStepError } = await supabase.from("production_steps")
        .update({ status: "succeeded", output_payload: { selected_concept: concept }, updated_at: new Date().toISOString() })
        .eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "concepts");
      const { error: scriptStepError } = await supabase.from("production_steps")
        .update({ status: "ready", input_payload: { selected_concept_id: concept.id, instruction: "Write the complete screenplay for the approved concept." }, updated_at: new Date().toISOString() })
        .eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "script");
      const { error: jobUpdateError } = await supabase.from("production_jobs")
        .update({ status: "queued", output_payload: { selected_concept: concept }, updated_at: new Date().toISOString() })
        .eq("id", workflowJob.id).eq("owner_id", user.id);
      if (conceptStepError || scriptStepError || jobUpdateError) {
        setError("Your concept was saved, but the production hand-off needs attention: " + (conceptStepError?.message || scriptStepError?.message || jobUpdateError?.message));
        await load();
        return;
      }
    }
    setNotice("Concept selected and saved. The script-writing stage is now ready for development.");
    await load();
  }

  async function approveScreenplay() {
    if (!project || !user) return;
    const approved = refinedScript ?? scriptDraft;
    if (!approved) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), approved_script: approved, creative_stage: "screenplay_approved" };
    const { error: saveError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", user.id);
    if (saveError) { setSaving(false); setError(saveError.message); return; }
    const workflowJob = jobs.find(job => job.job_type === "idea_to_video");
    if (workflowJob) {
      const { error: scriptCompleteError } = await supabase.from("production_steps").update({ status: "succeeded", output_payload: scriptDraft, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "script");
      let refinementCompleteError: { message: string } | null = null;
      if (refinedScript) {
        const { error } = await supabase.from("production_steps").update({ status: "succeeded", output_payload: refinedScript, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "refinement");
        refinementCompleteError = error;
      }
      const { error: nextError } = await supabase.from("production_steps").update({ status: "ready", input_payload: { instruction: "Create the storyboard and lock scene-by-scene continuity from the approved screenplay." }, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "storyboard");
      const { error: jobError } = await supabase.from("production_jobs").update({ status: "queued", output_payload: { approved_script: approved, next_stage: "storyboard" }, updated_at: new Date().toISOString() }).eq("id", workflowJob.id).eq("owner_id", user.id);
      if (scriptCompleteError || refinementCompleteError || nextError || jobError) {
        setSaving(false);
        setError("The screenplay was saved, but the storyboard hand-off needs attention: " + (scriptCompleteError?.message || refinementCompleteError?.message || nextError?.message || jobError?.message));
        await load();
        return;
      }
    }
    setSaving(false); setScriptApproved(true);
    setNotice("Screenplay approved. The storyboard stage is now ready.");
    await load();
  }

  async function approveStoryboard() {
    if (!project || !user || !storyboard) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), storyboard_approved: true, creative_stage: "storyboard_approved" };
    const { error: saveError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", user.id);
    if (saveError) { setSaving(false); setError(saveError.message); return; }
    const workflowJob = jobs.find(job => job.job_type === "idea_to_video");
    if (workflowJob) {
      const { error: storyboardError } = await supabase.from("production_steps").update({ status: "succeeded", output_payload: storyboard, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "storyboard");
      const { data: continuityStep, error: lookupError } = await supabase.from("production_steps").select("id").eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "continuity").maybeSingle();
      let continuityStepError: { message: string } | null = lookupError;
      if (!lookupError && continuityStep) {
        const { error } = await supabase.from("production_steps").update({ status: "ready", input_payload: { instruction: "Build the character, location, wardrobe, prop, lighting and camera continuity bible." }, updated_at: new Date().toISOString() }).eq("id", continuityStep.id).eq("owner_id", user.id);
        continuityStepError = error;
      } else if (!lookupError) {
        await supabase.from("production_steps").update({ step_order: 7 }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "audio");
        await supabase.from("production_steps").update({ step_order: 8 }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "generation");
        await supabase.from("production_steps").update({ step_order: 9 }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "assembly");
        const { error } = await supabase.from("production_steps").insert({
          owner_id: user.id, job_id: workflowJob.id, project_id: project.id, step_order: 6,
          stage: "continuity", title: "Continuity bible", status: "ready",
          input_payload: { instruction: "Build the character, location, wardrobe, prop, lighting and camera continuity bible." }
        });
        continuityStepError = error;
      }
      const { error: jobError } = await supabase.from("production_jobs").update({ status: "queued", output_payload: { approved_storyboard: storyboard, next_stage: "continuity" }, updated_at: new Date().toISOString() }).eq("id", workflowJob.id).eq("owner_id", user.id);
      if (storyboardError || continuityStepError || jobError) {
        setSaving(false);
        setError("The storyboard was saved, but the continuity hand-off needs attention: " + (storyboardError?.message || continuityStepError?.message || jobError?.message));
        await load();
        return;
      }
    }
    setSaving(false); setStoryboardApproved(true);
    setNotice("Storyboard approved. The Continuity Director is now ready.");
    await load();
  }

  async function approveContinuity() {
    if (!project || !user || !continuityBible) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), continuity_approved: true, creative_stage: "continuity_approved" };
    const { error: saveError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", user.id);
    if (saveError) { setSaving(false); setError(saveError.message); return; }
    const workflowJob = jobs.find(job => job.job_type === "idea_to_video");
    if (workflowJob) {
      const { error: continuityError } = await supabase.from("production_steps").update({ status: "succeeded", output_payload: continuityBible, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "continuity");
      const { error: audioError } = await supabase.from("production_steps").update({ status: "ready", input_payload: { instruction: "Prepare voiceover, character dialogue, music and sound cue requirements using the approved continuity bible." }, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "audio");
      const { error: jobError } = await supabase.from("production_jobs").update({ status: "queued", output_payload: { approved_continuity_bible: continuityBible, next_stage: "audio" }, updated_at: new Date().toISOString() }).eq("id", workflowJob.id).eq("owner_id", user.id);
      if (continuityError || audioError || jobError) {
        setSaving(false);
        setError("The continuity bible was saved, but the audio hand-off needs attention: " + (continuityError?.message || audioError?.message || jobError?.message));
        await load();
        return;
      }
    }
    setSaving(false); setContinuityApproved(true);
    setNotice("Continuity bible approved. The audio planning stage is now ready.");
    await load();
  }

  async function approveAudioPlan() {
    if (!project || !user || !audioPlan) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), audio_approved: true, creative_stage: "audio_approved" };
    const { error: saveError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", user.id);
    if (saveError) { setSaving(false); setError(saveError.message); return; }
    const workflowJob = jobs.find(job => job.job_type === "idea_to_video");
    if (workflowJob) {
      const { error: audioError } = await supabase.from("production_steps").update({ status: "succeeded", output_payload: audioPlan, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "audio");
      const { error: generationError } = await supabase.from("production_steps").update({ status: "ready", input_payload: { instruction: "Route the approved storyboard scenes and audio plan to configured image, video, voice and music providers." }, updated_at: new Date().toISOString() }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "generation");
      const { error: jobError } = await supabase.from("production_jobs").update({ status: "queued", output_payload: { approved_audio_plan: audioPlan, next_stage: "generation" }, updated_at: new Date().toISOString() }).eq("id", workflowJob.id).eq("owner_id", user.id);
      if (audioError || generationError || jobError) {
        setSaving(false);
        setError("The audio plan was saved, but the visual generation hand-off needs attention: " + (audioError?.message || generationError?.message || jobError?.message));
        await load();
        return;
      }
    }
    setSaving(false); setAudioApproved(true);
    setNotice("Audio plan approved. Production provider routing is now the next stage.");
    await load();
  }

  async function runProductionDirector() {
    if (!project || !audioApproved) return;
    setRouteBusy(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("production-director", { body: { project_id: project.id, action: "plan" } });
    setRouteBusy(false);
    if (invokeError) {
      let message = invokeError.message;
      const context = (invokeError as unknown as { context?: unknown }).context;
      if (context instanceof Response) {
        try { const detail = await context.clone().json(); if (typeof detail.error === "string") message = detail.error; }
        catch { /* Preserve the SDK error if no structured response is available. */ }
      }
      setError(message); return;
    }
    if (data?.error) { setError(String(data.error)); return; }
    if (!data?.route_plan || typeof data.route_plan !== "object") { setError("The Production Director returned no routing assessment."); return; }
    setProductionRoute(data.route_plan as Record<string, unknown>);
    setRouteApproved(false);
    setNotice("Provider routing assessment is ready. Review every department and its connection status.");
    await load();
  }

  async function prepareGenerationManifest() {
    if (!project || !routeApproved) return;
    setRunnerBusy(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("production-runner", { body: { project_id: project.id, action: "prepare" } });
    setRunnerBusy(false);
    if (invokeError) {
      let message = invokeError.message;
      const context = (invokeError as unknown as { context?: unknown }).context;
      if (context instanceof Response) {
        try { const detail = await context.clone().json(); if (typeof detail.error === "string") message = detail.error; }
        catch { /* Keep the SDK error when no structured response is available. */ }
      }
      setError(message); return;
    }
    if (data?.error) { setError(String(data.error)); return; }
    if (!data?.manifest || typeof data.manifest !== "object") { setError("The Generation Planner returned no execution manifest."); return; }
    setGenerationManifest(data.manifest as Record<string, unknown>);
    const summary = data.manifest.summary && typeof data.manifest.summary === "object" ? data.manifest.summary as Record<string, unknown> : {};
    setNotice("Generation manifest prepared: " + String(summary.scenes ?? 0) + " scenes and " + String(summary.planned_tasks ?? 0) + " planned tasks. Execution remains paused until provider adapters and a worker are ready.");
    await load();
  }

  async function approveProductionRoute() {
    if (!project || !user || !productionRoute) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), production_route_approved: true, creative_stage: "provider_routing_approved" };
    const { error: metadataError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", user.id);
    if (metadataError) { setSaving(false); setError(metadataError.message); return; }
    const workflowJob = jobs.find(job => job.job_type === "idea_to_video");
    if (workflowJob) {
      const { error: routeError } = await supabase.from("production_steps").update({
        status: "succeeded", output_payload: productionRoute, updated_at: new Date().toISOString()
      }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "production_director");
      const { error: generationError } = await supabase.from("production_steps").update({
        status: "pending", input_payload: { instruction: "Generation is blocked until compatible provider execution adapters are installed and verified.", routing_approved: true }, updated_at: new Date().toISOString()
      }).eq("job_id", workflowJob.id).eq("owner_id", user.id).eq("stage", "generation");
      const { error: jobError } = await supabase.from("production_jobs").update({
        status: "waiting_for_approval",
        output_payload: { approved_production_route: productionRoute, next_stage: "provider_adapter_setup", execution_ready: false },
        updated_at: new Date().toISOString()
      }).eq("id", workflowJob.id).eq("owner_id", user.id);
      if (routeError || generationError || jobError) {
        setSaving(false);
        setError("The routing approval was saved, but the production hand-off needs attention: " + (routeError?.message || generationError?.message || jobError?.message));
        await load(); return;
      }
    }
    setSaving(false); setRouteApproved(true);
    setNotice("Provider routing assessment approved. Media generation remains paused until compatible provider adapters are installed and tested.");
    await load();
  }

  async function saveBrief(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setSaving(true); setError(""); setNotice("");
    const parsedDuration = duration.trim() ? Number(duration) : null;
    if (parsedDuration !== null && (!Number.isFinite(parsedDuration) || parsedDuration <= 0 || parsedDuration > 7200)) {
      setError("Enter a valid target duration between 1 and 7,200 seconds."); setSaving(false); return;
    }
    const { error: updateError } = await supabase.from("projects").update({
      description: description.trim() || null, aspect_ratio: aspectRatio,
      target_duration_seconds: parsedDuration, updated_at: new Date().toISOString()
    }).eq("id", project.id).eq("owner_id", project.owner_id);
    setSaving(false);
    if (updateError) setError(updateError.message);
    else { setNotice("Production brief saved."); await load(); }
  }

  async function saveBible(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setSaving(true); setError(""); setNotice("");
    const metadata = { ...(project.metadata ?? {}), production_bible: bible };
    const { error: updateError } = await supabase.from("projects").update({ metadata, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", project.owner_id);
    setSaving(false);
    if (updateError) setError(updateError.message);
    else { setNotice("Production bible saved. These references are now part of this project's persistent context."); await load(); }
  }

  function openNewScene() {
    setEditingScene(null); setSceneTitle(""); setSceneDescription(""); setScenePrompt(""); setSceneDialogue("");
    setCameraDirection(""); setAudioDirection(""); setContinuityNotes(""); setSceneDuration(""); setError(""); setShowSceneForm(true);
  }

  function openEditScene(scene: Scene) {
    setEditingScene(scene); setSceneTitle(scene.title); setSceneDescription(scene.description ?? "");
    setScenePrompt(scene.visual_prompt ?? ""); setSceneDialogue(scene.dialogue ?? "");
    setCameraDirection(scene.camera_direction ?? ""); setAudioDirection(scene.audio_direction ?? "");
    setContinuityNotes(scene.continuity_notes ?? ""); setSceneDuration(scene.target_duration_seconds?.toString() ?? "");
    setError(""); setShowSceneForm(true);
  }

  async function saveScene(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !user) return;
    const parsedDuration = sceneDuration.trim() ? Number(sceneDuration) : null;
    if (parsedDuration !== null && (!Number.isFinite(parsedDuration) || parsedDuration <= 0 || parsedDuration > 3600)) {
      setError("Scene duration must be between 1 and 3,600 seconds."); return;
    }
    setSaving(true); setError(""); setNotice("");
    const payload = {
      title: sceneTitle.trim(), description: sceneDescription.trim() || null,
      visual_prompt: scenePrompt.trim() || null, dialogue: sceneDialogue.trim() || null,
      camera_direction: cameraDirection.trim() || null, audio_direction: audioDirection.trim() || null,
      continuity_notes: continuityNotes.trim() || null, target_duration_seconds: parsedDuration,
      updated_at: new Date().toISOString()
    };
    const result = editingScene
      ? await supabase.from("scenes").update(payload).eq("id", editingScene.id).eq("owner_id", user.id)
      : await supabase.from("scenes").insert({ ...payload, owner_id: user.id, project_id: project.id, scene_number: scenes.reduce((max, scene) => Math.max(max, scene.scene_number), 0) + 1 });
    setSaving(false);
    if (result.error) setError(result.error.message);
    else { setShowSceneForm(false); setNotice(editingScene ? "Scene changes saved." : "Scene added to your production plan."); await load(); }
  }

  async function deleteScene(scene: Scene) {
    if (!user || !window.confirm("Delete scene " + scene.scene_number + " — " + scene.title + "? This cannot be undone.")) return;
    const { error: deleteError } = await supabase.from("scenes").delete().eq("id", scene.id).eq("owner_id", user.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Scene deleted."); await load(); }
  }

  async function uploadAsset(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !project || !user) return;
    if (file.size > 50 * 1024 * 1024) { setError("Files must be 50 MB or smaller."); event.target.value = ""; return; }
    setUploading(true); setError(""); setNotice("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = user.id + "/" + project.id + "/" + crypto.randomUUID() + "-" + safeName;
    const { error: uploadError } = await supabase.storage.from("workspace-assets").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) { setUploading(false); setError("Upload failed: " + uploadError.message); event.target.value = ""; return; }
    const assetType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type === "application/pdf" ? "reference" : "other";
    const { error: recordError } = await supabase.from("assets").insert({
      owner_id: user.id, project_id: project.id, asset_type: assetType, storage_bucket: "workspace-assets",
      storage_path: path, file_name: file.name, mime_type: file.type || null, file_size_bytes: file.size
    });
    if (recordError) {
      await supabase.storage.from("workspace-assets").remove([path]);
      setError("The file uploaded, but its asset record could not be saved: " + recordError.message);
    } else { setNotice("Asset uploaded to this project's private library."); await load(); }
    setUploading(false); event.target.value = "";
  }

  async function openAsset(asset: Asset) {
    const { data, error: signedError } = await supabase.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_path, 60);
    if (signedError || !data?.signedUrl) { setError(signedError?.message ?? "Could not open this asset."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeAsset(asset: Asset) {
    if (!user || !window.confirm("Remove " + asset.file_name + " from this project?")) return;
    const { error: storageError } = await supabase.storage.from(asset.storage_bucket).remove([asset.storage_path]);
    if (storageError) { setError(storageError.message); return; }
    const { error: recordError } = await supabase.from("assets").delete().eq("id", asset.id).eq("owner_id", user.id);
    if (recordError) setError(recordError.message);
    else { setNotice("Asset removed."); await load(); }
  }

  async function createProductionPlan() {
    if (!project || !user) return;
    setSaving(true); setError(""); setNotice("");
    const { data: job, error: jobError } = await supabase.from("production_jobs").insert({
      owner_id: user.id, project_id: project.id, title: "Production plan — " + project.name,
      job_type: "production_plan", status: "queued",
      input_payload: { source: "workspace", stages: pipeline.map(item => item.stage), note: "Planning checklist only. Provider generation is not connected to this job yet." }
    }).select("id").single();
    if (jobError || !job) { setSaving(false); setError(jobError?.message ?? "Could not create production plan."); return; }
    const { error: stepsError } = await supabase.from("production_steps").insert(pipeline.map((item, index) => ({
      owner_id: user.id, job_id: job.id, project_id: project.id, step_order: index + 1,
      stage: item.stage, title: item.title, status: index === 0 ? "ready" : "pending",
      input_payload: { guidance: item.detail }
    })));
    if (stepsError) {
      await supabase.from("production_jobs").delete().eq("id", job.id).eq("owner_id", user.id);
      setSaving(false); setError("The production plan could not be completed: " + stepsError.message); return;
    }
    setSaving(false); setNotice("A five-stage production checklist has been created. AI generation will become available when provider execution is integrated."); await load();
  }

  async function updateStep(step: Step, nextStatus: string) {
    if (!user) return;
    const { error: updateError } = await supabase.from("production_steps").update({
      status: nextStatus, attempts: nextStatus === "running" ? step.attempts + 1 : step.attempts, updated_at: new Date().toISOString()
    }).eq("id", step.id).eq("owner_id", user.id);
    if (updateError) setError(updateError.message);
    else { setNotice("Production stage updated."); await load(); }
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); }

  if (loading) return <main className="creative-boot"><div className="creative-boot-orb">CT</div><strong>CLETUS TECH WORKSPACE</strong><span>Opening your production studio</span><div className="creative-boot-track"><i /></div></main>;
  if (!project) return <main className="auth-screen"><section className="auth-card"><p className="eyebrow">PROJECT NOT AVAILABLE</p><h1>We could not open this project.</h1><p className="auth-subtitle">{error || "It may have been removed or you may not have access."}</p><Link className="primary-button" href="/">Return to workspace</Link></section></main>;

  return <main className="app-frame creative-frame">
    <aside className="sidebar creative-sidebar">
      <Link className="brand creative-brand" href="/"><span className="brand-mark">CT</span><span className="brand-copy"><strong>CLETUS TECH</strong><small>CREATIVE WORKSPACE</small></span></Link>
      <div className="workspace-switch creative-switch"><span className="workspace-avatar">C</span><span><strong>Personal workspace</strong><small>Free-first plan</small></span></div>
      <nav className="side-nav" aria-label="Main navigation">
        <div className="nav-group"><p className="nav-heading">YOUR SPACE</p><Link className="nav-link" href="/"><span className="nav-icon">⌂</span>Overview</Link><Link className="nav-link active" href="/#projects"><span className="nav-icon">▦</span>My projects</Link></div>
        <div className="nav-group"><p className="nav-heading">AI WORKSPACE</p><Link className="nav-link" href="/tools"><span className="nav-icon">✳</span>AI tool manager</Link></div>
      </nav>
      <div className="sidebar-bottom"><div className="plan-card creative-plan"><span className="plan-dot" /><div><strong>Free-first workspace</strong><small>Production workspace</small></div></div><button className="nav-link signout-link" onClick={signOut}><span className="nav-icon">↗</span>Sign out</button><div className="profile-row creative-profile"><div className="profile-avatar">CT</div><div><strong>{user?.user_metadata?.display_name || "Workspace owner"}</strong><small>{user?.email}</small></div></div></div>
    </aside>
    <section className="main-area creative-main">
      <header className="topbar creative-topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><b>/</b><strong>{project.name}</strong></div><div className="top-actions"><span className="system-status"><i /> Private project</span><div className="top-avatar">CT</div></div></header>
      <div className="content creative-content project-studio-content">
        <Link href="/" className="back-link">← Back to all projects</Link>
        <div className="project-studio-hero"><div><span className="section-kicker">YOUR PRODUCTION STUDIO</span><h1>{project.name}</h1><p>Shape the story, preserve creative continuity and organise every asset before production.</p></div><div className="project-hero-meta"><span>{project.production_type.replaceAll("_", " ")}</span><span>{scenes.length} scenes</span></div></div>
        {notice && <div className="notice creative-notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        <section className="creative-director-panel">
          <div className="creative-director-heading">
            <div><span className="section-kicker">AI CREATIVE DEPARTMENT</span><h2>Understand the idea before making the film.</h2><p>The analyzer interprets your brief first. The concept developer then creates distinct creative directions for you to choose from.</p></div>
            <div className="director-orbit"><span>CT</span><i /><b /></div>
          </div>
          <div className="director-actions">
            <div className="director-action-card"><span className="director-number">01</span><div><strong>Project Analyzer</strong><p>Purpose, audience, message, emotional journey and visual direction.</p><button className="primary-button" onClick={() => void runCreativeStage("analyze")} disabled={analysisBusy || conceptBusy}>{analysisBusy ? "Analyzing your idea…" : projectAnalysis ? "Re-analyze project" : "Analyze this idea →"}</button></div><span className="director-state">{projectAnalysis ? "Analysis ready" : "Awaiting analysis"}</span></div>
            <div className="director-action-card"><span className="director-number">02</span><div><strong>Concept Developer</strong><p>Three meaningfully different story concepts, prepared for your approval.</p><button className="secondary-button" onClick={() => void runCreativeStage("concepts")} disabled={!projectAnalysis || analysisBusy || conceptBusy}>{conceptBusy ? "Developing concepts…" : concepts.length ? "Generate new concepts" : "Develop concepts →"}</button></div><span className="director-state">{concepts.length ? concepts.length + " concepts ready" : "After analysis"}</span></div>
            <div className="director-action-card"><span className="director-number">03</span><div><strong>Screenwriter</strong><p>Write a complete screenplay from the concept you approved, including scenes and dialogue.</p><button className="secondary-button" onClick={() => void runCreativeStage("script")} disabled={!selectedConceptId || saving || analysisBusy || conceptBusy}>{saving ? "Writing screenplay…" : scriptDraft ? "Write a new draft" : "Write screenplay →"}</button></div><span className="director-state">{scriptDraft ? "Draft ready" : selectedConceptId ? "Ready to write" : "Choose concept first"}</span></div>
            <div className="director-action-card"><span className="director-number">04</span><div><strong>Script Editor</strong><p>Strengthen dialogue, emotional logic, pacing, scene transitions and the ending.</p><button className="secondary-button" onClick={() => void runCreativeStage("refine")} disabled={!scriptDraft || saving || analysisBusy || conceptBusy}>{saving ? "Refining script…" : refinedScript ? "Refine again" : "Refine screenplay →"}</button></div><span className="director-state">{refinedScript ? "Refined version ready" : scriptDraft ? "Draft available" : "After first draft"}</span></div>
            <div className="director-action-card"><span className="director-number">05</span><div><strong>Storyboard Director</strong><p>Turn the approved screenplay into scene cards, shot lists, camera movement and visual prompts.</p><button className="secondary-button" onClick={() => void runCreativeStage("storyboard")} disabled={!scriptApproved || saving}>{saving ? "Developing storyboard…" : storyboard ? "Regenerate storyboard" : "Create storyboard →"}</button></div><span className="director-state">{storyboardApproved ? "Storyboard approved" : storyboard ? "Review required" : scriptApproved ? "Ready to develop" : "After screenplay approval"}</span></div>
            <div className="director-action-card"><span className="director-number">06</span><div><strong>Continuity Director</strong><p>Build stable character, wardrobe, location, prop, lighting, colour and camera references.</p><button className="secondary-button" onClick={() => void runCreativeStage("continuity")} disabled={!storyboardApproved || saving}>{saving ? "Building continuity…" : continuityBible ? "Regenerate continuity bible" : "Build continuity bible →"}</button></div><span className="director-state">{continuityApproved ? "Continuity approved" : continuityBible ? "Review required" : storyboardApproved ? "Ready to develop" : "After storyboard approval"}</span></div>
            <div className="director-action-card"><span className="director-number">07</span><div><strong>Audio Director</strong><p>Decide on narration, map character dialogue, and prepare original music, ambience and sound-effect cues.</p><button className="secondary-button" onClick={() => void runCreativeStage("audio")} disabled={!continuityApproved || saving}>{saving ? "Preparing audio plan…" : audioPlan ? "Regenerate audio plan" : "Prepare audio plan →"}</button></div><span className="director-state">{audioApproved ? "Audio approved" : audioPlan ? "Review required" : continuityApproved ? "Ready to develop" : "After continuity approval"}</span></div>
            <div className="director-action-card"><span className="director-number">08</span><div><strong>Production Director</strong><p>Match every production department to registered providers, identify missing connections and prepare the execution hand-off.</p><button className="secondary-button" onClick={() => void runProductionDirector()} disabled={!audioApproved || routeBusy || saving}>{routeBusy ? "Assessing providers…" : productionRoute ? "Reassess provider routing" : "Build provider routing plan →"}</button></div><span className="director-state">{routeApproved ? "Routing approved" : productionRoute ? "Review routing" : audioApproved ? "Ready to assess" : "After audio approval"}</span></div>
            <div className="director-action-card"><span className="director-number">09</span><div><strong>Generation Planner</strong><p>Translate approved storyboard shots into an ordered, retry-aware execution manifest for the future generation worker.</p><button className="secondary-button" onClick={() => void prepareGenerationManifest()} disabled={!routeApproved || runnerBusy || saving}>{runnerBusy ? "Preparing manifest…" : generationManifest ? "Refresh generation manifest" : "Prepare scene execution manifest →"}</button></div><span className="director-state">{generationManifest ? String(generationManifest.manifest_status ?? "Manifest ready").replaceAll("_"," ") : routeApproved ? "Ready to prepare" : "After routing approval"}</span></div>
          </div>
          {projectAnalysis && <div className="analysis-result">
            <div className="analysis-result-top"><span>PROJECT ANALYSIS</span><span>AI CREATIVE BRIEF</span></div>
            <h3>{String(projectAnalysis.creative_thesis ?? "Creative direction")}</h3>
            <div className="analysis-insight-grid">
              <div><small>OBJECTIVE</small><p>{String(projectAnalysis.objective ?? "")}</p></div>
              <div><small>CORE MESSAGE</small><p>{String(projectAnalysis.core_message ?? "")}</p></div>
              <div><small>AUDIENCE INSIGHT</small><p>{String(projectAnalysis.audience_insight ?? "")}</p></div>
              <div><small>GENRE & TONE</small><p>{String(projectAnalysis.genre_and_tone ?? "")}</p></div>
              <div><small>STORYTELLING APPROACH</small><p>{String(projectAnalysis.storytelling_approach ?? "")}</p></div>
              <div><small>VISUAL DIRECTION</small><p>{String(projectAnalysis.visual_direction ?? "")}</p></div>
            </div>
            {Array.isArray(projectAnalysis.emotional_journey) && <div className="analysis-tags"><small>EMOTIONAL JOURNEY</small>{(projectAnalysis.emotional_journey as string[]).map((item,index)=><span key={index}>{item}</span>)}</div>}
          </div>}
          {concepts.length > 0 && <div className="concept-results"><div className="concept-results-heading"><div><span className="section-kicker">YOUR CREATIVE OPTIONS</span><h3>Choose the direction worth developing.</h3></div><span>{concepts.length} ALTERNATIVES</span></div><div className="concept-card-grid">{concepts.map((concept,index)=><article className={"concept-card " + (selectedConceptId===concept.id ? "concept-selected" : "")} key={concept.id}><div className="concept-card-top"><span>CONCEPT 0{index+1}</span>{selectedConceptId===concept.id && <b>SELECTED</b>}</div><h4>{concept.title}</h4><p className="concept-logline">{concept.logline}</p><p>{concept.synopsis}</p><div className="concept-detail"><small>CREATIVE APPROACH</small><p>{concept.creative_approach}</p></div><div className="concept-detail"><small>VISUAL IDENTITY</small><p>{concept.visual_identity}</p></div><div className="concept-card-meta"><span>{concept.production_complexity} complexity</span><span>{concept.estimated_duration}</span></div><button className={selectedConceptId===concept.id ? "secondary-button" : "primary-button"} onClick={() => void chooseConcept(concept)} disabled={saving}>{selectedConceptId===concept.id ? "Selected ✓" : "Choose this concept →"}</button></article>)}</div></div>}
          {(scriptDraft || refinedScript) && <div className="script-result">
            <div className="script-result-heading"><div><span className="section-kicker">SCREENPLAY WORKSPACE</span><h3>{String((refinedScript ?? scriptDraft)?.title ?? project.name)}</h3></div><span>{refinedScript ? "REFINED VERSION" : "FIRST DRAFT"}</span></div>
            <p className="script-logline">{String((refinedScript ?? scriptDraft)?.logline ?? "")}</p>
            <pre>{String((refinedScript ?? scriptDraft)?.screenplay ?? "")}</pre>
            {Array.isArray((refinedScript ?? scriptDraft)?.revision_notes) && <div className="script-revision-notes"><strong>EDITOR&apos;S CHANGES</strong>{((refinedScript ?? scriptDraft)?.revision_notes as string[]).map((note,index)=><p key={index}>• {note}</p>)}</div>}
            {Array.isArray((refinedScript ?? scriptDraft)?.scene_breakdown) && <div className="script-scene-count">{((refinedScript ?? scriptDraft)?.scene_breakdown as unknown[]).length} structured scenes included in the screenplay output.</div>}
            <div className="script-approval-row"><span>{scriptApproved ? "Approved screenplay saved to this project." : "Review the screenplay before approving the next stage."}</span><button className="primary-button" onClick={() => void approveScreenplay()} disabled={saving || scriptApproved}>{saving ? "Saving approval…" : scriptApproved ? "Screenplay approved ✓" : "Approve screenplay & continue →"}</button></div>
          </div>}
          {storyboard && Array.isArray(storyboard.scenes) && <div className="storyboard-result">
            <div className="storyboard-heading"><div><span className="section-kicker">STORYBOARD REVIEW</span><h3>{String(storyboard.title ?? project.name)}</h3><p>{String(storyboard.story_summary ?? "")}</p></div><span>{(storyboard.scenes as StoryboardScene[]).length} SCENES</span></div>
            <div className="storyboard-overview"><strong>VISUAL APPROACH</strong><p>{String(storyboard.visual_approach ?? "")}</p><span>Estimated runtime: {String(storyboard.total_duration_seconds ?? "—")} seconds</span></div>
            <div className="storyboard-scene-grid">{(storyboard.scenes as StoryboardScene[]).map((scene,index)=><article className="storyboard-scene-card" key={scene.scene_number ?? index}>
              <div className="storyboard-scene-top"><span>SCENE {String(scene.scene_number ?? index+1).padStart(2,"0")}</span><span>{scene.duration_seconds ?? "—"}s</span></div>
              <h4>{scene.title}</h4><p className="storyboard-purpose">{scene.story_purpose}</p><p>{scene.description}</p>
              <div className="storyboard-scene-meta"><span>{scene.location}</span><span>{scene.time_of_day}</span></div>
              {scene.characters?.length > 0 && <div className="storyboard-detail"><small>CHARACTERS</small><p>{scene.characters.join(" · ")}</p></div>}
              {scene.dialogue && <div className="storyboard-detail"><small>DIALOGUE / NARRATION</small><p>{scene.dialogue}</p></div>}
              <div className="storyboard-detail"><small>CAMERA DIRECTION</small><p>{scene.camera_direction}</p></div>
              <div className="storyboard-detail"><small>VISUAL GENERATION PROMPT</small><p>{scene.visual_prompt}</p></div>
              <div className="storyboard-detail"><small>AUDIO DIRECTION</small><p>{scene.audio_direction}</p></div>
              <div className="storyboard-detail"><small>CONTINUITY NOTES</small><p>{scene.continuity_notes}</p></div>
              {Array.isArray(scene.shots) && <div className="storyboard-shots"><strong>SHOT LIST</strong>{scene.shots.map((shot,shotIndex)=><div className="storyboard-shot" key={shot.shot_number ?? shotIndex}><span>{String(shot.shot_number ?? shotIndex+1).padStart(2,"0")}</span><div><b>{shot.shot_type} · {shot.framing}</b><p>{shot.visual_description}</p><small>{shot.camera_movement} · {shot.duration_seconds}s</small><details><summary>Image prompt</summary><p>{shot.image_prompt}</p></details></div></div>)}</div>}
            </article>)}</div>
            <div className="script-approval-row"><span>{storyboardApproved ? "Storyboard approved and saved to this project." : "Review every scene and shot before approving continuity development."}</span><button className="primary-button" onClick={() => void approveStoryboard()} disabled={saving || storyboardApproved}>{saving ? "Saving approval…" : storyboardApproved ? "Storyboard approved ✓" : "Approve storyboard & continue →"}</button></div>
          </div>}
          {continuityBible && <div className="continuity-result">
            <div className="storyboard-heading"><div><span className="section-kicker">CONTINUITY BIBLE REVIEW</span><h3>{String(continuityBible.title ?? "Production continuity bible")}</h3><p>Reusable production references extracted from the approved screenplay and storyboard.</p></div><span>{continuityApproved ? "APPROVED" : "AWAITING REVIEW"}</span></div>
            <div className="continuity-summary"><strong>MASTER VISUAL PROMPT</strong><p>{String(continuityBible.master_visual_prompt ?? "")}</p></div>
            {Array.isArray(continuityBible.characters) && <div className="continuity-section"><h4>Character identity & wardrobe</h4><div className="continuity-grid">{(continuityBible.characters as Record<string, unknown>[]).map((item,index)=><article key={String(item.name ?? index)}><strong>{String(item.name ?? "Character")}</strong><small>{String(item.narrative_role ?? "")}</small><p>{String(item.physical_appearance ?? "")}</p><p><b>Wardrobe:</b> {String(item.wardrobe ?? "")}</p><p><b>Hair & makeup:</b> {String(item.hair_makeup ?? "")}</p><p><b>Voice:</b> {String(item.voice_and_delivery ?? "")}</p><p><b>Performance:</b> {String(item.behavior_and_performance ?? "")}</p>{Array.isArray(item.continuity_anchors) && <p><b>Identity anchors:</b> {(item.continuity_anchors as string[]).join(" · ")}</p>}</article>)}</div></div>}
            {Array.isArray(continuityBible.locations) && <div className="continuity-section"><h4>Location continuity</h4><div className="continuity-grid">{(continuityBible.locations as Record<string, unknown>[]).map((item,index)=><article key={String(item.name ?? index)}><strong>{String(item.name ?? "Location")}</strong><p>{String(item.visual_description ?? "")}</p><p><b>Layout:</b> {String(item.layout ?? "")}</p><p><b>Lighting:</b> {String(item.lighting ?? "")}</p><p><b>Environment:</b> {String(item.environmental_details ?? "")}</p>{Array.isArray(item.continuity_anchors) && <p><b>Anchors:</b> {(item.continuity_anchors as string[]).join(" · ")}</p>}</article>)}</div></div>}
            {Array.isArray(continuityBible.recurring_props) && <div className="continuity-section"><h4>Recurring props</h4><ul>{(continuityBible.recurring_props as Record<string, unknown>[]).map((item,index)=><li key={String(item.name ?? index)}><b>{String(item.name ?? "Prop")}:</b> {String(item.description ?? "")} <span>{String(item.state_and_position_rules ?? "")}</span></li>)}</ul></div>}
            <div className="continuity-rule-grid">
              {(["color_palette","lighting_rules","camera_language","continuity_rules","negative_constraints"] as const).map(key=>Array.isArray(continuityBible[key]) && <div key={key}><strong>{key.replaceAll("_"," ").toUpperCase()}</strong><ul>{(continuityBible[key] as string[]).map((item,index)=><li key={index}>{item}</li>)}</ul></div>)}
            </div>
            <div className="script-approval-row"><span>{continuityApproved ? "Continuity bible approved and saved to this project." : "Approve these production rules before moving to audio planning."}</span><button className="primary-button" onClick={() => void approveContinuity()} disabled={saving || continuityApproved}>{saving ? "Saving approval…" : continuityApproved ? "Continuity approved ✓" : "Approve continuity & continue →"}</button></div>
          </div>}
          {audioPlan && <div className="audio-result">
            <div className="storyboard-heading"><div><span className="section-kicker">AUDIO DEPARTMENT · REVIEW</span><h3>{String(audioPlan.title ?? "Production audio plan")}</h3><p>{String(audioPlan.audio_strategy ?? "")}</p></div><span>{audioApproved ? "APPROVED" : "AWAITING REVIEW"}</span></div>
            <div className="audio-decision"><div><small>VOICEOVER DECISION</small><strong>{audioPlan.voiceover_required ? "Narration recommended" : "No voiceover required"}</strong><p>{String(audioPlan.voiceover_rationale ?? "")}</p></div><div><small>ESTIMATED AUDIO LENGTH</small><strong>{String(audioPlan.estimated_audio_duration_seconds ?? "—")} sec</strong></div></div>
            {typeof audioPlan.narration === "object" && audioPlan.narration !== null && <div className="audio-section"><h4>Narration direction</h4><div className="audio-narration"><p>{String((audioPlan.narration as Record<string, unknown>).script ?? "No narration script required.")}</p><small>{String((audioPlan.narration as Record<string, unknown>).language ?? "")} · {String((audioPlan.narration as Record<string, unknown>).accent_or_dialect ?? "")}</small><p>{String((audioPlan.narration as Record<string, unknown>).delivery_direction ?? "")}</p></div></div>}
            {Array.isArray(audioPlan.voice_cast) && <div className="audio-section"><h4>Voice cast & performance</h4><div className="audio-card-grid">{(audioPlan.voice_cast as Record<string, unknown>[]).map((item,index)=><article key={String(item.character ?? index)}><strong>{String(item.character ?? "Voice")}</strong><p>{String(item.voice_profile ?? "")}</p><small>{String(item.language ?? "")} · {String(item.accent_or_dialect ?? "")}</small><p>{String(item.performance_direction ?? "")}</p></article>)}</div></div>}
            {Array.isArray(audioPlan.dialogue_cues) && <div className="audio-section"><h4>Dialogue & narration cues</h4><div className="audio-cue-list">{(audioPlan.dialogue_cues as Record<string, unknown>[]).map((item,index)=><article key={index}><span>SCENE {String(item.scene_number ?? "—")}</span><div><strong>{String(item.character ?? "Speaker")}</strong><p>{String(item.exact_line_or_reference ?? "")}</p><small>{String(item.performance_direction ?? "")} · {String(item.timing_notes ?? "")}</small></div></article>)}</div></div>}
            {Array.isArray(audioPlan.music_cues) && <div className="audio-section"><h4>Original music cues</h4><div className="audio-card-grid">{(audioPlan.music_cues as Record<string, unknown>[]).map((item,index)=><article key={String(item.cue_id ?? index)}><strong>{String(item.cue_id ?? "Music cue")} · {String(item.emotional_purpose ?? "")}</strong><p>{String(item.mood ?? "")} · {String(item.tempo ?? "")}</p><p>{String(item.instrumentation ?? "")}</p><small>{String(item.entry_and_exit ?? "")}</small><p>{String(item.mix_notes ?? "")}</p></article>)}</div></div>}
            {Array.isArray(audioPlan.sound_effects) && <div className="audio-section"><h4>Sound effects</h4><div className="audio-cue-list">{(audioPlan.sound_effects as Record<string, unknown>[]).map((item,index)=><article key={String(item.cue_id ?? index)}><span>SCENE {String(item.scene_number ?? "—")}</span><div><strong>{String(item.event ?? "Sound cue")}</strong><p>{String(item.sound_description ?? "")}</p><small>{String(item.timing ?? "")} · {String(item.perspective ?? "")}</small></div></article>)}</div></div>}
            {Array.isArray(audioPlan.ambience) && <div className="audio-section"><h4>Environmental ambience</h4><div className="audio-card-grid">{(audioPlan.ambience as Record<string, unknown>[]).map((item,index)=><article key={index}><strong>Scene {String(item.scene_number ?? "—")} · {String(item.environment ?? "")}</strong><p>{Array.isArray(item.sound_layers) ? (item.sound_layers as string[]).join(" · ") : String(item.sound_layers ?? "")}</p><small>{String(item.transition_notes ?? "")}</small></article>)}</div></div>}
            <div className="audio-rule-grid">
              {Array.isArray(audioPlan.mixing_guidelines) && <div><strong>MIXING GUIDELINES</strong><ul>{(audioPlan.mixing_guidelines as string[]).map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
              {typeof audioPlan.captions_and_localization === "object" && audioPlan.captions_and_localization !== null && <div><strong>CAPTIONS & LOCALIZATION</strong><p>{Object.entries(audioPlan.captions_and_localization as Record<string, unknown>).map(([key,value])=>key.replaceAll("_"," ")+": "+String(value)).join(" · ")}</p></div>}
              {Array.isArray(audioPlan.delivery_specifications) && <div><strong>DELIVERY SPECIFICATIONS</strong><ul>{(audioPlan.delivery_specifications as string[]).map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
            </div>
            <div className="script-approval-row"><span>{audioApproved ? "Audio plan approved and saved to this project." : "Review the voice, dialogue, music and sound plan before authorising provider routing."}</span><button className="primary-button" onClick={() => void approveAudioPlan()} disabled={saving || audioApproved}>{saving ? "Saving approval…" : audioApproved ? "Audio plan approved ✓" : "Approve audio plan & continue →"}</button></div>
          </div>}
          {generationManifest && <div className="production-route-result generation-manifest-result">
            <div className="storyboard-heading"><div><span className="section-kicker">GENERATION PLANNER · EXECUTION MANIFEST</span><h3>Scene-by-scene production tasks</h3><p>Approved shots have been translated into a durable task plan. This is not a generation run.</p></div><span>{String(generationManifest.manifest_status ?? "PREPARED").replaceAll("_"," ").toUpperCase()}</span></div>
            <div className="route-summary-grid">{Boolean(generationManifest.summary) && typeof generationManifest.summary === "object" && Object.entries(generationManifest.summary as Record<string, unknown>).map(([key,value])=><div key={key}><small>{key.replaceAll("_"," ").toUpperCase()}</small><strong>{String(value)}</strong></div>)}</div>
            <div className="route-list">{Array.isArray(generationManifest.departments) && (generationManifest.departments as Record<string, unknown>[]).map((department,index)=><article className="route-department" key={String(department.category ?? index)}><div className="route-department-icon">{String(department.category ?? "AI").slice(0,2).toUpperCase()}</div><div className="route-department-main"><div className="route-department-heading"><div><strong>{String(department.title ?? department.category ?? "Department")}</strong><p>{String(department.provider ?? "Unassigned")}</p></div><span className={"route-status " + (department.execution_ready ? "route-ready" : "route-provider_not_registered")}>{department.execution_ready ? "Adapter verified" : "Adapter required"}</span></div><p className="route-next-action">{String(department.blocker ?? "Ready for worker review.")}</p></div></article>)}</div>
            <div className="route-safety-note"><strong>Execution state</strong><p>{String(generationManifest.safety_note ?? "No media generation has started.")}</p><p>{String(generationManifest.next_step ?? "The worker and verified provider adapters are the next requirements.")}</p></div>
          </div>}
          {productionRoute && <div className="production-route-result">
            <div className="storyboard-heading"><div><span className="section-kicker">PRODUCTION DIRECTOR · ROUTING ASSESSMENT</span><h3>Provider assignment & readiness</h3><p>This assessment checks your private provider registry. It does not sign in to external services or generate media.</p></div><span>{routeApproved ? "APPROVED" : "REVIEW REQUIRED"}</span></div>
            <div className="route-summary-grid">
              {Boolean(productionRoute.summary) && typeof productionRoute.summary === "object" && Object.entries(productionRoute.summary as Record<string, unknown>).map(([key,value])=><div key={key}><small>{key.replaceAll("_"," ").toUpperCase()}</small><strong>{String(value)}</strong></div>)}
            </div>
            <div className="route-list">
              {Array.isArray(productionRoute.routes) && (productionRoute.routes as Record<string, unknown>[]).map((route,index)=>{
                const assigned=route.assigned_provider && typeof route.assigned_provider==="object" ? route.assigned_provider as Record<string,unknown> : null;
                const status=String(route.route_status ?? "unknown");
                const statusLabel=status==="provider_not_registered"?"Provider not registered":status==="provider_account_required"?"Account profile required":status==="account_connection_required"?"Connection required":status==="account_marked_connected_adapter_missing"?"Adapter not integrated":"Needs review";
                return <article className="route-department" key={String(route.category ?? index)}>
                  <div className="route-department-icon">{String(route.category ?? "AI").slice(0,2).toUpperCase()}</div>
                  <div className="route-department-main"><div className="route-department-heading"><div><strong>{String(route.title ?? route.category ?? "Department")}</strong><p>{String(route.purpose ?? "")}</p></div><span className={"route-status route-"+status}>{statusLabel}</span></div>
                    {assigned ? <div className="route-assigned"><strong>{String(assigned.name ?? "Provider")}</strong><small>{String(assigned.connection_type ?? "connection type unknown").replaceAll("_"," ")} · provider status: {String(assigned.registry_connection_status ?? "unknown").replaceAll("_"," ")}</small><small>Account: {String(assigned.account_label ?? "No account profile")} · {String(assigned.account_status ?? "unknown").replaceAll("_"," ")}</small>{typeof assigned.website_url === "string" && assigned.website_url.length > 0 && <a href={assigned.website_url} target="_blank" rel="noreferrer">Open provider website ↗</a>}</div> : <div className="route-assigned route-unassigned"><strong>No provider registered for this department</strong><Link href="/tools">Open AI tool manager to register one ↗</Link></div>}
                    <p className="route-next-action">{String(route.next_action ?? "")}</p>
                  </div>
                </article>;
              })}
            </div>
            <div className="route-safety-note"><strong>Execution safety</strong><p>{String(productionRoute.safety_note ?? "No external provider has been called.")}</p><p>Even a provider marked connected is not yet executable until its official adapter has been implemented and tested.</p></div>
            <div className="script-approval-row"><span>{routeApproved ? "Routing assessment approved. Generation is still safely paused pending provider adapters." : "Approve this routing assessment to record the hand-off. This does not start generation."}</span><button className="primary-button" onClick={() => void approveProductionRoute()} disabled={saving || routeApproved}>{saving ? "Saving approval…" : routeApproved ? "Routing approved ✓" : "Approve routing assessment →"}</button></div>
          </div>}
          <p className="director-footnote">AI processing runs securely on the server. Your provider key is never placed in the browser or saved in project metadata.</p>
        </section>
        <div className="project-overview-grid creative-overview-grid"><div className="project-overview-card"><span>SCENES PLANNED</span><strong>{scenes.length}</strong></div><div className="project-overview-card"><span>FRAME FORMAT</span><strong>{aspectRatio}</strong></div><div className="project-overview-card"><span>TARGET LENGTH</span><strong>{duration ? duration + "s" : "Not set"}</strong></div><div className="project-overview-card"><span>PROJECT ASSETS</span><strong>{assets.length}</strong></div></div>
        <div className="project-detail-grid creative-project-grid">
          <section className="panel brief-panel creative-panel"><div className="panel-heading"><div><h2>Creative brief</h2><p>The central idea and production constraints.</p></div><span className="brief-status">Project context</span></div><form onSubmit={saveBrief} className="brief-form"><label htmlFor="brief-description">What is this production about?</label><textarea id="brief-description" rows={7} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the story, purpose, audience, mood, key message and anything the production must preserve…" /><div className="brief-fields"><div><label htmlFor="aspect-ratio">Frame format</label><select id="aspect-ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option><option>2.39:1</option></select></div><div><label htmlFor="target-duration">Target duration (seconds)</label><input id="target-duration" type="number" min="1" max="7200" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 60" /></div></div><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save creative brief"}</button></form></section>
          <section className="panel continuity-panel creative-panel"><div className="panel-heading"><div><h2>Production bible</h2><p>Reusable references that keep every scene consistent.</p></div><span className="brief-status">Persistent context</span></div>
            <form className="bible-form" onSubmit={saveBible}>
              <label htmlFor="bible-characters">Characters & identity</label><textarea id="bible-characters" rows={3} value={bible.characters} onChange={e => setBible({ ...bible, characters: e.target.value })} placeholder="Character names, age range, appearance, wardrobe, voice and behaviour…" />
              <label htmlFor="bible-locations">Locations & environment</label><textarea id="bible-locations" rows={3} value={bible.locations} onChange={e => setBible({ ...bible, locations: e.target.value })} placeholder="Places, architecture, time of day, weather and recurring background details…" />
              <label htmlFor="bible-visual">Visual language</label><textarea id="bible-visual" rows={3} value={bible.visual_style} onChange={e => setBible({ ...bible, visual_style: e.target.value })} placeholder="Colour palette, lighting, camera language, lens feel, realism and composition…" />
              <label htmlFor="bible-audio">Audio identity</label><textarea id="bible-audio" rows={2} value={bible.audio_style} onChange={e => setBible({ ...bible, audio_style: e.target.value })} placeholder="Voice, accent, music mood, ambience and sound design…" />
              <label htmlFor="bible-rules">Rules that must never change</label><textarea id="bible-rules" rows={2} value={bible.rules} onChange={e => setBible({ ...bible, rules: e.target.value })} placeholder="Continuity rules, exclusions and non-negotiable details…" />
              <button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save production bible"}</button>
            </form>
          </section>
        </div>
        <section className="panel scenes-panel creative-panel"><div className="panel-heading"><div><h2>Scene development</h2><p>Every scene has its own action, camera, dialogue and sound direction.</p></div><button className="primary-button" onClick={openNewScene}>＋ Add scene</button></div>
          {scenes.length === 0 ? <div className="empty-projects scene-empty"><div className="empty-icon">▦</div><strong>Your storyboard starts here.</strong><p>Add the opening scene, then develop the production one shot at a time.</p><button className="secondary-button" onClick={openNewScene}>Create first scene</button></div> : <div className="scene-list">{scenes.map(scene => <article className="scene-row creative-scene-row" key={scene.id}><span className="scene-number">{String(scene.scene_number).padStart(2, "0")}</span><div className="scene-copy"><strong>{scene.title}</strong><p>{scene.description || scene.visual_prompt || "No scene description yet."}</p><div className="scene-tags"><span>{scene.status.replaceAll("_", " ")}</span>{scene.target_duration_seconds && <span>{scene.target_duration_seconds}s</span>}{scene.camera_direction && <span>Camera direction saved</span>}</div>{scene.dialogue && <small>Dialogue: {scene.dialogue}</small>}</div><div className="scene-actions"><button className="text-action" onClick={() => openEditScene(scene)}>Edit</button><button className="text-action danger-action" onClick={() => void deleteScene(scene)}>Delete</button></div></article>)}</div>}
        </section>
        <section className="panel scenes-panel creative-panel"><div className="panel-heading"><div><h2>Production run</h2><p>Create and track a five-stage checklist. AI provider execution is a separate integration milestone.</p></div><button className="secondary-button" onClick={() => void createProductionPlan()} disabled={saving}>{saving ? "Preparing…" : "＋ Create production plan"}</button></div>
          {activeJob ? <div className="run-card"><div className="run-card-head"><div><strong>{activeJob.title}</strong><small>Created {new Date(activeJob.created_at).toLocaleString()}</small></div><span className={"run-status run-" + activeJob.status}>{activeJob.status.replaceAll("_", " ")}</span></div><div className="run-steps">{activeSteps.map(step => <div className="run-step" key={step.id}><span className={"run-step-mark step-" + step.status}>{step.step_order}</span><div><strong>{step.title}</strong><small>{stageDetails[step.stage] ?? pipeline.find(item => item.stage === step.stage)?.detail ?? "Production stage"}</small></div><select aria-label={"Update " + step.title + " status"} value={step.status} onChange={e => void updateStep(step, e.target.value)}><option value="pending">Pending</option><option value="ready">Ready</option><option value="running">In progress</option><option value="waiting_for_approval">Needs review</option><option value="succeeded">Completed</option><option value="skipped">Skipped</option></select></div>)}</div><p className="run-disclaimer">This checklist records your production progress. It does not yet trigger external AI generation or video rendering.</p></div> : <div className="asset-empty"><strong>No production run yet</strong><p>Create a structured checklist for this project. You can update each stage as the work progresses.</p></div>}
        </section>
        <section className="panel scenes-panel creative-panel" id="assets"><div className="panel-heading"><div><h2>Project asset library</h2><p>Private references, images, audio, video and documents for this production.</p></div><label className="secondary-button upload-button">{uploading ? "Uploading…" : "＋ Upload asset"}<input type="file" accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx" onChange={uploadAsset} disabled={uploading} /></label></div>
          {assets.length ? <div className="asset-grid">{assets.map(asset => <article className="asset-card" key={asset.id}><div className={"asset-preview asset-" + asset.asset_type}><span>{asset.asset_type.toUpperCase()}</span></div><div className="asset-card-copy"><strong title={asset.file_name}>{asset.file_name}</strong><small>{asset.mime_type || asset.asset_type} · {asset.file_size_bytes ? (asset.file_size_bytes / 1024 / 1024).toFixed(1) + " MB" : "File"}</small><div><button className="text-action" onClick={() => void openAsset(asset)}>Open</button><button className="text-action danger-action" onClick={() => void removeAsset(asset)}>Remove</button></div></div></article>)}</div> : <div className="asset-empty"><strong>Your production references live here.</strong><p>Upload character sheets, location images, audio references, scripts or other project materials. Files are stored privately.</p></div>}
        </section>
      </div>
    </section>
    {showSceneForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowSceneForm(false); }}><form className="project-modal scene-modal creative-modal" onSubmit={saveScene}><div className="modal-top"><div><p className="eyebrow">SCENE DEVELOPMENT</p><h2>{editingScene ? "Edit scene" : "Add production scene"}</h2></div><button type="button" className="close-button" onClick={() => setShowSceneForm(false)} aria-label="Close">×</button></div>
      <label htmlFor="scene-title">Scene title</label><input id="scene-title" value={sceneTitle} onChange={e => setSceneTitle(e.target.value)} placeholder="e.g. Opening — The empty street" maxLength={140} required />
      <label htmlFor="scene-description">Action & story beat</label><textarea id="scene-description" rows={3} value={sceneDescription} onChange={e => setSceneDescription(e.target.value)} placeholder="What happens, where it happens and why this moment matters…" />
      <label htmlFor="scene-prompt">Visual generation direction</label><textarea id="scene-prompt" rows={3} value={scenePrompt} onChange={e => setScenePrompt(e.target.value)} placeholder="Subject, environment, style, lighting, composition and movement…" />
      <div className="brief-fields"><div><label htmlFor="scene-camera">Camera direction</label><textarea id="scene-camera" rows={3} value={cameraDirection} onChange={e => setCameraDirection(e.target.value)} placeholder="Shot size, angle, movement, lens…" /></div><div><label htmlFor="scene-audio">Audio direction</label><textarea id="scene-audio" rows={3} value={audioDirection} onChange={e => setAudioDirection(e.target.value)} placeholder="Dialogue delivery, ambience, music, SFX…" /></div></div>
      <label htmlFor="scene-dialogue">Dialogue or narration</label><textarea id="scene-dialogue" rows={3} value={sceneDialogue} onChange={e => setSceneDialogue(e.target.value)} placeholder="Character dialogue, voiceover or narration…" />
      <label htmlFor="scene-continuity">Continuity notes</label><textarea id="scene-continuity" rows={2} value={continuityNotes} onChange={e => setContinuityNotes(e.target.value)} placeholder="Details this scene must preserve from the production bible…" />
      <label htmlFor="scene-duration">Target scene duration (seconds)</label><input id="scene-duration" type="number" min="1" max="3600" value={sceneDuration} onChange={e => setSceneDuration(e.target.value)} placeholder="Optional" />
      <div className="modal-note">Scene direction is saved in the project database. Provider generation will be connected in a later integration milestone.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowSceneForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : editingScene ? "Save scene changes" : "Save scene"}</button></div>
    </form></div>}
  </main>;
}
