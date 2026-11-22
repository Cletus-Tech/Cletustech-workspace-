import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Code2, LockKeyhole, Play, Sparkles } from "lucide-react";

const stages = [
  ["01","Python foundations","What Python is, how it runs, and the tools used to build programs.","3 lessons","1.5 hrs","available"],
  ["02","Syntax & program structure","Statements, indentation, case sensitivity and clean code structure.","4 lessons","2 hrs","locked"],
  ["03","Variables & data types","Store information and understand Python's core value types.","5 lessons","2.5 hrs","locked"],
  ["04","Operators & expressions","Build expressions with arithmetic, comparison and logical operators.","5 lessons","2.5 hrs","locked"],
  ["05","Input, output & conversion","Receive input, display results and convert between data types.","4 lessons","2 hrs","locked"],
  ["06","Comments & functions","Write readable code and organise reusable instructions.","4 lessons","2 hrs","locked"],
  ["07","Modules & Python help","Import modules and discover Python's built-in tools.","3 lessons","1.5 hrs","locked"],
  ["08","Files & practical programming","Work with files and combine your skills in useful programs.","5 lessons","4 hrs","locked"],
];

export default function AcademyPage() {
  return <main className="ss-app academy-app">
    <aside className="ss-sidebar">
      <Link href="/" className="ss-brand"><span className="ss-brand-mark">S</span><span>Syntax<strong>Studio</strong></span></Link>
      <div className="ss-nav-label">LEARNING SPACE</div>
      <nav className="ss-nav">
        <Link className="ss-nav-item" href="/"><span>⌂</span><span><b>Dashboard</b><small>Empire Hall</small></span></Link>
        <Link className="ss-nav-item selected" href="/academy"><span>▤</span><span><b>Academy</b><small>Courses & paths</small></span></Link>
        <Link className="ss-nav-item" href="/academy/python-foundations"><span>⌘</span><span><b>Learning Room</b><small>Resume lesson</small></span></Link>
      <Link className="ss-nav-item" href="/studio"><span>⌘</span><span><b>Code Studio</b><small>Practice live</small></span></Link></nav>
      <div className="ss-account"><div className="ss-avatar">SS</div><div><b>Syntax learner</b><small>Learning workspace</small></div></div>
    </aside>
    <section className="ss-main">
      <header className="ss-topbar"><Link href="/" className="academy-back">← Dashboard</Link><div className="ss-top-actions"><span className="ss-online"><i/>Academy</span><span className="ss-top-avatar">SS</span></div></header>
      <div className="ss-content academy-content">
        <div className="academy-intro"><div><span className="ss-welcome-pill">THE LEARNING ENGINE</span><h1>Build skills that<br/><em>move you forward.</em></h1><p>Structured learning paths. Real programming practice. Progress you can prove.</p></div><div className="academy-intro-art"><div className="academy-orbit"></div><div className="academy-python">Py</div><div className="academy-art-label">PYTHON<br/><b>MASTERY</b></div></div></div>
        <div className="academy-section-title"><div><span className="ss-card-kicker">YOUR STARTING POINT</span><h2>Featured learning path</h2></div><span className="academy-status">FOUNDATION TRACK</span></div>
        <article className="academy-feature">
          <div className="academy-feature-art"><div className="academy-code-window"><div><i/><i/><i/><span>first_program.py</span></div><pre><b>def</b> <em>learn_python</em>():{"\n"}  skills = <strong>build()</strong>{"\n"}  <b>return</b> skills</pre><small>PYTHON 3.12 · BEGINNER</small></div><span className="academy-feature-number">01</span></div>
          <div className="academy-feature-copy"><span className="ss-card-kicker">BEGINNER · 8 STAGES</span><h2>Python Mastery</h2><p>Start with the foundations, understand the language and gradually develop the confidence to write complete programs.</p><div className="academy-feature-meta"><span><BookOpen/> 33 lessons planned</span><span><Clock3/> 18 hours estimated</span><span><Code2/> Practical exercises</span></div><div className="academy-draft-note"><Sparkles/> Curriculum is being checked against your CSC 201 lecture material before publication.</div><Link href="/academy/python-foundations" className="ss-primary"><Play size={14} fill="currentColor"/> Enter learning room <ArrowRight size={16}/></Link></div>
        </article>
        <div className="academy-section-title"><div><span className="ss-card-kicker">THE CURRICULUM</span><h2>Your Python pathway</h2></div><span className="academy-status">8 STAGES</span></div>
        <div className="academy-stage-grid">{stages.map(([number,title,desc,lessons,time,status])=><article className={`academy-stage ${status}`} key={number}><div className="academy-stage-top"><span>{number}</span>{status==="available"?<b>AVAILABLE</b>:<LockKeyhole size={15}/>}</div><h3>{title}</h3><p>{desc}</p><div className="academy-stage-bottom"><span>{lessons}</span><span>{time}</span>{status==="available"?<Link href="/academy/python-foundations" aria-label="Open Python foundations"><ArrowRight size={16}/></Link>:<span className="academy-lock">Locked</span>}</div></article>)}</div>
        <p className="academy-footnote">This is a draft learning pathway. Later stages remain unavailable until their lessons and assessments are reviewed. Opening a lesson does not award XP or mark a course complete.</p>
      </div>
    </section>
  </main>;
}
