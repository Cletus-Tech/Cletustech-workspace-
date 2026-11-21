"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Project = { id:string; name:string; production_type:string; status:string; updated_at:string };
const stages = [["01","Creative brief","Shape the idea and direction.","✦"],["02","Script & storyboard","Build scenes and shot plans.","▤"],["03","Visual production","Create images and motion.","◈"],["04","Voice & sound","Bring the story to life.","♫"],["05","Edit & deliver","Review and export.","↗"]];
const labels:Record<string,string>={cinematic_video:"Cinematic video",short_film:"Short film",youtube:"YouTube production",advertisement:"Advertisement",animation:"Animation",podcast:"Podcast / audio",custom:"Custom production"};
const art=["art-violet","art-coral","art-cyan","art-amber"];

export default function Home(){
 const router=useRouter(); const supabase=createClient();
 const [user,setUser]=useState<User|null>(null); const [projects,setProjects]=useState<Project[]>([]);
 const [providerCount,setProviderCount]=useState(0); const [jobCount,setJobCount]=useState(0); const [loading,setLoading]=useState(true);
 const [showNewProject,setShowNewProject]=useState(false); const [projectName,setProjectName]=useState(""); const [projectType,setProjectType]=useState("cinematic_video");
 const [saving,setSaving]=useState(false); const [notice,setNotice]=useState(""); const [error,setError]=useState("");
 const loadWorkspace=useCallback(async()=>{
  const {data:{user:currentUser},error:authError}=await supabase.auth.getUser();
  if(authError||!currentUser){router.replace("/login");return;} setUser(currentUser);
  const [p,a,j]=await Promise.all([
   supabase.from("projects").select("id,name,production_type,status,updated_at").order("updated_at",{ascending:false}).limit(8),
   supabase.from("ai_providers").select("id",{count:"exact",head:true}).eq("is_enabled",true),
   supabase.from("production_jobs").select("id",{count:"exact",head:true}).in("status",["queued","running","waiting_for_approval"])
  ]);
  if(p.error)setError(p.error.message);else setProjects(p.data??[]);
  if(a.count!==null)setProviderCount(a.count);if(j.count!==null)setJobCount(j.count);setLoading(false);
 },[router,supabase]);
 useEffect(()=>{const frame=window.requestAnimationFrame(()=>{void loadWorkspace()});return()=>window.cancelAnimationFrame(frame)},[loadWorkspace]);
 async function createProject(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!user||!projectName.trim())return;setSaving(true);setError("");
  const {error:insertError}=await supabase.from("projects").insert({owner_id:user.id,name:projectName.trim(),production_type:projectType});
  setSaving(false);if(insertError){setError(insertError.message);return;}
  setNotice("Your new project has been saved to your workspace.");setProjectName("");setShowNewProject(false);await loadWorkspace();
 }
 async function signOut(){await supabase.auth.signOut();router.replace("/login")}
 if(loading)return <main className="creative-boot"><div className="creative-boot-orb">CT</div><strong>CLETUS TECH WORKSPACE</strong><span>Preparing your creative space</span><div className="creative-boot-track"><i/></div></main>;
 const firstName=user?.user_metadata?.display_name||user?.email?.split("@")[0]||"Creator";
 return <main className="app-frame creative-frame">
  <aside className="sidebar creative-sidebar">
   <a className="brand creative-brand" href="#overview"><span className="brand-mark">CT</span><span className="brand-copy"><strong>CLETUS TECH</strong><small>CREATIVE WORKSPACE</small></span></a>
   <div className="workspace-switch creative-switch"><span className="workspace-avatar">C</span><span><strong>Personal workspace</strong><small>Free-first plan</small></span><span className="chevron">⌄</span></div>
   <nav className="side-nav" aria-label="Main navigation">
    <div className="nav-group"><p className="nav-heading">YOUR SPACE</p><a className="nav-link active" href="#overview"><span className="nav-icon">⌂</span>Overview</a><a className="nav-link" href="#projects"><span className="nav-icon">▦</span>My projects</a><a className="nav-link" href="#pipeline"><span className="nav-icon">✧</span>Production studio</a><a className="nav-link" href="#assets"><span className="nav-icon">▧</span>Asset library</a></div>
    <div className="nav-group"><p className="nav-heading">AI WORKSPACE</p><Link className="nav-link" href="/tools"><span className="nav-icon">✳</span>AI tool manager</Link><a className="nav-link" href="#pipeline"><span className="nav-icon">⌘</span>Workflow centre</a><a className="nav-link" href="#connections"><span className="nav-icon">◎</span>Connections</a></div>
   </nav>
   <div className="sidebar-bottom"><div className="plan-card creative-plan"><span className="plan-dot"/><div><strong>Free-first workspace</strong><small>Build at your own pace</small></div></div><button className="nav-link signout-link" onClick={signOut}><span className="nav-icon">↗</span>Sign out</button><div className="profile-row creative-profile"><div className="profile-avatar">CT</div><div><strong>{firstName}</strong><small>{user?.email}</small></div></div></div>
  </aside>
  <section className="main-area creative-main" id="overview">
   <header className="topbar creative-topbar"><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>Overview</strong></div><div className="top-actions"><span className="system-status"><i/> Secure workspace</span><div className="top-avatar">CT</div></div></header>
   <div className="content creative-content">
    <section className="creative-hero">
     <div className="hero-copy"><span className="hero-kicker"><i/> YOUR IDEAS, IN THEIR ELEMENT</span><h1>Make something<br/><em>remarkable.</em></h1><p>Your creative world, from the first spark to the final frame. Plan, produce and bring every idea together in one place.</p><div className="hero-actions"><button className="hero-primary" onClick={()=>setShowNewProject(true)}><span>＋</span> Start a project <b>↗</b></button><a className="hero-secondary" href="#pipeline">Explore the workflow <span>→</span></a></div><div className="hero-proof"><span className="proof-avatars"><i>CT</i><i>AI</i><i>✦</i></span><span>A workspace built around your creative process</span></div></div>
     <div className="hero-art" aria-hidden="true"><div className="art-halo halo-one"/><div className="art-halo halo-two"/><div className="art-orb orb-main"/><div className="art-orb orb-small"/><div className="art-ribbon ribbon-one"/><div className="art-ribbon ribbon-two"/><div className="art-floating-card art-card-top"><span className="art-card-icon">✦</span><span><b>Creative direction</b><small>Ideas taking shape</small></span></div><div className="art-floating-card art-card-bottom"><span className="wave-bars"><i/><i/><i/><i/><i/><i/><i/></span><span><b>Production flow</b><small>One idea. Every stage.</small></span></div><span className="art-spark spark-one">✧</span><span className="art-spark spark-two">✦</span></div><div className="hero-glow"/>
    </section>
    {notice&&<div className="notice creative-notice" role="status">{notice}<button onClick={()=>setNotice("")}>Dismiss</button></div>}
    {error&&<div className="error-banner" role="alert">{error}<button onClick={()=>setError("")}>Dismiss</button></div>}
    <section className="quick-strip" aria-label="Workspace summary">
     <div className="quick-stat"><span className="quick-stat-icon stat-blue">▦</span><span><strong>{projects.length}</strong><small>Projects</small></span></div>
     <div className="quick-stat"><span className="quick-stat-icon stat-purple">✳</span><span><strong>{providerCount}</strong><small>Enabled AI tools</small></span></div>
     <div className="quick-stat"><span className="quick-stat-icon stat-coral">◷</span><span><strong>{jobCount}</strong><small>Active productions</small></span></div>
     <div className="quick-stat quick-stat-note"><span className="online-pulse"/><span><strong>All your work, together</strong><small>Private project space</small></span></div>
    </section>
    <section className="section-block" id="projects"><div className="section-title-row"><div><span className="section-kicker">YOUR CREATIVE SPACE</span><h2>Pick up where <em>you left off.</em></h2><p>Your latest projects, ready when inspiration strikes.</p></div><button className="section-link" onClick={()=>setShowNewProject(true)}>Create new <span>＋</span></button></div>
     {projects.length===0?<div className="empty-gallery"><div className="empty-gallery-art"><div className="empty-art-orb"/><span>✦</span><i>✧</i></div><div className="empty-gallery-copy"><span className="mini-kicker">A FRESH CANVAS</span><h3>Your next big idea starts here.</h3><p>Create your first production project. Your brief, scripts, scenes, visual references and exports will have a home of their own.</p><button className="empty-create" onClick={()=>setShowNewProject(true)}>Create your first project <span>→</span></button></div></div>
     :<div className="project-gallery">{projects.slice(0,4).map((project,index)=><Link className="creative-project-card" href={"/projects/"+project.id} key={project.id}><div className={"project-art "+art[index%art.length]}><span className="project-art-mark">{index===0?"✦":index===1?"◈":index===2?"✧":"◉"}</span><span className="project-art-type">{labels[project.production_type]||project.production_type.replaceAll("_"," ")}</span></div><div className="project-card-copy"><div><h3>{project.name}</h3><p>Updated {new Date(project.updated_at).toLocaleDateString()}</p></div><span className="project-card-arrow">↗</span></div><span className={"project-pill status-"+project.status.replaceAll("_","-")}>{project.status.replaceAll("_"," ")}</span></Link>)}</div>}
    </section>
    <section className="section-block" id="pipeline"><div className="section-title-row compact-title"><div><span className="section-kicker">THE CREATIVE JOURNEY</span><h2>From first thought to <em>final frame.</em></h2><p>A connected process that keeps your story and creative context intact.</p></div><span className="stage-count">05 <small>STAGES</small></span></div><div className="creative-pipeline">{stages.map(([number,name,detail,icon],index)=><div className={"creative-stage stage-tone-"+(index+1)} key={number}><div className="stage-icon">{icon}</div><span className="stage-index">{number}</span><h3>{name}</h3><p>{detail}</p><span className="stage-arrow">↗</span></div>)}</div></section>
    <section className="bottom-feature-grid"><div className="connection-feature" id="connections"><div className="connection-feature-copy"><span className="section-kicker">YOUR AI TOOLKIT</span><h2>Bring your favourite<br/><em>creative tools together.</em></h2><p>Manage providers, configure connections and choose the right tool for each stage of production.</p><Link href="/tools" className="feature-link">Manage AI tools <span>→</span></Link></div><div className="connection-orbit" aria-hidden="true"><i className="orbit-ring ring-a"/><i className="orbit-ring ring-b"/><b className="orbit-core">AI</b><span className="orbit-node node-a">✦</span><span className="orbit-node node-b">V</span><span className="orbit-node node-c">音</span></div><div className="connection-foot"><span><i/> {providerCount} enabled provider records</span><small>Registration is not the same as a verified connection.</small></div></div><div className="studio-note" id="assets"><div className="note-art"><span>✧</span><i/><b/></div><span className="section-kicker">MADE FOR THE LONG RUN</span><h2>Your creative process,<br/>without losing the thread.</h2><p>Keep scenes, character references, prompts and production decisions connected as your projects grow.</p><span className="note-tag">CREATIVE CONTINUITY <b>✦</b></span></div></section>
    <footer className="creative-footer"><span>© 2026 Cletus Tech Workspace</span><span>Made for ideas worth bringing to life <b>✦</b></span></footer>
   </div>
  </section>
  {showNewProject&&<div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowNewProject(false)}}><form className="project-modal creative-modal" onSubmit={createProject}><div className="modal-top"><div><p className="eyebrow">START SOMETHING NEW</p><h2>Create a project</h2></div><button type="button" className="close-button" onClick={()=>setShowNewProject(false)} aria-label="Close">×</button></div><label htmlFor="project-name">Give your project a name</label><input id="project-name" value={projectName} onChange={event=>setProjectName(event.target.value)} placeholder="e.g. The Last Sunrise" maxLength={140} required autoFocus/><label htmlFor="project-type">What are you creating?</label><select id="project-type" value={projectType} onChange={event=>setProjectType(event.target.value)}><option value="cinematic_video">Cinematic video</option><option value="short_film">Short film</option><option value="youtube">YouTube production</option><option value="advertisement">Advertisement</option><option value="animation">Animation</option><option value="podcast">Podcast / audio</option><option value="custom">Custom production</option></select><div className="modal-note">Your project is saved privately to your Supabase workspace. You can build its brief, scenes and creative assets as the studio modules become available.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowNewProject(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving?"Saving…":"Create project →"}</button></div></form></div>}
 </main>;
}
