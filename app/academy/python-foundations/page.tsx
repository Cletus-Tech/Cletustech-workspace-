"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Terminal } from "lucide-react";

export default function PythonFoundationsLesson() {
  const [answer,setAnswer] = useState("");
  const [feedback,setFeedback] = useState("");
  const [passed,setPassed] = useState(false);
  function checkAnswer() {
    const normal = answer.trim().replace(/\s+/g," ");
    if (normal === 'print("Hello, world!")' || normal === "print('Hello, world!')") {
      setFeedback("Correct. You have written a valid first Python output statement. This practice check is local only; it does not award XP or record course completion.");
      setPassed(true);
    } else {
      setFeedback('Not quite. Use the print() function, put the message inside matching quotation marks, and close the parenthesis.');
      setPassed(false);
    }
  }
  return <main className="app-shell"><section className="main-area">
    <header className="topbar"><Link className="route-back" href="/academy"><ArrowLeft size={14}/> Academy</Link><div className="breadcrumb"><span>Python Mastery</span><span>/</span><strong>Foundations</strong></div></header>
    <div className="route-wrap">
      <div className="route-kicker">PYTHON MASTERY / STAGE 01 / LESSON 01</div>
      <h1 className="route-title">Meet Python. Run your first program.</h1>
      <p className="route-subtitle">Before writing larger programs, understand what Python is and how a Python instruction becomes output on your screen.</p>
      <div className="lesson-layout"><article className="lesson-main">
        <div className="route-kicker">01 — THE CONCEPT</div><h2>What is Python?</h2>
        <p>Python is a high-level, general-purpose programming language. It lets you express instructions in a form that is easier for people to read than low-level machine instructions. A Python interpreter reads and executes your program.</p>
        <p>For your practical work, distinguish the language from the tool used to write it. An editor or environment such as IDLE helps you create and run Python files; the Python interpreter executes the instructions.</p>
        <h3>Interactive shell and program files</h3>
        <p>An interactive shell lets you enter an instruction and see its result immediately. A program file lets you save several instructions together, usually in a file ending with <code>.py</code>, and run them as a unit.</p>
        <h3>Your first instruction</h3><p>The <code>print()</code> function displays information. Text is written inside quotation marks.</p>
        <div className="code-sample">print("Hello, world!")<br/><span style={{color:"#8dd8ad"}}>Hello, world!</span></div>
        <p>In this example, <code>print</code> is the function name, the text is an argument, and the parentheses group the argument passed to the function.</p>
        <h3>Python 2 and Python 3 note</h3><p>Some older lecture materials demonstrate Python 2.7, where input and output conventions can differ. This learning room uses Python 3 for new examples. When a CSC 201 question follows a specific lecturer convention, we will clearly label that convention rather than silently mixing versions.</p>
        <section className="practice-box"><div className="route-kicker">GUIDED PRACTICE / CHECK 01</div><h3>Write the instruction</h3><p>Write one Python statement that displays the exact text <strong>Hello, world!</strong>.</p><label htmlFor="answer">Your Python code</label><textarea id="answer" value={answer} onChange={e=>{setAnswer(e.target.value);setFeedback("");}} placeholder={'print("Hello, world!")'} spellCheck={false}/><button onClick={checkAnswer}>Check my answer</button>{feedback && <div className={`practice-feedback ${passed ? "" : "error"}`}>{feedback}</div>}</section>
        <Link className="lesson-next" href="/academy">Return to pathway <ArrowRight size={14} style={{display:"inline",verticalAlign:"-3px",marginLeft:6}}/></Link>
      </article>
      <aside className="lesson-aside"><h3><Terminal size={15} style={{display:"inline",verticalAlign:"-3px",marginRight:7}}/>Lesson guide</h3><div className="lesson-step"><strong>1. Understand</strong>What Python is and what an interpreter does.</div><div className="lesson-step"><strong>2. Compare</strong>Interactive shell versus saved program files.</div><div className="lesson-step"><strong>3. Practise</strong>Write your first output statement.</div><div className="lesson-step"><strong>4. Review</strong>Check the syntax and explain each part.</div><p className="muted-note">Estimated time: 15–20 minutes. This is a learning preview; course progress and assessments will be connected to your account in a later build step.</p></aside></div>
    </div>
  </section></main>;
}
