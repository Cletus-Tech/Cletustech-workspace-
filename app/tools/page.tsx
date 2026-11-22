"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string; provider_id: string; label: string; external_account_label: string | null;
  connection_method: string; status: string; secret_reference: string | null; notes: string | null;
  api_base_url: string | null; model_id: string | null; adapter_key: string | null;
  verified_models: string[]; last_verified_at: string | null; connection_error: string | null;
};
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
  capabilities?: Record<string, unknown> | null;
};

const categories = [
  ["script", "Script & language"], ["image", "Image generation"], ["video", "Video generation"],
  ["voice", "Voice & narration"], ["music", "Music & sound"], ["editing", "Editing"], ["general", "General"]
];

const categoryNames: Record<string, string> = Object.fromEntries(categories);

const apiKeyPortals: Record<string, string> = {
  "OpenAI": "https://platform.openai.com/api-keys",
  "OpenRouter": "https://openrouter.ai/settings/keys",
  "Groq": "https://console.groq.com/keys",
  "Google Gemini": "https://aistudio.google.com/app/apikey",
  "DeepSeek": "https://platform.deepseek.com/api_keys",
  "Together AI": "https://api.together.ai/settings/api-keys",
  "Mistral AI": "https://console.mistral.ai/api-keys",
  "Cerebras": "https://cloud.cerebras.ai/platform/",
  "Fireworks AI": "https://fireworks.ai/account/api-keys",
  "fal.ai Image": "https://fal.ai/dashboard/keys",
  "fal.ai Video": "https://fal.ai/dashboard/keys",
  "Runway Video": "https://dev.runwayml.com/",
  "Runway Image": "https://dev.runwayml.com/",
  "Runway Music": "https://dev.runwayml.com/",
  "ElevenLabs Voice": "https://elevenlabs.io/app/settings/api-keys",
};

export default function ToolsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountProvider, setAccountProvider] = useState<Provider | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountLabel, setAccountLabel] = useState("");
  const [externalLabel, setExternalLabel] = useState("");
  const [accountMethod, setAccountMethod] = useState("manual");
  const [accountNotes, setAccountNotes] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accountModel, setAccountModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [connectionTesting, setConnectionTesting] = useState(false);
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
    let { data, error: queryError } = await supabase.from("ai_providers").select("*").order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else {
      // Give a new workspace a useful, honest starter catalogue. These are profiles,
      // not claimed connections; credentials are still supplied and tested by the owner.
      if ((data ?? []).length === 0) {
        const starter: Array<[string, string, string, string, string]> = [
          ["OpenAI", "https://openai.com", "script", "openai_compatible_chat", "https://api.openai.com/v1"],
          ["OpenRouter", "https://openrouter.ai", "script", "openai_compatible_chat", "https://openrouter.ai/api/v1"],
          ["Groq", "https://groq.com", "script", "openai_compatible_chat", "https://api.groq.com/openai/v1"],
          ["Google Gemini", "https://ai.google.dev", "script", "openai_compatible_chat", "https://generativelanguage.googleapis.com/v1beta/openai"],
          ["DeepSeek", "https://www.deepseek.com", "script", "openai_compatible_chat", "https://api.deepseek.com/v1"],
          ["Together AI", "https://www.together.ai", "script", "openai_compatible_chat", "https://api.together.xyz/v1"],
          ["Mistral AI", "https://mistral.ai", "script", "openai_compatible_chat", "https://api.mistral.ai/v1"],
          ["Cerebras", "https://www.cerebras.ai", "script", "openai_compatible_chat", "https://api.cerebras.ai/v1"],
          ["Fireworks AI", "https://fireworks.ai", "script", "openai_compatible_chat", "https://api.fireworks.ai/inference/v1"],
          ["fal.ai Image", "https://fal.ai", "image", "fal_queue", "https://queue.fal.run"],
          ["fal.ai Video", "https://fal.ai", "video", "fal_queue", "https://queue.fal.run"],
          ["Runway Video", "https://runwayml.com", "video", "runway_v1", "https://api.dev.runwayml.com/v1"],
          ["Runway Image", "https://runwayml.com", "image", "runway_v1", "https://api.dev.runwayml.com/v1"],
          ["Runway Music", "https://runwayml.com", "music", "runway_v1", "https://api.dev.runwayml.com/v1"],
          ["ElevenLabs Voice", "https://elevenlabs.io", "voice", "elevenlabs_v1", "https://api.elevenlabs.io"],
        ];
        await supabase.from("ai_providers").insert(starter.map(([providerName, websiteUrl, providerCategory, adapterKey, baseUrl]) => ({
          owner_id: currentUser.id,
          name: providerName,
          category: providerCategory,
          website_url: websiteUrl,
          connection_type: "official_api",
          capabilities: { adapter_key: adapterKey, api_base_url: baseUrl, api_key_url: apiKeyPortals[providerName], supports: adapterKey === "openai_compatible_chat" ? ["chat_completions", "model_discovery"] : ["credential_verification"] },
          notes: adapterKey === "openai_compatible_chat"
            ? "Starter language-model provider profile. API key and model verification are required before use."
            : "Starter multimodal provider profile. API key verification is required; automated generation awaits its production worker adapter.",
        })));
        const refreshed = await supabase.from("ai_providers").select("*").order("created_at", { ascending: false });
        data = refreshed.data;
        queryError = refreshed.error;
      }
      if (queryError) setError(queryError.message);
      else {
        setProviders(data ?? []);
        const { data: accountData, error: accountError } = await supabase.from("provider_accounts").select("*").order("created_at", { ascending: false });
        if (accountError) setError(accountError.message);
        else setAccounts((accountData ?? []) as Account[]);
      }
    }
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
      : await supabase.from("ai_providers").insert({
          owner_id: user.id, name: payload.name, category: payload.category,
          website_url: payload.website_url, connection_type: payload.connection_type, notes: payload.notes
        });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setShowForm(false); setNotice(editing ? "Provider details updated." : "AI provider added to your registry.");
    await load();
  }

  async function toggle(provider: Provider) {
    const { error: updateError } = await supabase.from("ai_providers").update({ is_enabled: !provider.is_enabled, updated_at: new Date().toISOString() }).eq("id", provider.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function remove(provider: Provider) {
    if (!window.confirm(`Remove ${provider.name} from your provider registry? This also removes its linked account labels.`)) return;
    const { error: deleteError } = await supabase.from("ai_providers").delete().eq("id", provider.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Provider removed."); await load(); }
  }

  function openAccountForm(provider: Provider, account?: Account) {
    setAccountProvider(provider); setEditingAccount(account ?? null);
    setAccountLabel(account?.label ?? ""); setExternalLabel(account?.external_account_label ?? "");
    setAccountMethod(account?.connection_method ?? (["script","general","image","video","voice","music"].includes(provider.category) ? "api_key_reference" : "manual")); setAccountNotes(account?.notes ?? "");
    setApiKey("");
    const savedModels = Array.isArray(account?.verified_models) ? account.verified_models : [];
    setAvailableModels(savedModels);
    setAccountModel(account?.model_id ?? savedModels[0] ?? "");
    setError(""); setShowAccountForm(true);
  }

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !accountProvider) return;
    setBusy(true); setError(""); setNotice("");
    const payload = {
      label: accountLabel.trim(), external_account_label: externalLabel.trim() || null,
      connection_method: accountMethod, notes: accountNotes.trim() || null,
      updated_at: new Date().toISOString()
    };
    const result = editingAccount
      ? await supabase.from("provider_accounts").update(payload).eq("id", editingAccount.id).eq("owner_id", user.id)
      : await supabase.from("provider_accounts").insert({
          owner_id: user.id, provider_id: accountProvider.id, label: payload.label,
          external_account_label: payload.external_account_label, connection_method: payload.connection_method,
          notes: payload.notes
        });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setShowAccountForm(false); setNotice(editingAccount ? "Provider account details updated." : "Account profile added. It is not connected yet.");
    await load();
  }

  async function discoverProviderModels() {
    if (!accountProvider || !editingAccount || !apiKey.trim()) {
      setError("Save the account profile first, then enter its API key to discover available models.");
      return;
    }
    setConnectionTesting(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("provider-control", {
      body: { action: "discover_models", provider_id: accountProvider.id, account_id: editingAccount.id, api_key: apiKey.trim() }
    });
    setConnectionTesting(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "Could not verify this provider."); return; }
    setAvailableModels(data.models ?? []);
    setAccountModel((current) => current && (data.models ?? []).includes(current) ? current : (data.models?.[0] ?? ""));
    setNotice("API key verified. Choose a model, then connect and save the credential securely.");
  }

  async function connectProviderAccount() {
    if (!accountProvider || !editingAccount || !apiKey.trim() || !accountModel) {
      setError("Enter the API key, verify it, and choose one of the returned models.");
      return;
    }
    setConnectionTesting(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("provider-control", {
      body: { action: "connect", provider_id: accountProvider.id, account_id: editingAccount.id, api_key: apiKey.trim(), model_id: accountModel }
    });
    setConnectionTesting(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "Provider connection failed."); return; }
    setApiKey("");
    setNotice("Provider verified and credential saved in encrypted storage. You can now make it your default language model.");
    await load();
  }

  async function connectMediaProviderAccount() {
    if (!accountProvider || !editingAccount || !apiKey.trim() || !accountModel.trim()) {
      setError("Enter the provider API key and the model or endpoint identifier for this account.");
      return;
    }
    setConnectionTesting(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("provider-control", {
      body: { action: "connect_media", provider_id: accountProvider.id, account_id: editingAccount.id, api_key: apiKey.trim(), model_id: accountModel.trim() }
    });
    setConnectionTesting(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "Media provider connection failed."); return; }
    setApiKey("");
    setNotice(data.verification + ". Credential saved in encrypted storage. Automated generation still requires the matching worker adapter.");
    await load();
  }

  async function setDefaultProvider(provider: Provider) {
    const account = accounts.find(item => item.provider_id === provider.id && item.status === "connected");
    if (!account) { setError("Connect and verify an account before setting this provider as default."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("provider-control", {
      body: { action: "set_default", provider_id: provider.id, account_id: account.id }
    });
    setBusy(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "Could not set the default provider."); return; }
    setNotice(provider.name + " is now the default language-model provider for your Creative Director.");
    await load();
  }

  async function disconnectProviderAccount(provider: Provider, account: Account) {
    if (!window.confirm("Disconnect this provider account? Its saved API key will be deleted from secure storage.")) return;
    setBusy(true); setError(""); setNotice("");
    const { data, error: invokeError } = await supabase.functions.invoke("provider-control", {
      body: { action: "disconnect", provider_id: provider.id, account_id: account.id }
    });
    setBusy(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "Could not disconnect this account."); return; }
    setNotice("Provider account disconnected and its encrypted credential deleted.");
    await load();
  }

  async function removeAccount(account: Account) {
    if (!user || !window.confirm("Remove account profile " + account.label + "? Its saved provider credential will also be deleted.")) return;
    const provider = providers.find(item => item.id === account.provider_id);
    if (account.status === "connected" && provider) {
      const { data, error: disconnectError } = await supabase.functions.invoke("provider-control", {
        body: { action: "disconnect", provider_id: provider.id, account_id: account.id }
      });
      if (disconnectError || data?.error) { setError(data?.error || disconnectError?.message || "Could not securely disconnect the account."); return; }
    }
    const { error: deleteError } = await supabase.from("provider_accounts").delete().eq("id", account.id).eq("owner_id", user.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Account profile and any stored credential removed."); await load(); }
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
        <div className="provider-explainer provider-setup-guide"><div className="provider-explainer-icon">01</div><div><strong>Connect your language model in three steps</strong><p>Open an account profile, verify its API key, choose a model returned by the provider, then set the verified provider as default. The key is sent directly to the secure backend and stored encrypted — it is never written to this browser database.</p></div></div>
        {providers.length === 0 ? <div className="panel provider-empty"><div className="empty-icon">✳</div><h3>Your provider registry is empty</h3><p>Add services you already use. You can register video, image, writing, voice, music and editing tools here.</p><button className="secondary-button" onClick={openCreate}>＋ Register your first AI tool</button></div> :
          <div className="provider-grid">{providers.map(provider => <article className="provider-card" key={provider.id}><div className="provider-card-top"><span className={"provider-category-icon " + provider.category}>{(categoryNames[provider.category] || "AI").slice(0,1)}</span><span className={provider.is_enabled ? "provider-enabled" : "provider-disabled"}>{provider.is_enabled ? "Enabled" : "Disabled"}</span></div><h3>{provider.name}</h3><p className="provider-category">{categoryNames[provider.category] || provider.category}</p>{provider.website_url && <a className="provider-url" href={provider.website_url} target="_blank" rel="noreferrer">{provider.website_url.replace(/^https?:\/\//,"").replace(/\/$/,"")} ↗</a>}{typeof provider.capabilities?.api_key_url === "string" && <a className="provider-key-link" href={provider.capabilities.api_key_url} target="_blank" rel="noreferrer">Get API key ↗</a>}<div className="provider-connection"><span className="connection-indicator" />{provider.connection_status.replaceAll("_"," ")} · {provider.connection_type.replaceAll("_"," ")}{provider.is_default ? " · default" : ""}</div>{provider.notes && <p className="provider-notes">{provider.notes}</p>}<div className="provider-account-list"><div className="provider-account-heading"><strong>Account profiles</strong><button onClick={() => openAccountForm(provider)}>＋ Add account</button></div>{accounts.filter(account => account.provider_id === provider.id).length === 0 ? <p className="provider-no-accounts">No account profiles saved yet.</p> : accounts.filter(account => account.provider_id === provider.id).map(account => <div className="provider-account-row" key={account.id}><span className="account-avatar">{account.label.slice(0,1).toUpperCase()}</span><span className="account-copy"><strong>{account.label}</strong><small>{account.external_account_label || "Account label not specified"} · {account.connection_method.replaceAll("_"," ")}{account.model_id ? " · " + account.model_id : ""}</small></span><span className="account-status">{account.status.replaceAll("_"," ")}</span><button className="text-action" onClick={() => openAccountForm(provider, account)}>{account.status === "connected" ? "Manage" : "Connect"}</button>{account.status === "connected" && <button className="text-action danger-action" onClick={() => void disconnectProviderAccount(provider, account)}>Disconnect</button>}<button className="text-action danger-action" onClick={() => void removeAccount(account)}>Remove</button></div>)}</div><div className="provider-actions"><button onClick={() => openEdit(provider)}>Edit provider</button>{["script","general"].includes(provider.category) && <button onClick={() => void setDefaultProvider(provider)} disabled={!accounts.some(account => account.provider_id === provider.id && account.status === "connected")}>{provider.is_default ? "Default provider" : "Set as default"}</button>}<button onClick={() => void toggle(provider)}>{provider.is_enabled ? "Disable" : "Enable"}</button><button className="danger-action" onClick={() => void remove(provider)}>Remove</button></div></article>)}</div>}
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
    {showAccountForm && accountProvider && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowAccountForm(false); }}><form className="project-modal" onSubmit={saveAccount}><div className="modal-top"><div><p className="eyebrow">ACCOUNT PROFILES · ${accountProvider.name}</p><h2>{editingAccount ? "Edit account profile" : "Add account profile"}</h2></div><button type="button" className="close-button" onClick={() => setShowAccountForm(false)} aria-label="Close">×</button></div>
      <label htmlFor="account-label">Workspace label</label><input id="account-label" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} placeholder="e.g. Main production account" maxLength={100} required />
      <label htmlFor="external-account-label">Provider-side account label (optional)</label><input id="external-account-label" value={externalLabel} onChange={e => setExternalLabel(e.target.value)} placeholder="e.g. studio@example.com or Team workspace" maxLength={160} />
      <label htmlFor="account-method">Connection method</label><select id="account-method" value={accountMethod} onChange={e => setAccountMethod(e.target.value)}><option value="manual">Manual handoff</option><option value="oauth">Official OAuth</option><option value="api_key_reference">API key reference</option><option value="browser_session">Supported browser session</option></select>
      {editingAccount && ["script","general"].includes(accountProvider.category) && <div className="provider-credential-panel">
        <div className="provider-credential-heading"><strong>Secure API connection</strong><span className={editingAccount.status === "connected" ? "provider-enabled" : "provider-disabled"}>{editingAccount.status.replaceAll("_"," ")}</span></div>
        <p>Supported language-model providers use a verified API endpoint. Your key is never saved in the account profile.</p>
        <small className="provider-cost-note">Model connection includes one minimal test request. Your provider may charge a very small amount or count it against its quota.</small>
        {editingAccount.api_base_url && <small className="provider-endpoint">Endpoint: {editingAccount.api_base_url}</small>}
        <label htmlFor="provider-api-key">API key</label>
        <input id="provider-api-key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingAccount.status === "connected" ? "Enter a new key only to rotate or re-test" : "Paste the provider API key"} autoComplete="new-password" />
        <button type="button" className="secondary-button" disabled={connectionTesting || !apiKey.trim()} onClick={() => void discoverProviderModels()}>{connectionTesting ? "Checking provider…" : "Verify key & load models"}</button>
        {availableModels.length > 0 && <>
          <label htmlFor="provider-model">Production language model</label>
          <select id="provider-model" value={accountModel} onChange={e => setAccountModel(e.target.value)}>
            {availableModels.map(model => <option value={model} key={model}>{model}</option>)}
          </select>
          <button type="button" className="primary-button" disabled={connectionTesting || !apiKey.trim() || !accountModel} onClick={() => void connectProviderAccount()}>{connectionTesting ? "Saving secure connection…" : "Connect & save credential"}</button>
        </>}
        {editingAccount.status === "connected" && <small className="provider-safe-note">Credential stored encrypted. Leave the API key blank to keep the current connection.</small>}
      </div>}
      {editingAccount && ["image","video","voice","music"].includes(accountProvider.category) && <div className="provider-credential-panel">
        <div className="provider-credential-heading"><strong>Secure media-provider connection</strong><span className={editingAccount.status === "connected" ? "provider-enabled" : "provider-disabled"}>{editingAccount.status.replaceAll("_"," ")}</span></div>
        <p>This checks the provider account without generating an image, video, voice recording or music track. The API key is stored encrypted.</p>
        {editingAccount.api_base_url && <small className="provider-endpoint">Endpoint: {editingAccount.api_base_url}</small>}
        <label htmlFor="media-provider-api-key">API key</label>
        <input id="media-provider-api-key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingAccount.status === "connected" ? "Enter a new key to rotate or re-verify" : "Paste the provider API key"} autoComplete="new-password" />
        <label htmlFor="media-provider-model">Preferred model or endpoint ID</label>
        <input id="media-provider-model" value={accountModel} onChange={e => setAccountModel(e.target.value)} placeholder={accountProvider.name.toLowerCase().includes("fal") ? "fal-ai/flux/dev" : accountProvider.name.toLowerCase().includes("elevenlabs") ? "eleven_multilingual_v2" : "gen4.5"} maxLength={240} />
        <button type="button" className="primary-button" disabled={connectionTesting || !apiKey.trim() || !accountModel.trim()} onClick={() => void connectMediaProviderAccount()}>{connectionTesting ? "Verifying & saving…" : editingAccount.status === "connected" ? "Re-verify & update credential" : "Verify & save secure connection"}</button>
        {editingAccount.status === "connected" && <small className="provider-safe-note">Credential is encrypted. Leave the API key blank unless you want to rotate or re-verify it.</small>}
        <small className="provider-cost-note">This account check does not submit a generation request. The selected model identifier is saved as your preferred route; a worker adapter is still required for automated production.</small>
      </div>}
      <label htmlFor="account-notes">Notes</label><textarea id="account-notes" className="provider-notes-input" value={accountNotes} onChange={e => setAccountNotes(e.target.value)} placeholder="Purpose, plan notes or account-specific capabilities…" rows={3} />
      <div className="modal-note">Save this account profile first. Then verify the API key and select a model in the secure connection panel. Never paste provider passwords, session cookies or recovery codes.</div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowAccountForm(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : editingAccount ? "Save account details" : "Add account profile"}</button></div>
    </form></div>}
  </main>;
}
