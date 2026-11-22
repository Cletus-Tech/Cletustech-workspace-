"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Braces, CheckCircle2, ChevronDown, Code2, FileCode2, Folder, Play, RotateCcw, Terminal, Trash2, Zap } from "lucide-react";

const starter = `# Welcome to Syntax Studio
# Your first Python program

name = "Developer"
print("Hello, " + name + "!")
print("Your coding journey starts here.")

for step in range(1, 4):
    print("Practice session", step)
`;

type WorkerMessage = { type: "ready" | "output" | "done" | "error"; text?: string };

export default function CodeStudioPage() {
  const [code, setCode] = useState(starter);
  const [output, setOutput] = useState<string[]>(["Your program output will appear here."]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "running" | "error">("idle");
  const [hasRun, setHasRun] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const lines = useMemo(() => code.split("\n").length, [code]);

  useEffect(() => {
    const worker = new Worker("/python-worker.js");
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "ready") setStatus("ready");
      if (message.type === "output") setOutput((current) => [...current, message.text ?? ""]);
      if (message.type === "done") { setStatus("ready"); setHasRun(true); }
      if (message.type === "error") { setStatus("error"); setOutput((current) => [...current, message.text ?? "An execution error occurred."]); }
    };
    worker.onerror = () => { setStatus("error"); setOutput((current) => [...current, "The Python runtime could not be loaded. Check your connection and try again."]); };
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  function runCode() {
    if (!workerRef.current || status === "running" || status === "loading") return;
    setOutput([]);
    setStatus("loading");
    workerRef.current.postMessage({ type: "run", code });
  }

  function resetCode() { setCode(starter); setOutput(["Editor reset. Run the program to see its output."]); setHasRun(false); }
  function clearOutput() { setOutput([]); }

  return (
    <main className="ss-app academy-app studio-app">
      <aside className="ss-sidebar">
        <Link href="/" className="ss-brand"><span className="ss-brand-mark">S</span><span>Syntax<strong>Studio</strong></span></Link>
        <div className="ss-nav-label">LEARNING SPACE</div>
        <nav className="ss-nav">
          <Link className="ss-nav-item" href="/"><span>⌂</span><span><b>Dashboard</b><small>Empire Hall</small></span></Link>
          <Link className="ss-nav-item" href="/academy"><BookOpen/><span><b>Academy</b><small>Courses & paths</small></span></Link>
          <Link className="ss-nav-item" href="/academy/python-foundations"><Code2/><span><b>Learning Room</b><small>Python foundations</small></span></Link>
          <Link className="ss-nav-item selected" href="/studio"><Braces/><span><b>Code Studio</b><small>Practice & experiment</small></span></Link>
        </nav>
        <div className="studio-sidebar-tip"><Zap/><b>Build by doing.</b><p>Experiment with code, read the output and learn from every attempt.</p></div>
        <div className="ss-account"><div className="ss-avatar">SS</div><div><b>Syntax learner</b><small>Practice workspace</small></div></div>
      </aside>
      <section className="ss-main">
        <header className="ss-topbar"><Link href="/" className="academy-back"><ArrowLeft size={15}/> Dashboard</Link><div className="ss-top-actions"><span className="ss-online"><i/>Browser runtime</span><span className="ss-top-avatar">SS</span></div></header>
        <div className="studio-content">
          <div className="studio-heading">
            <div><div className="lesson-breadcrumb">SYNTAX STUDIO <span>/</span> PRACTICE SPACE</div><h1>Code Studio<span>.</span></h1><p>A focused workspace to write Python, run your ideas and understand what your code does.</p></div>
            <div className="studio-runtime-badge"><span className={status === "error" ? "runtime-dot error" : "runtime-dot"}/><div><b>PYTHON 3</b><small>{status === "loading" ? "Starting runtime…" : status === "running" ? "Executing code…" : status === "error" ? "Runtime issue" : status === "ready" ? "Runtime ready" : "Ready to initialise"}</small></div></div>
          </div>
          <div className="studio-toolbar">
            <div className="studio-file-tab"><FileCode2/><span>main.py</span><i/></div>
            <div className="studio-toolbar-actions"><span className="studio-language"><span>Py</span> Python 3 <ChevronDown size={13}/></span><button type="button" className="studio-reset" onClick={resetCode}><RotateCcw size={14}/> Reset</button><button type="button" className="studio-run" onClick={runCode} disabled={status === "loading" || status === "running"}><Play size={14} fill="currentColor"/> {status === "loading" ? "Starting…" : status === "running" ? "Running…" : "Run code"}</button></div>
          </div>
          <div className="studio-workbench">
            <section className="studio-editor-panel">
              <div className="studio-panel-head"><div><Folder size={14}/><b>EXPLORER</b></div><span>WORKSPACE</span></div>
              <div className="studio-file-row active"><FileCode2 size={14}/><span>main.py</span><small>PY</small></div>
              <div className="studio-editor-head"><span>main.py</span><small>Python · UTF-8</small></div>
              <div className="studio-editor">
                <div className="studio-line-numbers" aria-hidden="true">{Array.from({length:Math.max(lines,1)},(_,i)=><span key={i}>{i+1}</span>)}</div>
                <textarea aria-label="Python code editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={code} onChange={(event)=>setCode(event.target.value)} />
              </div>
              <div className="studio-editor-status"><span>Ln {lines}, Col 1</span><span>Spaces: 4</span><span>Python 3</span></div>
            </section>
            <section className="studio-output-panel">
              <div className="studio-output-head"><div><Terminal size={15}/><b>OUTPUT TERMINAL</b><span className="studio-terminal-live">LOCAL</span></div><button type="button" onClick={clearOutput} aria-label="Clear terminal"><Trash2 size={14}/></button></div>
              <div className="studio-terminal-body">
                <div className="studio-terminal-command"><span>›</span> python main.py</div>
                {output.map((line,index)=><div className="studio-output-line" key={index}>{line || " "}</div>)}
                {hasRun && status === "ready" && <div className="studio-exit-code"><CheckCircle2 size={13}/> Process finished successfully</div>}
                {status === "error" && <div className="studio-exit-error">Execution could not be completed.</div>}
              </div>
              <div className="studio-terminal-foot"><span><i/> {status === "running" || status === "loading" ? "BUSY" : status === "error" ? "CHECK RUNTIME" : "TERMINAL READY"}</span><span>Browser sandbox</span></div>
            </section>
          </div>
          <div className="studio-bottom-grid">
            <article className="studio-hint-card"><div className="studio-hint-icon"><Zap/></div><div><span className="ss-card-kicker">QUICK TIP</span><h3>Change something. Run it again.</h3><p>Try replacing <code>Developer</code> with your name. Then run the program and compare the output.</p></div></article>
            <article className="studio-challenge-card"><div><span className="ss-card-kicker">YOUR FIRST MINI CHALLENGE</span><h3>Make the program introduce you.</h3><p>Update the name variable and add one more print statement describing what you want to build.</p><Link href="/academy/python-foundations">Review Python foundations <ArrowRight size={14}/></Link></div><div className="studio-challenge-mark">01</div></article>
          </div>
          <div className="studio-disclaimer">Python runs locally in a browser worker using the Pyodide runtime. Your code is not sent to the Syntax Studio server. Runtime download requires an internet connection on first use.</div>
        </div>
      </section>
    </main>
  );
}
