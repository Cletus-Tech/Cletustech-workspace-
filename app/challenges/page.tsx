"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Braces, CheckCircle2, Clock3, Code2, Flame, LockKeyhole, Search, ShieldCheck, Sparkles, Target, Trophy, Zap } from "lucide-react";

const challenges = [
  { id:"hello", title:"The first introduction", category:"Foundations", level:"Beginner", time:"5 min", tag:"START HERE", description:"Create a short program that introduces you and prints three things you want to learn.", skills:["print()","Strings","Variables"], prompt:"Write a program that stores your name in a variable, then prints a friendly introduction.", accent:"blue" },
  { id:"calculator", title:"Pocket calculator", category:"Logic", level:"Beginner", time:"10 min", tag:"LOGIC BUILDER", description:"Use arithmetic operators to calculate and display the result of two numbers.", skills:["Numbers","Operators","Output"], prompt:"Create two number variables. Display their sum, difference and product.", accent:"violet" },
  { id:"temperature", title:"Temperature converter", category:"Logic", level:"Beginner", time:"12 min", tag:"REAL-WORLD TASK", description:"Turn a temperature in Celsius into Fahrenheit using a simple formula.", skills:["Variables","Arithmetic","Formula"], prompt:"Use the formula F = (C × 9/5) + 32 and print the converted temperature.", accent:"gold" },
  { id:"odd-even", title:"Odd or even?", category:"Logic", level:"Beginner", time:"12 min", tag:"CONDITIONALS", description:"Make a program decide whether a number is odd or even.", skills:["if / else","Modulo","Booleans"], prompt:"Check a number with the modulo operator and print whether it is odd or even.", accent:"blue" },
  { id:"countdown", title:"Countdown sequence", category:"Loops", level:"Intermediate", time:"15 min", tag:"LOOP CONTROL", description:"Use a loop to count down from ten and finish with a launch message.", skills:["for loop","range()","Sequence"], prompt:"Print 10 down to 1, then print 'Launch!'.", accent:"violet" },
  { id:"gradebook", title:"Mini gradebook", category:"Data", level:"Intermediate", time:"20 min", tag:"DATA HANDLING", description:"Store a few scores and calculate their average with a clear result.", skills:["Lists","sum()","len()"], prompt:"Create a list of scores and calculate the average without hard-coding the answer.", accent:"gold" },
];

const filters = ["All challenges","Foundations","Logic","Loops","Data"];

export default function ChallengeArenaPage() {
  const [filter,setFilter] = useState("All challenges");
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState(challenges[0]);
  const visible = useMemo(() => challenges.filter(item => (filter==="All challenges" || item.category===filter) && (item.title+" "+item.description+" "+item.skills.join(" ")).toLowerCase().includes(search.toLowerCase())),[filter,search]);

  return <main className="ss-app academy-app arena-app">
    <aside className="ss-sidebar">
      <Link href="/" className="ss-brand"><span className="ss-brand-mark">S</span><span>Syntax<strong>Studio</strong></span></Link>
      <div className="ss-nav-label">LEARNING SPACE</div>
      <nav className="ss-nav">
        <Link className="ss-nav-item" href="/"><span>⌂</span><span><b>Dashboard</b><small>Empire Hall</small></span></Link>
        <Link className="ss-nav-item" href="/academy"><BookOpen/><span><b>Academy</b><small>Courses & paths</small></span></Link>
        <Link className="ss-nav-item" href="/academy/python-foundations"><Code2/><span><b>Learning Room</b><small>Python foundations</small></span></Link>
        <Link className="ss-nav-item" href="/studio"><Braces/><span><b>Code Studio</b><small>Practice workspace</small></span></Link>
        <Link className="ss-nav-item selected" href="/challenges"><Target/><span><b>Challenge Arena</b><small>Practice missions</small></span></Link>
      </nav>
      <div className="arena-sidebar-card"><Trophy/><b>Earn your rank.</b><p>Verified assessments will power your XP, awards and leaderboard position.</p><span>RANKING SYSTEM IN DEVELOPMENT</span></div>
      <div className="ss-account"><div className="ss-avatar">SS</div><div><b>Syntax learner</b><small>Practice workspace</small></div></div>
    </aside>
    <section className="ss-main">
      <header className="ss-topbar"><Link href="/" className="academy-back"><ArrowLeft size={15}/> Dashboard</Link><div className="ss-top-actions"><span className="ss-online"><i/>Challenge Arena</span><span className="ss-top-avatar">SS</span></div></header>
      <div className="arena-content">
        <div className="arena-hero">
          <div className="arena-hero-copy"><span className="ss-welcome-pill"><Target size={12}/> THE PRACTICE GROUNDS</span><h1>Challenge <em>Arena.</em></h1><p>Turn what you learn into something you can build. Take on focused coding missions, one skill at a time.</p><div className="arena-hero-meta"><span><Code2/> Python track</span><span><ShieldCheck/> Skill-first practice</span><span><Flame/> Build consistency</span></div></div>
          <div className="arena-hero-art"><div className="arena-ring ring-one"/><div className="arena-ring ring-two"/><div className="arena-target"><Target/></div><span className="arena-art-label">MISSION<br/><b>CONTROL</b></span><span className="arena-art-orbit">01 / 06</span></div>
        </div>
        <div className="arena-stats">
          <div><span>AVAILABLE MISSIONS</span><b>{challenges.length.toString().padStart(2,"0")}</b><small>Across four skill areas</small></div>
          <div><span>VERIFIED COMPLETIONS</span><b>—</b><small>Assessment system pending</small></div>
          <div><span>RANK & XP</span><b>LOCKED</b><small>Earned only from verified work</small></div>
        </div>
        <div className="arena-section-head"><div><span className="ss-card-kicker">SELECT YOUR NEXT MOVE</span><h2>Mission board</h2><p>Choose a challenge that matches the skill you want to strengthen.</p></div><div className="arena-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a mission…"/></div></div>
        <div className="arena-filter-row">{filters.map(item=><button type="button" key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item}</button>)}</div>
        <div className="arena-layout">
          <div className="arena-mission-grid">{visible.map((item)=><article key={item.id} className={`arena-mission-card ${item.accent} ${selected.id===item.id?"focused":""}`}><div className="arena-mission-top"><span>{item.tag}</span><span className="arena-mission-index">{String(challenges.indexOf(item)+1).padStart(2,"0")}</span></div><div className="arena-mission-symbol">{item.id==="hello"?<Braces/>:item.id==="calculator"?<Code2/>:item.id==="temperature"?<Zap/>:item.id==="odd-even"?<Target/>:item.id==="countdown"?<Clock3/>:<BookOpen/>}</div><h3>{item.title}</h3><p>{item.description}</p><div className="arena-skill-tags">{item.skills.map(skill=><span key={skill}>{skill}</span>)}</div><div className="arena-mission-foot"><span>{item.level} <i/> {item.time}</span><button type="button" onClick={()=>setSelected(item)}>{selected.id===item.id?"Selected":"View mission"} <ArrowRight/></button></div></article>)}</div>
          <aside className="arena-detail-panel"><div className="arena-detail-top"><span><Sparkles/> MISSION BRIEF</span><small>{String(challenges.indexOf(selected)+1).padStart(2,"0")} / 06</small></div><span className="ss-card-kicker">{selected.tag}</span><h3>{selected.title}</h3><p>{selected.description}</p><div className="arena-detail-divider"/><span className="arena-detail-label">YOUR OBJECTIVE</span><div className="arena-objective"><CheckCircle2/>{selected.prompt}</div><span className="arena-detail-label">SKILLS IN FOCUS</span><div className="arena-detail-skills">{selected.skills.map(skill=><span key={skill}>{skill}</span>)}</div><div className="arena-detail-note"><LockKeyhole/><span>Completion and rewards will be recorded only after secure assessment is connected. This practice board does not award XP yet.</span></div><Link href="/studio" className="arena-start-button">Open Code Studio <ArrowRight/></Link></aside>
        </div>
        {visible.length===0 && <div className="arena-empty">No missions match that search. Try another keyword or category.</div>}
        <div className="arena-footnote">These are practice missions, not graded examinations. Your code can be explored in Code Studio; no completion, certificate or leaderboard score is issued by this preview.</div>
      </div>
    </section>
  </main>;
}
