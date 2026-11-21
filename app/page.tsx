"use client";

import { useState } from "react";

const navigation = [
  { section: "WORKSPACE", items: [{ label: "Overview", icon: "◫", href: "#overview" }, { label: "My projects", icon: "▤", href: "#projects" }, { label: "Production studio", icon: "◉", href: "#studio" }, { label: "Asset library", icon: "▧", href: "#assets" }] },
  { section: "INTELLIGENCE", items: [{ label: "AI tool manager", icon: "✳", href: "#tools" }, { label: "Workflow centre", icon: "⌘", href: "#workflows" }, { label: "Account profiles", icon: "◎", href: "#accounts" }] }
];

const stages = [
  { number: "01", name: "Creative direction", detail: "Shape the idea and define the brief", state: "Ready to begin" },
  { number: "02", name: "Script & storyboard", detail: "Develop scenes, dialogue and shot plans", state: "Awaiting project" },
  { number: "03", name: "Visual production", detail: "Create consistent characters and scenes", state: "Awaiting project" },
  { number: "04", name: "Audio & voice", detail: "Narration, dialogue, music and effects", state: "Awaiting project" },
  { number: "05", name: "Edit & delivery", detail: "Assemble, review and export the final cut", state: "Awaiting project" }
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("Cinematic video");
  const [notice, setNotice] = useState("");

  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    setNotice(`“${projectName.trim()}” is ready to be added when project storage is connected.`);
    setShowNewProject(false);
    setProjectName("");
  }

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActive("Overview")}>
          <span className="brand-mark">CT</span>
          <span className="brand-copy"><strong>CLETUS TECH</strong><small>WORKSPACE</small></span>
        </a>
        <div className="workspace-switch"><span className="workspace-avatar">C</span><span><strong>Personal workspace</strong><small>Free workspace</small></span><span className="chevron">⌄</span></div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(group => <div className="nav-group" key={group.section}>
            <p className="nav-heading">{group.section}</p>
            {group.items.map(item => <a key={item.label} href={item.href} className={active === item.label ? "nav-link active" : "nav-link"} onClick={() => setActive(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}</a>)}
          </div>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card"><span className="plan-dot" /><div><strong>Free plan</strong><small>Built to grow with you</small></div><span className="plan-arrow">↗</span></div>
          <a href="#settings" className="nav-link" onClick={() => setActive("Settings")}><span className="nav-icon">⚙</span>Settings</a>
          <div className="profile-row"><div className="profile-avatar">CT</div><div><strong>Cletus Tech</strong><small>Workspace owner</small></div><span className="more">···</span></div>
        </div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
          <div className="top-actions"><span className="system-status"><i /> All systems ready</span><button className="icon-button" aria-label="Notifications">♧</button><div className="top-avatar">CT</div></div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div><p className="eyebrow">YOUR CREATIVE CONTROL ROOM</p><h1>Good to have you here.</h1><p className="subheading">Turn your ideas into finished productions, with every stage connected.</p></div>
            <button className="primary-button" onClick={() => setShowNewProject(true)}><span>＋</span> New project</button>
          </div>

          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}

          <div className="metric-grid">
            <div className="metric-card"><div className="metric-top"><span>ACTIVE PROJECTS</span><span className="metric-symbol">▤</span></div><strong>—</strong><small>No projects created yet</small></div>
            <div className="metric-card"><div className="metric-top"><span>CONNECTED AI TOOLS</span><span className="metric-symbol">✳</span></div><strong>0</strong><small>Connect providers as you need them</small></div>
            <div className="metric-card"><div className="metric-top"><span>PRODUCTION TASKS</span><span className="metric-symbol">⌘</span></div><strong>0</strong><small>Your workflow activity will appear here</small></div>
            <div className="metric-card"><div className="metric-top"><span>STORAGE USED</span><span className="metric-symbol">▧</span></div><strong>—</strong><small>Storage activates with your first asset</small></div>
          </div>

          <div className="section-heading"><div><p className="eyebrow">PRODUCTION PIPELINE</p><h2>From idea to final delivery</h2><p className="section-description">A connected process. Your project context follows every stage.</p></div><span className="pipeline-label"><i /> 5 stages</span></div>
          <div className="pipeline-grid">{stages.map((stage, index) => <div className="stage-card" key={stage.number}><div className="stage-top"><span className="stage-number">{stage.number}</span>{index < stages.length - 1 && <span className="stage-connector" />}</div><h3>{stage.name}</h3><p>{stage.detail}</p><span className="stage-state">{stage.state}</span></div>)}</div>

          <div className="lower-grid">
            <section className="panel projects-panel" id="projects">
              <div className="panel-heading"><div><h2>Recent projects</h2><p>Your latest creative work in one place.</p></div><button className="text-button" onClick={() => setShowNewProject(true)}>Create project <span>↗</span></button></div>
              <div className="empty-projects"><div className="empty-icon">▤</div><strong>Your production space starts here</strong><p>Create a project to keep its brief, scripts, scenes, AI outputs and final exports together.</p><button className="secondary-button" onClick={() => setShowNewProject(true)}>＋ Create your first project</button></div>
            </section>
            <section className="panel tools-panel" id="tools">
              <div className="panel-heading"><div><h2>AI tool connections</h2><p>Choose the right engine for each task.</p></div><a href="#tools" className="text-button" onClick={() => setActive("AI tool manager")}>Manage <span>↗</span></a></div>
              <div className="tool-row"><span className="tool-logo script">S</span><div><strong>Script & language</strong><small>Writing and creative direction</small></div><span className="connection-state">Not connected</span></div>
              <div className="tool-row"><span className="tool-logo visual">V</span><div><strong>Image & video</strong><small>Visual development and motion</small></div><span className="connection-state">Not connected</span></div>
              <div className="tool-row"><span className="tool-logo audio">A</span><div><strong>Voice & audio</strong><small>Narration, dialogue and sound</small></div><span className="connection-state">Not connected</span></div>
              <div className="tools-footnote"><span>ⓘ</span> Providers will only show as connected after a real connection is verified.</div>
            </section>
          </div>
          <footer className="footer"><span>© 2026 Cletus Tech Workspace</span><span>Built for focused creative production <b>·</b> Free-first architecture</span></footer>
        </div>
      </section>

      {showNewProject && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowNewProject(false); }}><form className="project-modal" onSubmit={createProject}><div className="modal-top"><div><p className="eyebrow">NEW WORKSPACE PROJECT</p><h2>Create a project</h2></div><button type="button" className="close-button" onClick={() => setShowNewProject(false)} aria-label="Close">×</button></div><label htmlFor="project-name">Project name</label><input id="project-name" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. The Last Sunrise" required autoFocus /><label htmlFor="project-type">Production type</label><select id="project-type" value={projectType} onChange={event => setProjectType(event.target.value)}><option>Cinematic video</option><option>Short film</option><option>YouTube production</option><option>Advertisement</option><option>Animation</option><option>Podcast / audio</option><option>Custom production</option></select><div className="modal-note">This first interface milestone is in place. Project saving will be enabled when we connect the database layer.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewProject(false)}>Cancel</button><button type="submit" className="primary-button">Continue <span>→</span></button></div></form></div>}
    </main>
  );
}