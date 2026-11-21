"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  production_type: string;
  status: string;
  updated_at: string;
};

const stages = [
  ["01", "Creative direction", "Shape the idea and define the production brief."],
  ["02", "Script & storyboard", "Develop scenes, dialogue and shot plans."],
  ["03", "Visual production", "Create consistent characters, locations and motion."],
  ["04", "Voice & sound", "Build narration, dialogue, music and sound effects."],
  ["05", "Edit & delivery", "Assemble, review and export the final production."]
];

const typeLabels: Record<string, string> = {
  cinematic_video: "Cinematic video",
  short_film: "Short film",
  youtube: "YouTube production",
  advertisement: "Advertisement",
  animation: "Animation",
  podcast: "Podcast / audio",
  custom: "Custom production"
};

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [providerCount, setProviderCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("cinematic_video");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
    const [projectResult, providerResult, jobResult] = await Promise.all([
      supabase.from("projects").select("id,name,production_type,status,updated_at").order("updated_at", { ascending: false }).limit(8),
      supabase.from("ai_providers").select("id", { count: "exact", head: true }).eq("is_enabled", true),
      supabase.from("production_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running", "waiting_for_approval"])
    ]);
    if (projectResult.error) setError(projectResult.error.message);
    else setProjects(projectResult.data ?? []);
    if (providerResult.count !== null) setProviderCount(providerResult.count);
    if (jobResult.count !== null) setJobCount(jobResult.count);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void loadWorkspace(); });
    return () => window.cancelAnimationFrame(frame);
  }, [loadWorkspace]);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !projectName.trim()) return;
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("projects").insert({
      owner_id: user.id,
      name: projectName.trim(),
      production_type: projectType
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNotice("Project created and saved to your workspace.");
    setProjectName("");
    setShowNewProject(false);
    await loadWorkspace();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <main className="boot-screen"><div className="boot-mark">CT</div><div className="boot-title">CLETUS TECH WORKSPACE</div><div className="boot-line" /><p>Preparing your workspace…</p></main>;
  }

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <a className="brand" href="#overview"><span className="brand-mark">CT</span><span className="brand-copy"><strong>CLETUS TECH</strong><small>WORKSPACE</small></span></a>
        <div className="workspace-switch"><span className="workspace-avatar">C</span><span><strong>Personal workspace</strong><small>Free workspace</small></span><span className="chevron">⌄</span></div>
        <nav className="side-nav" aria-label="Main navigation">
          <div className="nav-group"><p className="nav-heading">WORKSPACE</p><a className="nav-link active" href="#overview"><span className="nav-icon">◫</span>Overview</a><a className="nav-link" href="#projects"><span className="nav-icon">▤</span>My projects</a><a className="nav-link" href="#pipeline"><span className="nav-icon">◉</span>Production studio</a><a className="nav-link" href="#assets"><span className="nav-icon">▧</span>Asset library</a></div>
          <div className="nav-group"><p className="nav-heading">INTELLIGENCE</p><a className="nav-link" href="#tools"><span className="nav-icon">✳</span>AI tool manager</a><a className="nav-link" href="#pipeline"><span className="nav-icon">⌘</span>Workflow centre</a><a className="nav-link" href="#tools"><span className="nav-icon">◎</span>Account profiles</a></div>
        </nav>
        <div className="sidebar-bottom"><div className="plan-card"><span className="plan-dot" /><div><strong>Free-first workspace</strong><small>Upgrade only when needed</small></div></div><button className="nav-link signout-link" onClick={signOut}><span className="nav-icon">↪</span>Sign out</button><div className="profile-row"><div className="profile-avatar">CT</div><div><strong>{user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Workspace owner"}</strong><small>{user?.email}</small></div></div></div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>Overview</strong></div><div className="top-actions"><span className="system-status"><i /> Database connected</span><div className="top-avatar">CT</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow">YOUR CREATIVE CONTROL ROOM</p><h1>Good to have you here.</h1><p className="subheading">Your ideas, production tools and creative assets — organised in one workspace.</p></div><button className="primary-button" onClick={() => setShowNewProject(true)}><span>＋</span> New project</button></div>
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
          {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
          <div className="metric-grid">
            <div className="metric-card"><div className="metric-top"><span>YOUR PROJECTS</span><span className="metric-symbol">▤</span></div><strong>{projects.length}</strong><small>Saved production projects</small></div>
            <div className="metric-card"><div className="metric-top"><span>AI TOOLS REGISTERED</span><span className="metric-symbol">✳</span></div><strong>{providerCount}</strong><small>Enabled provider records</small></div>
            <div className="metric-card"><div className="metric-top"><span>ACTIVE TASKS</span><span className="metric-symbol">⌘</span></div><strong>{jobCount}</strong><small>Queued or running jobs</small></div>
            <div className="metric-card"><div className="metric-top"><span>WORKSPACE STATUS</span><span className="metric-symbol">◈</span></div><strong className="status-word">Connected</strong><small>Secure database session</small></div>
          </div>
          <div className="section-heading" id="pipeline"><div><p className="eyebrow">PRODUCTION PIPELINE</p><h2>From idea to final delivery</h2><p className="section-description">A structured process designed to keep your creative context intact.</p></div><span className="pipeline-label"><i /> 5 stages</span></div>
          <div className="pipeline-grid">{stages.map(([number, name, detail]) => <div className="stage-card" key={number}><div className="stage-top"><span className="stage-number">{number}</span>{number !== "05" && <span className="stage-connector" />}</div><h3>{name}</h3><p>{detail}</p><span className="stage-state">Production module planned</span></div>)}</div>
          <div className="lower-grid">
            <section className="panel projects-panel" id="projects"><div className="panel-heading"><div><h2>Recent projects</h2><p>Projects saved to your private workspace.</p></div><button className="text-button" onClick={() => setShowNewProject(true)}>New project <span>＋</span></button></div>
              {projects.length === 0 ? <div className="empty-projects"><div className="empty-icon">▤</div><strong>Your production space starts here</strong><p>Create a project to keep its brief, scripts, scenes, AI outputs and final exports together.</p><button className="secondary-button" onClick={() => setShowNewProject(true)}>＋ Create your first project</button></div> : <div className="project-list">{projects.map(project => <article className="project-row" key={project.id}><div className="project-thumb">▶</div><div className="project-info"><strong>{project.name}</strong><small>{typeLabels[project.production_type] || project.production_type.replaceAll("_", " ")} · Updated {new Date(project.updated_at).toLocaleDateString()}</small></div><span className={"project-status " + project.status}>{project.status.replaceAll("_", " ")}</span></article>)}</div>}
            </section>
            <section className="panel tools-panel" id="tools"><div className="panel-heading"><div><h2>AI tool connections</h2><p>Provider registry status from your database.</p></div><span className="connection-state">Registry ready</span></div>
              <div className="tool-row"><span className="tool-logo script">S</span><div><strong>Script & language</strong><small>Writing and creative direction</small></div><span className="connection-state">Awaiting setup</span></div>
              <div className="tool-row"><span className="tool-logo visual">V</span><div><strong>Image & video</strong><small>Visual development and motion</small></div><span className="connection-state">Awaiting setup</span></div>
              <div className="tool-row"><span className="tool-logo audio">A</span><div><strong>Voice & audio</strong><small>Narration, dialogue and sound</small></div><span className="connection-state">Awaiting setup</span></div>
              <div className="tools-footnote">Provider registration is separate from a verified API or browser connection. No provider is falsely marked as connected.</div>
            </section>
          </div>
          <footer className="footer"><span>© 2026 Cletus Tech Workspace</span><span>Private projects <b>·</b> Free-first architecture</span></footer>
        </div>
      </section>
      {showNewProject && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowNewProject(false); }}><form className="project-modal" onSubmit={createProject}><div className="modal-top"><div><p className="eyebrow">NEW WORKSPACE PROJECT</p><h2>Create a project</h2></div><button type="button" className="close-button" onClick={() => setShowNewProject(false)} aria-label="Close">×</button></div><label htmlFor="project-name">Project name</label><input id="project-name" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. The Last Sunrise" maxLength={140} required autoFocus /><label htmlFor="project-type">Production type</label><select id="project-type" value={projectType} onChange={event => setProjectType(event.target.value)}><option value="cinematic_video">Cinematic video</option><option value="short_film">Short film</option><option value="youtube">YouTube production</option><option value="advertisement">Advertisement</option><option value="animation">Animation</option><option value="podcast">Podcast / audio</option><option value="custom">Custom production</option></select><div className="modal-note">Your project will be saved to your Supabase account. Its scenes, prompts and media can be added as the production modules are completed.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewProject(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : "Create project →"}</button></div></form></div>}
    </main>
  );
}
