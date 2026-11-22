"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownRight, ArrowRight, Award, BookOpen, Braces, Check,
  ChevronRight, CircleHelp, Code2, Command, Compass, Flame, Gauge, GraduationCap,
  LayoutDashboard, LockKeyhole, Menu, Play, Search, Settings2, ShieldCheck,
  Sparkles, Trophy, X, Zap
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Academy", icon: GraduationCap },
  { label: "Code Studio", icon: Code2 },
  { label: "Challenges", icon: Zap },
  { label: "Examinations", icon: ShieldCheck },
  { label: "Achievements", icon: Trophy },
];

const lessons = [
  { number: "01", title: "Getting started with Python", detail: "Environment, interpreter and your first program", duration: "18 min", status: "Ready" },
  { number: "02", title: "Variables and data types", detail: "Store, identify and work with information", duration: "24 min", status: "Locked" },
  { number: "03", title: "Operators and expressions", detail: "Build logic with Python operators", duration: "28 min", status: "Locked" },
];

function BrandMark() {
  return <div className="brand-mark"><span className="brand-angle">{"<"}</span><span className="brand-slash">/</span><span className="brand-angle">{">"}</span></div>;
}

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [started, setStarted] = useState(false);

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <BrandMark />
          <div><strong>syntax<span>studio</span></strong><small>THE LEARNING ENGINE</small></div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(({ label, icon: Icon }) => (
            label === "Academy" ? <Link key={label} href="/academy" className={`nav-item ${active === label ? "active" : ""}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></Link> : <button key={label} className={`nav-item ${active === label ? "active" : ""}`} onClick={() => { setActive(label); setMenuOpen(false); }}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{label === "Challenges" && <i className="nav-dot"/>}</button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mentor-card">
            <div className="mentor-icon"><Sparkles size={17}/></div>
            <div><strong>Studio guide</strong><span>Need a hand? Ask anytime.</span></div>
            <ChevronRight size={16}/>
          </div>
          <button className="nav-item"><Settings2 size={18}/><span>Settings</span></button>
          <div className="profile-mini">
            <div className="avatar">CU</div><div className="profile-copy"><strong>My profile</strong><span>Foundation learner</span></div><ChevronRight size={15}/>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation"/>}

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div>
          <div className="top-actions"><div className="search-box"><Search size={16}/><span>Search lessons, topics...</span><kbd>⌘ K</kbd></div><button className="help-button" aria-label="Help"><CircleHelp size={18}/></button><div className="top-avatar">CU</div></div>
        </header>

        <div className="content-wrap">
          <div className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line"/> YOUR NEXT CHAPTER STARTS HERE</div><h1>Build skills that <em>ship.</em></h1><p className="welcome-copy">A focused space to learn the craft, practise with purpose, and turn knowledge into proof.</p></div>
            <div className="date-chip"><span className="live-pulse"/> LEARNING MODE <span className="date-divider"/> 2026 / 27</div>
          </div>

          <section className="hero-panel">
            <div className="hero-grid"/>
            <div className="hero-content">
              <div className="hero-kicker"><span className="python-mark">Py</span> YOUR FIRST LEARNING PATH <span className="path-tag">FOUNDATION</span></div>
              <h2>Python<br/><span>Mastery</span></h2>
              <p>From your first line of code to confident problem-solving. Learn in stages, practise every concept, and earn each milestone.</p>
              <div className="hero-meta"><span><BookOpen size={15}/> 8 learning stages</span><span><Activity size={15}/> Practical-first</span><span><Gauge size={15}/> Beginner friendly</span></div>
              <Link className="primary-button" href="/academy">{started ? "Continue learning" : "Enter the academy"} <ArrowRight size={17}/></Link>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/>
              <div className="code-tile tile-back"><span>def</span><b>learn()</b><small>return growth</small></div>
              <div className="code-tile tile-front"><div className="tile-top"><i/><i/><i/><span>main.py</span></div><div className="code-lines"><span><b>01</b> <i>class</i> Syntax:</span><span><b>02</b> &nbsp; skill = <em>"curiosity"</em></span><span><b>03</b> &nbsp; build(skill)</span><span><b>04</b> <i>print</i>(<em>"Hello, world"</em>)</span></div><div className="tile-status"><span><Check size={12}/> READY TO RUN</span><span>PY 3.12</span></div></div>
              <div className="floating-orb"><Braces size={25}/></div>
            </div>
            <div className="hero-index">01 <span>/</span> 08</div>
          </section>

          <div className="section-heading"><div><div className="eyebrow">YOUR PROGRESS</div><h3>A little progress, every day.</h3></div><Link className="text-button" href="/academy">View learning path <ArrowRight size={15}/></Link></div>
          <div className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span className="stat-icon blue"><Zap size={17}/></span><span className="stat-caption">TOTAL EXPERIENCE</span></div><div className="stat-value">000 <small>XP</small></div><div className="stat-foot"><span>Earn XP as you learn</span><ArrowDownRight size={15}/></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><Flame size={17}/></span><span className="stat-caption">LEARNING STREAK</span></div><div className="stat-value">0 <small>days</small></div><div className="stat-foot"><span>Start your first streak</span><span className="muted">—</span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><Award size={17}/></span><span className="stat-caption">SKILLS MASTERED</span></div><div className="stat-value">0 <small>/ 8</small></div><div className="stat-foot"><span>Milestones await</span><span className="muted">—</span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon green"><Trophy size={17}/></span><span className="stat-caption">ACHIEVEMENTS</span></div><div className="stat-value">0 <small>earned</small></div><div className="stat-foot"><span>Your gallery is waiting</span><span className="muted">—</span></div></article>
          </div>

          <div className="lower-grid">
            <section className="panel learning-panel">
              <div className="panel-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h3>Next in your pathway</h3></div><span className="stage-count">STAGE 01 / 08</span></div>
              <div className="path-progress"><div className="path-progress-fill"/></div>
              <div className="lesson-list">{lessons.map((lesson, index) => <div className={`lesson-row ${index > 0 ? "lesson-locked" : ""}`} key={lesson.number}><div className="lesson-number">{lesson.number}</div><div className="lesson-info"><strong>{lesson.title}</strong><span>{lesson.detail}</span></div><span className="lesson-time">{lesson.duration}</span>{index === 0 ? <Link className="lesson-play" href="/academy/python-foundations" aria-label="Start lesson"><Play size={14} fill="currentColor"/></Link> : <LockKeyhole className="lock-icon" size={16}/>}</div>)}</div>
              <Link className="panel-link" href="/academy">Explore the full pathway <ArrowRight size={15}/></Link>
            </section>
            <section className="panel focus-panel">
              <div className="panel-heading"><div><div className="eyebrow">YOUR DAILY FOCUS</div><h3>Make today count.</h3></div><div className="focus-symbol"><Compass size={19}/></div></div>
              <div className="focus-visual"><div className="focus-ring"><span>01</span><small>STEP</small></div><div className="focus-copy"><strong>One concept.<br/>One practical.</strong><span>Small, consistent progress builds real skill.</span></div></div>
              <div className="focus-footer"><span><Command size={14}/> 20–30 MIN SESSION</span><Link href="/academy">Begin <ArrowRight size={14}/></Link></div>
            </section>
          </div>

          <footer className="footer-line"><span>SYNTAX STUDIO <i>·</i> LEARN WITH INTENTION.</span><span>BUILT FOR THE LONG GAME <span className="footer-spark">✳</span></span></footer>
        </div>
      </section>
      {showWelcome && <div className="welcome-toast"><div className="toast-mark"><Sparkles size={17}/></div><div><strong>Welcome to Syntax Studio</strong><span>Your learning workspace is taking shape.</span></div><button onClick={() => setShowWelcome(false)} aria-label="Dismiss welcome"><X size={15}/></button></div>}
    </main>
  );
}
