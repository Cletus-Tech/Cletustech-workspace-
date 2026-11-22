"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const workflow = [
  ["analysis", "Project analysis", "Understand the idea, audience and creative objective."],
  ["concepts", "Creative concepts", "Develop alternative story directions for your approval."],
  ["script", "Script writing", "Turn the selected concept into a complete script."],
  ["refinement", "Script refinement", "Improve pacing, dialogue, emotion and engagement."],
  ["storyboard", "Storyboard development", "Turn the approved screenplay into scenes, shots and camera direction."],
  ["continuity", "Continuity bible", "Lock character identity, wardrobe, locations, props, lighting and visual rules."],
  ["audio", "Voice & sound plan", "Prepare narration, dialogue, music and sound requirements."],
  ["generation", "Video generation", "Route approved scenes to suitable generation providers."],
  ["assembly", "Editing & delivery", "Assemble, review and export the finished production."]
] as const;

export default function IdeaIntakePage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [format, setFormat] = useState("short_film");
  const [duration, setDuration] = useState("60-90 seconds");
  const [style, setStyle] = useState("Cinematic and emotionally engaging");
  const [extra, setExtra] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then((result: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
      const { data, error: authError } = result;
      if (!active) return;
      if (authError || !data.user) router.replace("/login");
      else setUserId(data.user.id);
    });
    return () => { active = false; };
  }, [router, supabase]);

  async function submitIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !topic.trim()) return;
    setSubmitting(true);
    setError("");

    const intake = {
      topic: topic.trim(),
      creative_goal: goal.trim(),
      target_audience: audience.trim(),
      requested_format: format,
      target_duration: duration,
      visual_direction: style,
      additional_instructions: extra.trim(),
      submitted_at: new Date().toISOString(),
      schema_version: 1
    };

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        name: topic.trim().slice(0, 140),
        production_type: format,
        description: goal.trim() || topic.trim(),
        status: "planning",
        metadata: { intake, production_bible: {} }
      })
      .select("id")
      .single();

    if (projectError || !project) {
      setError(projectError?.message || "We could not save this idea. Please try again.");
      setSubmitting(false);
      return;
    }

    const { data: job, error: jobError } = await supabase
      .from("production_jobs")
      .insert({
        owner_id: userId,
        project_id: project.id,
        title: "Develop the submitted idea",
        job_type: "idea_to_video",
        status: "queued",
        input_payload: { current_stage: "analysis", intake, workflow_version: 1 }
      })
      .select("id")
      .single();

    if (jobError || !job) {
      setError("Your idea was saved, but its production workflow could not be created. Your project is safe. Please open it and try again. " + (jobError?.message || ""));
      setSubmitting(false);
      return;
    }

    const stepRows = workflow.map(([stage, title, detail], index) => ({
      owner_id: userId,
      job_id: job.id,
      project_id: project.id,
      step_order: index + 1,
      stage,
      title,
      status: "pending",
      input_payload: { instruction: detail }
    }));

    const { error: stepsError } = await supabase.from("production_steps").insert(stepRows);
    setSubmitting(false);

    if (stepsError) {
      setError("Your idea and production job were saved, but the workflow stages could not be created. Your project is safe. " + stepsError.message);
      return;
    }

    router.push("/project?id=" + encodeURIComponent(project.id));
  }

  return (
    <main className="idea-page">
      <header className="idea-header">
        <Link href="/" className="idea-brand"><span className="idea-brand-mark">CT</span><span><strong>CLETUS TECH</strong><small>CREATIVE WORKSPACE</small></span></Link>
        <Link href="/" className="idea-back">← Back to workspace</Link>
      </header>
      <div className="idea-layout">
        <section className="idea-intro">
          <span className="idea-kicker"><i /> YOUR IDEA IS THE STARTING POINT</span>
          <h1>One idea.<br/><em>A complete production.</em></h1>
          <p>Tell us what you want to create. Your workspace will keep the brief, creative decisions, script, scenes and production stages together.</p>
          <div className="idea-visual" aria-hidden="true">
            <div className="idea-visual-glow" />
            <div className="idea-visual-orb" />
            <div className="idea-visual-ring ring-one" />
            <div className="idea-visual-ring ring-two" />
            <div className="idea-visual-spark spark-a">✦</div>
            <div className="idea-visual-spark spark-b">✧</div>
            <div className="idea-visual-caption"><span>CREATIVE DIRECTION</span><strong>From spark to screen.</strong></div>
          </div>
          <div className="idea-promise"><span>✦</span><p><strong>You bring the idea.</strong><br/>The production team will guide the work, stage by stage.</p></div>
        </section>

        <section className="idea-form-panel">
          <div className="idea-form-heading"><span className="idea-step-label">NEW PRODUCTION · STEP 01</span><h2>Start with your idea</h2><p>You can keep it simple. The analyzer will use these details to understand your direction.</p></div>
          <form onSubmit={submitIdea}>
            <label htmlFor="idea-topic">What is your idea or topic? <b>Required</b></label>
            <textarea id="idea-topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. A Reason to Live — create an emotional short film that reminds people that life can still hold hope…" rows={4} maxLength={3000} required />
            <div className="idea-field-grid">
              <div><label htmlFor="idea-goal">What should the video achieve?</label><input id="idea-goal" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Inspire, educate, entertain…" maxLength={500}/></div>
              <div><label htmlFor="idea-audience">Who is it for?</label><input id="idea-audience" value={audience} onChange={e => setAudience(e.target.value)} placeholder="General audience, young adults… " maxLength={300}/></div>
            </div>
            <div className="idea-field-grid">
              <div><label htmlFor="idea-format">Production format</label><select id="idea-format" value={format} onChange={e => setFormat(e.target.value)}><option value="short_film">Short film</option><option value="cinematic_video">Cinematic video</option><option value="youtube">YouTube video</option><option value="advertisement">Advertisement</option><option value="animation">Animation</option><option value="podcast">Podcast / audio</option><option value="custom">Let the analyzer recommend</option></select></div>
              <div><label htmlFor="idea-duration">Approximate length</label><select id="idea-duration" value={duration} onChange={e => setDuration(e.target.value)}><option>30-60 seconds</option><option>60-90 seconds</option><option>2-3 minutes</option><option>3-5 minutes</option><option>5-10 minutes</option><option>Let the analyzer recommend</option></select></div>
            </div>
            <label htmlFor="idea-style">Visual or storytelling direction</label>
            <input id="idea-style" value={style} onChange={e => setStyle(e.target.value)} placeholder="Cinematic, documentary, animated, realistic…" maxLength={500}/>
            <label htmlFor="idea-extra">Anything else the creative team should know? <span>Optional</span></label>
            <textarea id="idea-extra" value={extra} onChange={e => setExtra(e.target.value)} placeholder="References, must-have moments, language, location, restrictions…" rows={3} maxLength={3000}/>
            {error && <div className="idea-error" role="alert">{error}</div>}
            <div className="idea-submit-row"><span>Your brief is saved privately to your project.</span><button type="submit" disabled={!userId || submitting || !topic.trim()}>{submitting ? "Creating your project…" : "Create production brief  →"}</button></div>
          </form>
        </section>
      </div>
      <section className="idea-workflow">
        <div><span className="idea-step-label">THE PRODUCTION JOURNEY</span><h2>One connected creative process</h2><p>These stages will run in sequence, with your approval at key creative decisions.</p></div>
        <div className="idea-stage-grid">{workflow.map(([stage, title], index) => <div className="idea-stage" key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong></div>)}</div>
        <p className="idea-honesty">AI analysis and generation will begin when the required model/provider connection is configured. Creating this brief does not claim that an AI has already analyzed it.</p>
      </section>
    </main>
  );
}
