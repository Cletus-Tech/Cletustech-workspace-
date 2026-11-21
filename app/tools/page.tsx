"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Provider = {
  id: string;
  name: string;
  category: string;
  website_url: string | null;
  connection_type: string;
  connection_status: string;
  is_enabled: boolean;
  is_default: boolean;
  notes: string | null;
};

const categories = [
  ["script", "Script & language"], ["image", "Image generation"], ["video", "Video generation"],
  ["voice", "Voice & narration"], ["music", "Music & sound"], ["editing", "Editing"], ["general", "General"]
];

const categoryNames: Record<string, string> = Object.fromEntries(categories);

export default function ToolsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("video");
  const [website, setWebsite] = useState("");
  const [connectionType, setConnectionType] = useState("manual");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { router.replace("/login"); return; }
    setUser(currentUser);
    const { data, error: queryError } = await supabase.from("ai_providers").select("*").order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setProviders(data ?? []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  function openCreate() {
    setEditing(null); setName(""); setCategory("video"); setWebsite(""); setConnectionType("manual"); setNotes(""); setError(""); setShowForm(true);
  }

  function openEdit(provider: Provider) {
    setEditing(provider); setName(provider.name); setCategory(provider.category); setWebsite(provider.website_url ?? "");
    setConnectionType(provider.connection_type); setNotes(provider.notes ?? ""); setError(""); setShowForm(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setBusy(true); setError(""); setNotice("");
    const payload = {
      name: name.trim(), category, website_url: website.trim() || null,
      connection_type: connectionType, notes: notes.trim() || null,
      updated_at: new Date().toISOString()
    };
    const result = editing
      ? await supabase.from("ai_providers").update(payload).eq("id", editing.id)
      : await supabase.from("ai_providers").insert({ ...payload, owner_id: user.id, connection_status: "not_connected" });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setShowForm(false); setNotice(editing ? "Provider details updated." : "AI provider added to your registry.");
    await load();
  }

  async function toggle(provider: Provider) {
    const { error: updateError } = await supabase.from("ai_providers").update({ is_enabled: !provider.is_enabled, connection_status: provider.is_enabled ? "disabled" : "not_connected", updated_at: new Date().toISOString() }).eq("id", provider.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function remove(provider: Provider) {
    if (!window.confirm(`Remove ${provider.name} from your provider registry? This also removes its linked account labels.`)) return;
    const { error: deleteError } = await supabase.from("ai_providers").delete().eq("id", provider.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Provider removed."); await load(); }
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); }

  if (loading) return <main className="boot-screen"><div className="boot-mark">CT</div><div className="boot-title">CLETUS TECH WORKSPACE</div><div className="boot-line" /><p>Loading provider registry…</p></main>;

  return <main className="app-frame">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">CT</span><span className="brand-copy"><strong>CLETUS TECH</strong><small>WORKSPACE</small></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">C</span><span><strong>Personal workspace</strong><small>Free workspace</small></span></div>
      <nav className="side-nav" aria-label="Main navigation"><div className="nav-group"><p className="nav-heading">WORKSPACE</p><Link className="nav-link" href="/"><span className="nav-icon">◫</span>Overview</Link><Link className="nav-link" href="/#projects"><span className="nav-icon">▤</span>My projects</Link></div><div className="nav-group"><p className="nav-heading">INTELLIGENCE</p><Link className="nav-link active" href="/tools"><span className="nav-icon">✳</span>AI tool manager</Link></div></nav>
      <div className="sidebar-bottom"><div className="plan-card"><span className="plan-dot" /><div><strong>Free-first workspace</strong><small>Upgrade only when needed</small></div></div><button className="nav-link signout-link" onClick={signOut}><span className="nav-icon">↪</span>Sign out</button><div className="profile-row"><div className="profile-avatar">CT</div><div><strong>{user?.user_metadata?.display_name || "Workspace owner"}</strong><small>{user?.email}</small></div></div></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><b>/</b><strong>AI tool manager</strong></div><div className="top-actions"><span className="system-status"><i /> Private registry</span><div className="top-avatar">CT</div></div></header>
      <div className="content"><div className="welcome-row"><div><p className="eyebrow">PROVIDER CONTROL CENTRE</p><h1>AI tool manager</h1><p className="subheading">Register the creative engines you use and choose how each one can connect.</p></div><button className="primary-button" onClick={openCreate}><span>＋</span> Add provider</button></div>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}{error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        <div className="provider-explainer"><div className="provider-explainer-icon">✳</div><div><strong>A provider record is not a live connection.</strong><p>Adding a tool saves its details to your private registry. API access, OAuth or supported browser control must be configured and verified separately before the workspace can operate it.</p></div></div>
        <div className="provider-summary"><div><span>REGISTERED PROVIDERS</span><strong>{providers.length}</strong></div><div><span>ENABLED</span><strong>{providers.filter(p => p.is_enabled).length}</strong></div><div><span>VERIFIED CONNECTIONS</span><strong>{providers.filter(p => p.connection_status === "connected").length}</strong></div></div>
        <div className="provider-section-heading"><div><h2>Your provider registry</h2><p>Manage preferred AI services without locking your workflow to one vendor.</p></div></div>
        {providers.length === 0 ? <div className="panel provider-empty"><div className="empty-icon">✳</div><h3>Your provider registry is empty</h3><p>Add services you already use. You can register video, image, writing, voice, music and editing tools here.</p><button className="secondary-button" onClick={openCreate}>＋ Register your first AI tool</button></div> :
          <div className="provider-grid">{providers.map(provider => <article className="provider-card" key={provider.id}><div className="provider-card-top"><span className={"provider-category-icon " + provider.category}>{(categoryNames[provider.category] || "AI").slice(0,1)}</span><span className={provider.is_enabled ? "provider-enabled" : "provider-disabled"}>{provider.is_enabled ? "Enabled" : "Disabled"}</span></div><h3>{provider.name}</h3><p className="provider-category">{categoryNames[provider.category] || provider.category}</p>{provider.website_url && <a className="provider-url" href={provider.website_url} target="_blank" rel="noreferrer">{provider.website_url.replace(/^https?:\/\//,"").replace(/\/$/,"")} ↗</a>}<div className="provider-connection"><span className="connection-indicator" />{provider.connection_status.replaceAll("_"," ")} · {provider.connection_type.replaceAll("_"," ")}</div>{provider.notes && <p className="provider-notes">{provider.notes}</p>}<div className="provider-actions"><button onClick={() => openEdit(provider)}>Edit</button><button onClick={() => void toggle(provider)}>{provider.is_enabled ? "Disable" : "Enable"}</button><button className="danger-action" onClick={() => void remove(provider)}>Remove</button></div></article>)}</div>}
      </div>
    </section>
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false); }}><form className="project-modal" onSubmit={save}><div className="modal-top"><div><p className="eyebrow">PROVIDER REGISTRY</p><h2>{editing ? "Edit provider" : "Add AI provider"}</h2></div><button type="button" className="close-button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div>
      <label htmlFor="provider-name">Provider or tool name</label><input id="provider-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Google Flow" maxLength={100} required />
      <label htmlFor="provider-category">Primary capability</label><select id="provider-category" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select>
      <label htmlFor="provider-url">Official website (optional)</label><input id="provider-url" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
      <label htmlFor="connection-type">How could it connect?</label><select id="connection-type" value={connectionType} onChange={e => setConnectionType(e.target.value)}><option value="manual">Manual handoff / open website</option><option value="official_api">Official API integration</option><option value="approved_browser">Supported browser workflow</option></select>
      <label htmlFor="provider-notes">Notes (optional)</label><textarea id="provider-notes" className="provider-notes-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Free-tier notes, output limits, supported features…" rows={3} />
      <div className="modal-note">This saves the provider profile only. It will remain “not connected” until a real connection is configured and tested. Do not enter passwords or secret API keys here.</div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add provider"}</button></div>
    </form></div>}
  </main>;
}
