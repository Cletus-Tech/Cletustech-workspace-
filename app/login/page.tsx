"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: displayName.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/` }
      });
      if (signUpError) setError(signUpError.message);
      else if (data.session) router.replace("/");
      else setMessage("Account created. Check your email to confirm your address, then sign in.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else router.replace("/");
    }
    setBusy(false);
  }

  return <main className="auth-screen"><div className="auth-decoration" /><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">CT</span><span className="brand-copy"><strong>CLETUS TECH</strong><small>WORKSPACE</small></span></Link>
    <p className="eyebrow">YOUR CREATIVE CONTROL ROOM</p><h1>{mode === "signin" ? "Welcome back." : "Create your workspace account."}</h1>
    <p className="auth-subtitle">{mode === "signin" ? "Sign in to continue building your productions." : "One account for your projects, tools and creative assets."}</p>
    <div className="auth-tabs"><button type="button" className={mode === "signin" ? "selected" : ""} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button><button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button></div>
    <form onSubmit={submit} className="auth-form">
      {mode === "signup" && <label>Display name<input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your name or studio name" maxLength={80} required /></label>}
      <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in to workspace →" : "Create account →"}</button>
    </form>
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
    <p className="auth-footnote">Your workspace uses private, owner-scoped database access. Never share your password or API secrets.</p>
  </section><div className="auth-bottom">CLETUS TECH WORKSPACE <span>·</span> PRIVATE CREATIVE PRODUCTION</div></main>;
}
