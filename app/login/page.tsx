"use client";
import Link from "next/link";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,ArrowRight,LockKeyhole,Mail,UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
export default function LoginPage(){
 const router=useRouter();const [mode,setMode]=useState<"signin"|"signup">("signin");
 const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setMessage("");
 const supabase=getSupabaseBrowserClient();if(!supabase){setError("Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment and hosting settings.");setBusy(false);return;}
 try{if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()||"Learner"}}});if(error)throw error;if(data.session){router.push("/");router.refresh();}else setMessage("Account created. Check your email for the confirmation link, then return here to sign in.");}
 else{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;router.push("/");router.refresh();}}
 catch(err){setError(err instanceof Error?err.message:"Authentication could not be completed. Please try again.");}finally{setBusy(false);}}
 return <main className="auth-screen"><div className="auth-top"><Link href="/"><ArrowLeft size={15}/> Back to Syntax Studio</Link><span>SECURE LEARNER ACCESS</span></div>
 <section className="auth-card"><div className="auth-brand"><div className="brand-mark"><span className="brand-angle">{"<"}</span><span className="brand-slash">/</span><span className="brand-angle">{">"}</span></div><div><strong>syntax<span>studio</span></strong><small>THE LEARNING ENGINE</small></div></div>
 <div className="route-kicker">YOUR NEXT CHAPTER STARTS HERE</div><h1>{mode==="signin"?"Welcome back.":"Create your learner account."}</h1><p className="auth-copy">Sign in to keep your learning journey connected across sessions.</p>
 <div className="auth-tabs"><button type="button" className={mode==="signin"?"selected":""} onClick={()=>{setMode("signin");setError("");setMessage("");}}>Sign in</button><button type="button" className={mode==="signup"?"selected":""} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Create account</button></div>
 <form onSubmit={submit} className="auth-form">{mode==="signup"&&<label><span><UserRound size={14}/> Display name</span><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="How should we address you?" maxLength={60}/></label>}
 <label><span><Mail size={14}/> Email address</span><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label>
 <label><span><LockKeyhole size={14}/> Password</span><input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="signin"?"current-password":"new-password"} placeholder="At least 8 characters"/></label>
 {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-message" role="status">{message}</p>}
 <button className="auth-submit" type="submit" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in to your workspace":"Create learner account"} <ArrowRight size={15}/></button></form>
 <p className="auth-footnote">Your password is handled by Supabase Authentication. Syntax Studio never stores it in the learning profile.</p></section><footer className="auth-footer">SYNTAX STUDIO · LEARN WITH INTENTION</footer></main>;
}