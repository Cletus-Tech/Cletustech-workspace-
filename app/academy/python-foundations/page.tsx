"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Code2, Lightbulb, Play, Terminal } from "lucide-react";

export default function PythonFoundationsLesson() {
  const [answer,setAnswer]=useState("");
  const [feedback,setFeedback]=useState("");
  const [passed,setPassed]=useState(false);
  function checkAnswer(){
    const value=answer.trim().replace(/\\s+/g," ");
    const ok=value==='print("Hello, world!")'||value==="print('Hello, world!')";
    setPassed(ok);
    setFeedback(ok?"Correct. Your statement calls print() and passes the text as an argument. This local practice check does not award XP or record course completion.":"Check the function name, matching quotation marks and closing parenthesis. Try writing the statement again.");
  }
  return <main className="ss-app academy-app lesson-app">
    <aside className="ss-sidebar">
      <Link href="/" className="ss-brand"><span className="ss-brand-mark">S</span><span>Syntax<strong>Studio</strong></span></Link>
      <div className="ss-nav-label">PYTHON MASTERY</div>
      <nav className="ss-nav"><Link className="ss-nav-item" href="/academy"><span>▤</span><span><b>Course pathway</b><small>All 8 stages</small></span></Link><div className="lesson-side-current"><span>01</span><div><b>Python foundations</b><small>Stage 01 · Lesson 01</small></div></div><div className="lesson-side-muted">02 · Syntax & structure</div><div className="lesson-side-muted">03 · Variables & types</div></nav>
      <div className="ss-account"><div className="ss-avatar">SS</div><div><b>Learning workspace</b><small>Python Mastery</small></div></div>
    </aside>
    <section className="ss-main">
      <header className="ss-topbar"><Link href="/academy" className="academy-back"><ArrowLeft size={15}/> Academy</Link><div className="ss-top-actions"><span className="ss-online"><i/>Lesson preview</span><span className="ss-top-avatar">SS</span></div></header>
      <div className="lesson-content">
        <div className="lesson-breadcrumb">PYTHON MASTERY <span>/</span> STAGE 01 <span>/</span> LESSON 01</div>
        <div className="lesson-heading"><div><span className="ss-welcome-pill">FOUNDATION · 15–20 MIN</span><h1>Meet Python.<br/><em>Run your first program.</em></h1><p>Understand what Python is, how it runs, and how to make your first instruction produce output.</p></div><div className="lesson-progress-card"><span>LESSON PROGRESS</span><b>01 <small>/ 03</small></b><div><i/></div><small>Preview · not yet recorded</small></div></div>
        <div className="lesson-workspace">
          <article className="lesson-article">
            <div className="lesson-block-label"><span>01</span> THE CONCEPT</div><h2>What is Python?</h2>
            <p>Python is a high-level, general-purpose programming language. It allows people to write instructions in a readable form, while the Python interpreter handles executing those instructions.</p>
            <p>For your practical work, distinguish the language from the tool used to write it. An editor or environment such as IDLE helps you create and run Python files; the interpreter executes the instructions.</p>
            <div className="lesson-callout"><Lightbulb/><div><b>Think of it this way</b><p>The editor is where you write your instructions. The interpreter is the program that reads and executes them.</p></div></div>
            <h3>Interactive shell and program files</h3><p>An interactive shell lets you enter an instruction and see its result immediately. A program file lets you save several instructions together, usually in a file ending in <code>.py</code>, and run them as a unit.</p>
            <h3>Your first instruction</h3><p>The <code>print()</code> function displays information. Text is placed inside quotation marks.</p>
            <div className="lesson-code"><div><span><i/> <i/> <i/></span><small>first_program.py · Python 3</small><button type="button" onClick={()=>setAnswer('print("Hello, world!")')}>Use example</button></div><pre><b>print</b>(<em>&quot;Hello, world!&quot;</em>)</pre><div className="lesson-code-output"><span>OUTPUT</span><code>Hello, world!</code></div></div>
            <p>Here, <code>print</code> is the function name, the text is an argument, and the parentheses group the argument passed to the function.</p>
            <h3>Python 2 and Python 3</h3><p>Some older lecture materials demonstrate Python 2.7, where input and output conventions can differ. This learning room uses Python 3 for new examples. When a CSC 201 question follows a lecturer-specific convention, we will label it rather than silently mixing versions.</p>
            <section className="lesson-practice"><div className="lesson-block-label"><span>02</span> GUIDED PRACTICE</div><h2>Write the instruction</h2><p>Write one Python statement that displays the exact text <strong>Hello, world!</strong>.</p><label htmlFor="lesson-answer">YOUR PYTHON CODE</label><textarea id="lesson-answer" value={answer} onChange={e=>{setAnswer(e.target.value);setFeedback("");}} spellCheck={false} placeholder={'print("Hello, world!")'}/><div className="lesson-practice-actions"><button type="button" onClick={checkAnswer}><Play size={14} fill="currentColor"/> Check answer</button><span>Local syntax check · no XP awarded</span></div>{feedback&&<div className={`lesson-feedback ${passed?"success":"error"}`}>{passed?<CheckCircle2/>:<Lightbulb/>}{feedback}</div>}</section>
            <Link href="/academy" className="lesson-return">Back to pathway <ArrowRight size={15}/></Link>
          </article>
          <aside className="lesson-rail"><div className="lesson-rail-card"><div><BookOpen/><b>In this lesson</b></div><a href="#top">What is Python?</a><a href="#top">Shell vs program files</a><a href="#top">Your first instruction</a><a href="#top">Python 2 and 3</a><a href="#lesson-answer">Guided practice</a></div><div className="lesson-rail-card"><div><Terminal/><b>Lesson checklist</b></div><p>Understand the interpreter</p><p>Compare shell and saved files</p><p>Recognise the print() function</p><p>Write your first statement</p></div><div className="lesson-version-note"><Code2/> Course material is being aligned with the CSC 201 lecture notes. This lesson is a preview, not a graded assessment.</div></aside>
        </div>
      </div>
    </section>
  </main>;
}
