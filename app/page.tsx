"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Activity, ArrowRight, Award, Bell, BookOpen, Braces, ChevronRight,
  CircleHelp, Code2, Flame, GraduationCap, Home, LayoutDashboard,
  Medal, Menu, Play, Rocket, Search, Settings, ShieldCheck, Sparkles,
  Target, Trophy, Users, X, Zap
} from "lucide-react";

const navigation = [
  { label: "Dashboard", sub: "Empire Hall", icon: Home, href: "/" },
  { label: "Academy", sub: "Courses & paths", icon: GraduationCap, href: "/academy" },
  { label: "Code Studio", sub: "Practice live", icon: Code2 },
  { label: "Challenge Arena", sub: "Daily challenges", icon: Target },
  { label: "Examination Centre", sub: "Test & assess", icon: ShieldCheck },
  { label: "Trophy Gallery", sub: "Achievements", icon: Medal },
  { label: "Leaderboard", sub: "Rankings", icon: Activity },
  { label: "Showcase Room", sub: "Projects", icon: Rocket },
];

const courses = [
  { title: "Python for Beginners", detail: "From zero to hero", level: "BEGINNER", rating: "4.9", students: "12.5k", symbol: "Py", tone: "python" },
  { title: "Web Development", detail: "Build for the web", level: "INTERMEDIATE", rating: "4.8", students: "8.7k", symbol: "</>", tone: "web" },
  { title: "Data Structures", detail: "Think in systems", level: "ADVANCED", rating: "4.9", students: "6.3k", symbol: "◇", tone: "data" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState("Global");
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <main className="ss-app">
      <aside className={`ss-sidebar ${menuOpen ? "ss-sidebar-open" : ""}`}>
        <Link href="/" className="ss-brand"><span className="ss-brand-mark">S</span><span>Syntax<strong>Studio</strong></span></Link>
        <div className="ss-nav-label">LEARNING SPACE</div>
        <nav className="ss-nav">
          {navigation.map(({label,sub,icon:Icon,href}) => href ? <Link key={label} href={href} onClick={()=>setMenuOpen(false)} className={`ss-nav-item ${label==="Dashboard"?"selected":""}`}><Icon/><span><b>{label}</b><small>{sub}</small></span></Link> : <button key={label} type="button" className="ss-nav-item ss-nav-planned" onClick={()=>setNotice(true)}><Icon/><span><b>{label}</b><small>{sub}</small></span></button>)}
        </nav>
        <div className="ss-sidebar-promo"><div className="ss-promo-crown">♛</div><div><b>Go Premium</b><small>Unlock more features<br/>and rewards.</small></div><span className="ss-premium-tag">COMING SOON</span></div>
        <div className="ss-account">
          <div className="ss-avatar">{userEmail ? userEmail.slice(0,2).toUpperCase() : "CU"}</div>
          <div><b>{userEmail || "Cletus Ogiji"}</b><small>{userEmail ? "Learner account" : "Master learner"}</small></div>
          {userEmail ? <button onClick={signOut} aria-label="Sign out"><X size={15}/></button> : <Link href="/login" aria-label="Sign in"><ChevronRight size={17}/></Link>}
        </div>
      </aside>
      {menuOpen && <button className="ss-scrim" onClick={()=>setMenuOpen(false)} aria-label="Close menu"/>}
      <section className="ss-main">
        <header className="ss-topbar">
          <button className="ss-mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><Menu/></button>
          <div className="ss-search"><Search/><span>Search courses, lessons, challenges...</span><kbd>Ctrl + K</kbd></div>
          <div className="ss-top-actions"><span className="ss-online"><i/>Online</span><button className="ss-bell" onClick={()=>setNotice(true)} aria-label="Notifications"><Bell/><i>3</i></button><Link href="/login" className="ss-top-avatar">{userEmail ? userEmail.slice(0,2).toUpperCase() : "CU"}</Link></div>
        </header>
        <div className="ss-content">
          <section className="ss-hero">
            <div className="ss-hero-copy">
              <span className="ss-welcome-pill">WELCOME BACK</span>
              <h1>Cletus Ogiji<span className="ss-verified">✓</span></h1>
              <p>Keep coding. Keep growing. You're on the right path to becoming a top developer.</p>
              <Link href="/academy" className="ss-primary"><Play size={15} fill="currentColor"/> Continue Learning <ArrowRight size={17}/></Link>
              <div className="ss-hero-quote">“Dream it. Code it. Build it.” <small>— Syntax Studio</small></div>
            </div>
            <div className="ss-hero-visual" aria-hidden="true">
              <div className="ss-glow ss-glow-one"/><div className="ss-glow ss-glow-two"/>
              <div className="ss-dev-card"><div className="ss-dev-top"><i/><i/><i/><span>main.py</span></div><pre><em>def</em> build_future():{"\n"}  skills = <strong>learn()</strong>{"\n"}  <em>return</em> skills</pre><div className="ss-dev-bottom"><span>● ENVIRONMENT READY</span><span>PY 3.12</span></div></div>
              <div className="ss-python-orb">Py</div><div className="ss-code-orb"><Braces/></div>
              <div className="ss-visual-caption">BUILD SOMETHING<br/><b>THAT MATTERS.</b></div>
            </div>
          </section>

          <section className="ss-overview-grid">
            <article className="ss-rank-card"><span className="ss-card-kicker">YOUR RANK</span><div className="ss-rank-emblem"><Medal/></div><h2>Initiate</h2><p>Your journey starts here.</p><div className="ss-xp-track"><i/></div><small>0 / 500 XP <span>LEVEL 01</span></small></article>
            <article className="ss-streak-card"><span className="ss-card-kicker">LEARNING STREAK</span><div className="ss-streak-art"><Flame/></div><strong>Start your streak</strong><p>Build a little momentum every day.</p><div className="ss-week"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></article>
          </section>

          <section className="ss-primary-grid">
            <article className="ss-panel ss-continue">
              <div className="ss-panel-head"><div><span className="ss-card-kicker">PICK UP WHERE YOU LEFT OFF</span><h2><BookOpen/> Continue Learning</h2></div><span className="ss-course-chip">PYTHON MASTERY</span></div>
              <div className="ss-lesson-card"><div className="ss-lesson-art"><div className="ss-python-large">Py</div><span>PYTHON FOUNDATIONS</span></div><div className="ss-lesson-info"><h3>Python Foundations</h3><p>Module 1 · Lesson 1</p><b>Getting started with Python</b><div className="ss-progress"><i/></div><small>Ready to begin <span>18 min</span></small><Link href="/academy/python-foundations">Start lesson <ArrowRight size={15}/></Link></div></div>
            </article>
            <article className="ss-panel ss-progress-panel"><div className="ss-panel-head"><div><span className="ss-card-kicker">YOUR JOURNEY</span><h2><Activity/> Your Progress</h2></div><span className="ss-muted-label">NEW LEARNER</span></div><div className="ss-progress-empty"><div className="ss-progress-ring"><span>0<small>%</small></span></div><div><b>Your story starts here.</b><p>Complete your first lesson to begin tracking your progress.</p><Link href="/academy">View pathway <ArrowRight size={14}/></Link></div></div><div className="ss-mini-stats"><span><Zap/> 0 XP</span><span><Award/> 0 awards</span><span><BookOpen/> 0 lessons</span></div></article>
          </section>

          <section className="ss-lower-grid">
            <article className="ss-panel ss-courses"><div className="ss-panel-head"><div><span className="ss-card-kicker">EXPLORE THE ACADEMY</span><h2><GraduationCap/> Recommended Courses</h2></div><Link href="/academy">Explore all <ArrowRight size={14}/></Link></div><div className="ss-course-grid">{courses.map(course=><div className="ss-course-card" key={course.title}><div className={`ss-course-art ${course.tone}`}><span>{course.symbol}</span><small>{course.level}</small></div><h3>{course.title}</h3><p>{course.detail}</p><div className="ss-course-rating">★ {course.rating} <span>· {course.students} learners</span></div><Link href="/academy">Explore course <ArrowRight size={14}/></Link></div>)}</div></article>
            <article className="ss-panel ss-activity"><div className="ss-panel-head"><div><span className="ss-card-kicker">YOUR LEARNING HISTORY</span><h2><Zap/> Recent Activity</h2></div></div><div className="ss-empty-activity"><div className="ss-empty-icon"><Sparkles/></div><b>Your activity will appear here.</b><p>Lessons, exercises and achievements will build your learning history.</p><Link href="/academy">Start learning <ArrowRight size={14}/></Link></div></article>
            <article className="ss-panel ss-leaderboard"><div className="ss-panel-head"><div><span className="ss-card-kicker">THE COMMUNITY</span><h2><Trophy/> Leaderboard</h2></div></div><div className="ss-leader-tabs">{["Global","Weekly","Monthly"].map(tab=><button key={tab} className={leaderboard===tab?"active":""} onClick={()=>setLeaderboard(tab)}>{tab}</button>)}</div><div className="ss-leader-empty"><Users/><b>Your competition starts soon.</b><p>Rankings will appear when verified challenge results are available.</p></div></article>
          </section>
          <footer className="ss-footer"><div className="ss-footer-mark"><Code2/></div><div><b>Learn. Practise. Build. Prove. Advance.</b><small>Build real skills, one line at a time.</small></div><Link href="/academy">Explore the Academy <ArrowRight size={16}/></Link></footer>
        </div>
      </section>
      {notice && <div className="ss-notice" role="status"><Sparkles/><div><b>You're viewing the design preview.</b><small>This area will become interactive as its feature is implemented.</small></div><button onClick={()=>setNotice(false)} aria-label="Dismiss"><X size={15}/></button></div>}
    </main>
  );
}
