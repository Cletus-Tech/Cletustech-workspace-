"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Project = {
  id: string; name: string; production_type: string; description: string | null;
  status: string; aspect_ratio: string; target_duration_seconds: number | null; updated_at: string;
};
type Scene = {
  id: string; scene_number: number; title: string; description: string | null;
  dialogue: string | null; visual_prompt: string | null; status: string; target_duration_seconds: number | null;
};

export default function ProjectWorkspacePage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [sceneDialogue, setSceneDialogue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { router.replace("/login"); return; }
    setUser(currentUser);
    const [projectResult, sceneResult] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("scenes").select("*").eq("project_id", projectId).order("scene_number", { ascending: true })
    ]);
    if (projectResult.error) setError(projectResult.error.message);
    else {
      setProject(projectResult.data);
      setDescription(projectResult.data.description ?? "");
      setAspectRatio(projectResult.data.aspect_ratio ?? "16:9");
      setDuration(projectResult.data.target_duration_seconds?.toString() ?? "");
    }
    if (sceneResult.error) setError(sceneResult.error.message);
    else setScenes(sceneResult.data ?? []);
    setLoading(false);
  }, [projectId, router, supabase]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) {
        setError("This project link is missing its project ID.");
        setLoading(false);
        return;
      }
      setProjectId(id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load, projectId]);

  async function saveBrief(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setSaving(true); setError(""); setNotice("");
    const parsedDuration = duration.trim() ? Number(duration) : null;
    if (parsedDuration !== null && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      setError("Enter a valid target duration in seconds."); setSaving(false); return;
    }
    const { error: updateError } = await supabase.from("projects").update({
      description: description.trim() || null, aspect_ratio: aspectRatio,
      target_duration_seconds: parsedDuration, updated_at: new Date().toISOString()
    }).eq("id", project.id);
    setSaving(false);
    if (updateError) setError(updateError.message);
    else { setNotice("Production brief saved."); await load(); }
  }

  async function addScene(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !user) return;
    setSaving(true); setError("");
    const nextNumber = scenes.reduce((max, scene) => Math.max(max, scene.scene_number), 0) + 1;
    const { error: insertError } = await supabase.from("scenes").insert({
      owner_id: user.id, project_id: project.id, scene_number: nextNumber,
      title: sceneTitle.trim(), description: sceneDescription.trim() || null,
      visual_prompt: scenePrompt.trim() || null, dialogue: sceneDialogue.trim() || null
    });
    setSaving(false);
    if (insertError) setError(insertError.message);
    else {
      setSceneTitle(""); setSceneDescription(""); setScenePrompt(""); setSceneDialogue("");
      setShowSceneForm(false); setNotice(`Scene ${nextNumber} added to your production plan.`); await load();
    }
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); }

  if (loading) return <main className="boot-screen"><div className="boot-mark">CT</div><div className="boot-title">CLETUS TECH WORKSPACE</div><div className="boot-line" /><p>Opening production workspace…</p></main>;
  if (!project) return <main className="auth-screen"><section className="auth-card"><p className="eyebrow">PROJECT NOT AVAILABLE</p><h1>We could not open this project.</h1><p className="auth-subtitle">{error || "It may have been removed or you may not have access."}</p><Link className="primary-button" href="/">Return to workspace</Link></section></main>;

  return <main className="app-frame">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">CT</span><span className="brand-copy"><strong>CLETUS TECH</strong><small>WORKSPACE</small></span></Link><div className="workspace-switch"><span className="workspace-avatar">C</span><span><strong>Personal workspace</strong><small>Free workspace</small></span></div><nav className="side-nav"><div className="nav-group"><p className="nav-heading">WORKSPACE</p><Link className="nav-link" href="/"><span className="nav-icon">◫</span>Overview</Link><Link className="nav-link active" href="/#projects"><span className="nav-icon">▤</span>My projects</Link></div><div className="nav-group"><p className="nav-heading">INTELLIGENCE</p><Link className="nav-link" href="/tools"><span className="nav-icon">✳</span>AI tool manager</Link></div></nav><div className="sidebar-bottom"><div className="plan-card"><span className="plan-dot" /><div><strong>Free-first workspace</strong><small>Production in progress</small></div></div><button className="nav-link signout-link" onClick={signOut}><span className="nav-icon">↪</span>Sign out</button><div className="profile-row"><div className="profile-avatar">CT</div><div><strong>{user?.user_metadata?.display_name || "Workspace owner"}</strong><small>{user?.email}</small></div></div></div></aside>
    <section className="main-area"><header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><b>/</b><strong>{project.name}</strong></div><div className="top-actions"><span className="system-status"><i /> Project saved in workspace</span><div className="top-avatar">CT</div></div></header>
      <div className="content"><Link href="/" className="back-link">← Back to all projects</Link><div className="welcome-row project-welcome"><div><p className="eyebrow">PRODUCTION WORKSPACE · {project.status.replaceAll("_"," ").toUpperCase()}</p><h1>{project.name}</h1><p className="subheading">Build the creative brief, break the idea into scenes and keep every production decision together.</p></div><button className="primary-button" onClick={() => setShowSceneForm(true)}><span>＋</span> Add scene</button></div>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}{error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        <div className="project-overview-grid"><div className="project-overview-card"><span>PRODUCTION TYPE</span><strong>{project.production_type.replaceAll("_"," ")}</strong></div><div className="project-overview-card"><span>SCENES PLANNED</span><strong>{scenes.length}</strong></div><div className="project-overview-card"><span>FRAME FORMAT</span><strong>{aspectRatio}</strong></div><div className="project-overview-card"><span>TARGET LENGTH</span><strong>{duration ? `${duration}s` : "Not set"}</strong></div></div>
        <div className="project-detail-grid"><section className="panel brief-panel"><div className="panel-heading"><div><h2>Production brief</h2><p>Define the creative direction before generating anything.</p></div><span className="brief-status">Project context</span></div><form onSubmit={saveBrief} className="brief-form"><label htmlFor="brief-description">What is this production about?</label><textarea id="brief-description" rows={7} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the story, purpose, audience, mood, key message and anything the production must preserve…" /><div className="brief-fields"><div><label htmlFor="aspect-ratio">Frame format</label><select id="aspect-ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option><option>2.39:1</option></select></div><div><label htmlFor="target-duration">Target duration (seconds)</label><input id="target-duration" type="number" min="1" max="7200" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 60" /></div></div><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save production brief"}</button></form></section>
        <section className="panel continuity-panel"><div className="panel-heading"><div><h2>Production continuity</h2><p>Keep these details consistent across scenes.</p></div></div><div className="continuity-item"><span>01</span><div><strong>Character identity</strong><small>Appearance, clothing, voice and behaviour references.</small></div></div><div className="continuity-item"><span>02</span><div><strong>Locations & environment</strong><small>Setting, time of day, weather and background details.</small></div></div><div className="continuity-item"><span>03</span><div><strong>Visual language</strong><small>Lighting, colour palette, camera style and realism.</small></div></div><div className="continuity-note">Continuity bible fields will be expanded in the visual development milestone. Your project brief is already saved separately.</div></section></div>
        <section className="panel scenes-panel"><div className="panel-heading"><div><h2>Scene plan</h2><p>Build the production one scene at a time. Each scene can later be generated and retried independently.</p></div><button className="secondary-button" onClick={() => setShowSceneForm(true)}>＋ Add scene</button></div>
          {scenes.length === 0 ? <div className="empty-projects scene-empty"><div className="empty-icon">▦</div><strong>No scenes planned yet</strong><p>Start by adding the opening scene. You can include the action, dialogue and visual direction.</p><button className="secondary-button" onClick={() => setShowSceneForm(true)}>Create first scene</button></div> : <div className="scene-list">{scenes.map(scene => <article className="scene-row" key={scene.id}><span className="scene-number">{String(scene.scene_number).padStart(2,"0")}</span><div className="scene-copy"><strong>{scene.title}</strong><p>{scene.description || scene.visual_prompt || "No scene description yet."}</p>{scene.dialogue && <small>Dialogue: {scene.dialogue}</small>}</div><span className="scene-state">{scene.status.replaceAll("_"," ")}</span></article>)}</div>}
        </section>
      </div>
    </section>
    {showSceneForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowSceneForm(false); }}><form className="project-modal scene-modal" onSubmit={addScene}><div className="modal-top"><div><p className="eyebrow">SCENE PLANNING</p><h2>Add production scene</h2></div><button type="button" className="close-button" onClick={() => setShowSceneForm(false)} aria-label="Close">×</button></div><label htmlFor="scene-title">Scene title</label><input id="scene-title" value={sceneTitle} onChange={e => setSceneTitle(e.target.value)} placeholder="e.g. Opening — The empty street" maxLength={140} required /><label htmlFor="scene-description">What happens in this scene?</label><textarea id="scene-description" className="provider-notes-input" rows={3} value={sceneDescription} onChange={e => setSceneDescription(e.target.value)} placeholder="Describe the action, setting and story beat…" /><label htmlFor="scene-prompt">Visual direction / generation prompt</label><textarea id="scene-prompt" className="provider-notes-input" rows={3} value={scenePrompt} onChange={e => setScenePrompt(e.target.value)} placeholder="Camera framing, lens, lighting, subject, motion, visual style…" /><label htmlFor="scene-dialogue">Dialogue or narration (optional)</label><textarea id="scene-dialogue" className="provider-notes-input" rows={2} value={sceneDialogue} onChange={e => setSceneDialogue(e.target.value)} placeholder="Dialogue, voiceover or narration…" /><div className="modal-note">Scene details are saved independently. Later, the workflow engine can send one scene to a selected AI provider without regenerating the entire project.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowSceneForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save scene"}</button></div></form></div>}
  </main>;
}
