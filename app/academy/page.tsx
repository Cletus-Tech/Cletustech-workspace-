import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, LockKeyhole } from "lucide-react";

const modules = [
  { title: "Python foundations", description: "Understand what Python is, how it runs, and the tools used to write and execute programs.", lessons: "3 lessons", time: "1.5 hours", open: true },
  { title: "Syntax and program structure", description: "Learn statements, indentation, case sensitivity, comments, and how Python code is organised.", lessons: "4 lessons", time: "2 hours" },
  { title: "Variables and data types", description: "Name values, recognise core data types, and work confidently with stored information.", lessons: "5 lessons", time: "2.5 hours" },
  { title: "Operators and expressions", description: "Use arithmetic, comparison, logical, and assignment operators to build expressions.", lessons: "5 lessons", time: "2.5 hours" },
  { title: "Input, output and conversion", description: "Receive user input, display results, and convert values between data types.", lessons: "4 lessons", time: "2 hours" },
  { title: "Comments and functions", description: "Document your code and break programs into reusable functions.", lessons: "4 lessons", time: "2 hours" },
  { title: "Modules and Python help", description: "Import modules and use built-in help resources to explore Python capabilities.", lessons: "3 lessons", time: "1.5 hours" },
  { title: "Files and practical programming", description: "Work with files and combine your skills in small practical programs.", lessons: "5 lessons", time: "4 hours" },
];

export default function AcademyPage() {
  return <main className="app-shell"><section className="main-area">
    <header className="topbar"><Link className="route-back" href="/"> <ArrowLeft size={14}/> Syntax Studio</Link><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>Academy</strong></div></header>
    <div className="route-wrap">
      <div className="route-kicker">THE LEARNING ENGINE / ACADEMY</div>
      <h1 className="route-title">Choose your next skill.</h1>
      <p className="route-subtitle">A structured pathway from first principles to practical confidence. Each stage builds on the last, with explanations, examples, exercises and mastery checks.</p>
      <section className="academy-hero"><div className="academy-hero-row"><div><div className="route-kicker">CURRENT FOUNDATION PATH</div><h2>Python Mastery</h2><p>Start with the foundations of Python, then build toward writing and understanding complete programs. The course is being aligned with your CSC 201 lecture material before it is published as a final syllabus.</p></div><span className="course-chip">BEGINNER · 8 STAGES</span></div></section>
      <div className="route-section-head"><div><div className="route-kicker">YOUR CURRICULUM</div><h3>Python learning pathway</h3></div><span className="course-chip">DRAFT CURRICULUM</span></div>
      <div className="module-grid">{modules.map((module,index)=><article className={`module-card ${module.open ? "available" : ""}`} key={module.title}><div className="module-index">{String(index+1).padStart(2,"0")}</div><div><h4>{module.title}</h4><p>{module.description}</p><div className="module-meta"><span>{module.lessons}</span><span>{module.time}</span></div></div><div className="module-action">{module.open ? <Link href="/academy/python-foundations" aria-label="Open Python foundations"><ArrowRight size={17}/></Link> : <LockKeyhole size={16}/>}</div></article>)}</div>
      <div className="learning-note"><BookOpen size={15} style={{display:"inline",verticalAlign:"-3px",marginRight:8}}/> This is a preliminary pathway based on the lecture topics identified so far. Later stages remain locked until their lessons and assessments are ready. No XP, grades or completion records are awarded by simply opening a lesson.</div>
    </div>
  </section></main>;
}
