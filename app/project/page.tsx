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
  storyboard: "Break the script into scenes, shots and continuity rules.",
  audio: "Prepare voiceover, dialogue, music and sound requirements.",
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

  async function runCreativeStage(action: "analyze" | "concepts") {
    if (!project) return;
    if (action === "concepts" && !projectAnalysis) { setError("Complete project analysis before developing concepts."); return; }
    if (action === "analyze") setAnalysisBusy(true); else setConceptBusy(true);
    setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("creative-director", { body: { project_id: project.id, action } });
    if (action === "analyze") setAnalysisBusy(false); else setConceptBusy(false);
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
    setNotice(action === "analyze" ? "Project analysis is complete. Review the direction, then develop alternative concepts." : "Three creative concepts are ready for your review.");
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
