"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Code2, Flag, LockKeyhole, ShieldCheck, Target, X } from "lucide-react";

const questions = [
  { id:1, topic:"Python foundations", type:"Multiple choice", prompt:"Which statement best describes Python?", options:["A markup language used to style web pages","A high-level, general-purpose programming language","A database management system","A hardware description language"], answer:1 },
  { id:2, topic:"Syntax & structure", type:"Multiple choice", prompt:"Which line correctly displays the text Hello, world! in Python 3?", options:["echo('Hello, world!')","console.log('Hello, world!')","print('Hello, world!')","printf('Hello, world!')"], answer:2 },
  { id:3, topic:"Variables", type:"Multiple choice", prompt:"Which is a valid Python variable name?", options:["2score","student-name","student_name","class"], answer:2 },
  { id:4, topic:"Data types", type:"Multiple choice", prompt:"What is the type of the value 3.14?", options:["int","float","str","bool"], answer:1 },
  { id:5, topic:"Operators", type:"Multiple choice", prompt:"What is the result of 17 % 5?", options:["2","3","3.4","12"], answer:0 },
];

const formatTime = (seconds:number) => `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;

export default function ExaminationCentrePage() {
  const [started,setStarted] = useState(false);
  const [current,setCurrent] = useState(0);
  const [answers,setAnswers] = useState<Record<number,number>>({});
  const [marked,setMarked] = useState<number[]>([]);
  const [remaining,setRemaining] = useState(15*60);
  const [submitted,setSubmitted] = useState(false);
  const [showSubmit,setShowSubmit] = useState(false);
  const [showRules,setShowRules] = useState(false);

  useEffect(() => {
    if (!started || submitted || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining(value => Math.max(0,value-1)),1000);
    return () => window.clearInterval(timer);
  },[started,submitted,remaining]);

  const answered = Object.keys(answers).length;
  const unanswered = questions.length-answered;
  const selected = questions[current];
  const progress = useMemo(() => Math.round(answered/questions.length*100),[answered]);

  function finishPreview() {
    setSubmitted(true);
    setShowSubmit(false);
  }

  return <main className="ss-app academy-app exam-app">
    <aside className="ss-sidebar">
      <Link href="/" className="ss-brand"><span className="ss-brand-mark">S</span><span>Syntax<strong>Studio</strong></span></Link>
      <div className="ss-nav-label">LEARNING SPACE</div>
      <nav className="ss-nav">
        <Link className="ss-nav-item" href="/"><span>⌂</span><span><b>Dashboard</b><small>Empire Hall</small></span></Link>
        <Link className="ss-nav-item" href="/academy"><BookOpen/><span><b>Academy</b><small>Courses & paths</small></span></Link>
        <Link className="ss-nav-item" href="/academy/python-foundations"><Code2/><span><b>Learning Room</b><small>Python foundations</small></span></Link>
        <Link className="ss-nav-item" href="/studio"><Code2/><span><b>Code Studio</b><small>Practice workspace</small></span></Link>
        <Link className="ss-nav-item" href="/challenges"><Target/><span><b>Challenge Arena</b><small>Practice missions</small></span></Link>
        <Link className="ss-nav-item selected" href="/exams"><ShieldCheck/><span><b>Examination Centre</b><small>Test & assess</small></span></Link>
      </nav>
      <div className="exam-sidebar-note"><LockKeyhole/><b>Assessment integrity</b><p>Official grades and progression must be calculated and stored by the trusted assessment service.</p></div>
      <div className="ss-account"><div className="ss-avatar">SS</div><div><b>Syntax learner</b><small>Assessment preview</small></div></div>
    </aside>
    <section className="ss-main">
      <header className="ss-topbar"><Link href="/" className="academy-back"><ArrowLeft size={15}/> Dashboard</Link><div className="ss-top-actions"><span className="ss-online"><i/>Examination Centre</span><span className="ss-top-avatar">SS</span></div></header>
      <div className="exam-content">
        {!started ? <div className="exam-overview">
          <div className="exam-hero">
            <div className="exam-hero-copy"><span className="ss-welcome-pill"><ShieldCheck size={12}/> THE KNOWLEDGE TRIAL</span><h1>Examination <em>Centre.</em></h1><p>Demonstrate what you understand. Read carefully, manage your time and approach every question with confidence.</p><div className="exam-hero-meta"><span><Clock3/> 15 minutes</span><span><BookOpen/> 5 sample questions</span><span><Target/> Python foundations</span></div></div>
            <div className="exam-hero-art"><div className="exam-art-ring"/><div className="exam-art-emblem"><ShieldCheck/></div><span>ASSESSMENT<br/><b>PROTOCOL 001</b></span></div>
          </div>
          <div className="exam-overview-grid">
            <article className="exam-info-card"><span className="ss-card-kicker">ASSESSMENT DETAILS</span><h2>Python Foundations Checkpoint</h2><p>A short knowledge check covering the opening foundations of the Python learning path.</p><div className="exam-detail-rows"><div><span>Assessment type</span><b>Knowledge checkpoint</b></div><div><span>Time allowance</span><b>15 minutes</b></div><div><span>Question format</span><b>Multiple choice</b></div><div><span>Question count</span><b>5 questions</b></div><div><span>Passing standard</span><b>Not configured</b></div></div><button className="exam-rules-link" onClick={()=>setShowRules(!showRules)}>{showRules?"Hide":"Read"} examination rules <ChevronRight size={14}/></button>{showRules&&<div className="exam-rules"><b>Before you begin</b><ul><li>Read every question and choose one answer.</li><li>You may move between questions and change an answer.</li><li>Use the review flag to revisit a question before submitting.</li><li>This is a demonstration. Your answers are not saved to an account.</li></ul></div>}</article>
            <article className="exam-readiness-card"><div className="exam-readiness-icon"><LockKeyhole/></div><span className="ss-card-kicker">EXAM READINESS</span><h2>Preview environment</h2><p>This sample lets you experience the examination interface. Official assessments will be issued, timed, graded and recorded by the secure assessment service.</p><div className="exam-readiness-line"><CheckCircle2/><span>Question navigation</span><b>Ready</b></div><div className="exam-readiness-line"><CheckCircle2/><span>Answer review</span><b>Ready</b></div><div className="exam-readiness-line pending"><Clock3/><span>Secure grading & records</span><b>In development</b></div><button className="exam-start-button" onClick={()=>setStarted(true)}>Begin sample assessment <ArrowRight/></button><small className="exam-preview-label">SAMPLE ONLY · NO OFFICIAL RESULT</small></article>
          </div>
          <div className="exam-integrity"><ShieldCheck/><div><b>Your achievement record is protected.</b><p>Syntax Studio will never award official marks, XP, certificates or course unlocks from unverified browser-only answers.</p></div></div>
        </div> : submitted ? <div className="exam-result-preview"><div className="exam-result-icon"><CheckCircle2/></div><span className="ss-card-kicker">SAMPLE SESSION ENDED</span><h1>Assessment preview <em>complete.</em></h1><p>Your sample session has ended. No official score has been calculated and no result was sent to your learner record.</p><div className="exam-result-stats"><div><b>{answered}/{questions.length}</b><span>Questions answered</span></div><div><b>{questions.length-answered}</b><span>Left unanswered</span></div><div><b>{formatTime(15*60-remaining)}</b><span>Time used</span></div></div><div className="exam-integrity"><LockKeyhole/><div><b>No grade or reward was issued.</b><p>Official results require server-side validation and a saved assessment attempt.</p></div></div><div className="exam-result-actions"><button className="exam-start-button" onClick={()=>{setStarted(false);setSubmitted(false);setAnswers({});setMarked([]);setCurrent(0);setRemaining(15*60);}}>Return to overview <ArrowRight/></button><Link href="/academy" className="exam-secondary-button">Back to Academy</Link></div></div> : <div className="exam-session">
          <div className="exam-session-heading"><div><span className="ss-card-kicker">SAMPLE ASSESSMENT · PYTHON FOUNDATIONS</span><h1>Knowledge <em>Checkpoint.</em></h1><p>Choose the best answer for each question. You can review your choices before ending the sample.</p></div><div className={`exam-timer ${remaining<120?"urgent":""}`}><Clock3/><div><small>TIME REMAINING</small><b>{formatTime(remaining)}</b></div></div></div>
          <div className="exam-session-progress"><div><span>ASSESSMENT PROGRESS</span><b>{answered} of {questions.length} answered</b></div><div className="exam-progress-track"><i style={{width:`${progress}%`}}/></div></div>
          <div className="exam-session-layout">
            <section className="exam-question-panel"><div className="exam-question-top"><span>QUESTION {String(current+1).padStart(2,"0")} <i/> {selected.topic}</span><button className={marked.includes(selected.id)?"marked":""} onClick={()=>setMarked(items=>items.includes(selected.id)?items.filter(id=>id!==selected.id):[...items,selected.id])}><Flag/> {marked.includes(selected.id)?"Marked for review":"Mark for review"}</button></div><span className="exam-question-type">{selected.type}</span><h2>{selected.prompt}</h2><div className="exam-options">{selected.options.map((option,index)=><button key={option} className={answers[selected.id]===index?"chosen":""} onClick={()=>setAnswers(previous=>({...previous,[selected.id]:index}))}><span className="exam-option-letter">{String.fromCharCode(65+index)}</span><span>{option}</span>{answers[selected.id]===index&&<Check/>}</button>)}</div><div className="exam-question-footer"><button className="exam-prev" disabled={current===0} onClick={()=>setCurrent(value=>value-1)}><ChevronLeft/> Previous</button><span>{current+1} / {questions.length}</span><button className="exam-next" onClick={()=>setCurrent(value=>Math.min(questions.length-1,value+1))} disabled={current===questions.length-1}>Next question <ChevronRight/></button></div></section>
            <aside className="exam-question-nav"><span className="ss-card-kicker">QUESTION MAP</span><h3>Your answers</h3><p>Select a number to move to that question.</p><div className="exam-number-grid">{questions.map((question,index)=><button key={question.id} onClick={()=>setCurrent(index)} className={`${current===index?"current ":""}${answers[question.id]!==undefined?"answered ":""}${marked.includes(question.id)?"flagged":""}`}>{index+1}</button>)}</div><div className="exam-map-legend"><span><i className="answered-dot"/> Answered</span><span><i className="flagged-dot"/> Review</span><span><i className="current-dot"/> Current</span></div><div className="exam-map-summary"><div><span>Answered</span><b>{answered}</b></div><div><span>Unanswered</span><b>{unanswered}</b></div><div><span>For review</span><b>{marked.length}</b></div></div><button className="exam-submit-button" onClick={()=>setShowSubmit(true)}>End sample assessment <ArrowRight/></button><small className="exam-preview-label">PREVIEW SESSION · NOT GRADED</small></aside>
          </div>
        </div>}
      </div>
    </section>
    {showSubmit&&<div className="exam-modal-backdrop" role="presentation"><div className="exam-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="exam-confirm-title"><button className="exam-modal-close" onClick={()=>setShowSubmit(false)} aria-label="Close"><X/></button><div className="exam-modal-icon"><Flag/></div><span className="ss-card-kicker">END SAMPLE SESSION</span><h2 id="exam-confirm-title">Ready to finish?</h2><p>You have answered {answered} of {questions.length} questions. {unanswered>0?`${unanswered} question(s) are unanswered.`:"All questions have an answer."} This sample will not create an official result.</p><div className="exam-modal-actions"><button className="exam-secondary-button" onClick={()=>setShowSubmit(false)}>Keep reviewing</button><button className="exam-start-button" onClick={finishPreview}>End sample <ArrowRight/></button></div></div></div>}
  </main>;
}
