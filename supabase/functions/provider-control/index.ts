import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const providerEndpoints: Record<string, string> = {
  "openai": "https://api.openai.com/v1",
  "openrouter": "https://openrouter.ai/api/v1",
  "groq": "https://api.groq.com/openai/v1",
  "google gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
  "deepseek": "https://api.deepseek.com/v1",
  "together ai": "https://api.together.xyz/v1",
  "mistral ai": "https://api.mistral.ai/v1",
  "cerebras": "https://api.cerebras.ai/v1",
  "fireworks ai": "https://api.fireworks.ai/inference/v1",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseKey(kind: "publishable" | "secret") {
  const legacy = kind === "publishable"
    ? Deno.env.get("SUPABASE_ANON_KEY")
    : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return { key: legacy, legacy: true };

  const raw = Deno.env.get(kind === "publishable" ? "SUPABASE_PUBLISHABLE_KEYS" : "SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const key = parsed.default ?? Object.values(parsed)[0];
      if (typeof key === "string" && key) return { key, legacy: false };
    } catch { /* handled by missing-key response */ }
  }

  const fallback = kind === "publishable"
    ? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    : Deno.env.get("SUPABASE_SECRET_KEY");
  return fallback ? { key: fallback, legacy: !fallback.startsWith("sb_") } : null;
}

async function callAdminRpc(url: string, functionName: string, args: Record<string, unknown>) {
  const credential = getSupabaseKey("secret");
  if (!credential) throw new Error("Secure server-side Supabase credentials are not configured.");
  const headers: Record<string, string> = {
    "apikey": credential.key,
    "Content-Type": "application/json",
  };
  if (credential.legacy) headers.Authorization = "Bearer " + credential.key;

  const response = await fetch(url + "/rest/v1/rpc/" + functionName, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Secure provider storage failed (" + response.status + "). " + detail.slice(0, 240));
  }
  return await response.json();
}

async function verifyProviderKey(baseUrl: string, apiKey: string, providerName: string) {
  if (providerName.trim().toLowerCase() === "openrouter") {
    const keyCheck = await fetch(baseUrl + "/key", {
      method: "GET",
      headers: { "Authorization": "Bearer " + apiKey, "Accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!keyCheck.ok) throw new Error(keyCheck.status === 401 || keyCheck.status === 403
      ? "OpenRouter rejected this API key. Check its status in your OpenRouter account."
      : "OpenRouter key verification failed (HTTP " + keyCheck.status + ").");
  }
}

async function verifyChatModel(baseUrl: string, apiKey: string, modelId: string) {
  const modernTokenModels = /(^|[/:])(?:gpt-5|o1|o3|o4)/i.test(modelId);
  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: "user", content: "Reply with OK only." }],
  };
  if (modernTokenModels) requestBody.max_completion_tokens = 4;
  else {
    requestBody.max_tokens = 4;
    requestBody.temperature = 0;
  }
  const response = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? "The provider rejected the API key during the model test."
      : response.status === 402
        ? "The provider account has insufficient balance or quota for this model."
        : "The selected model failed its minimal chat-completion test (HTTP " + response.status + "). Choose another model or check provider access.");
  }
  const payload = await response.json();
  if (!Array.isArray(payload?.choices) || payload.choices.length === 0) {
    throw new Error("The selected model returned an unexpected chat-completion response.");
  }
}

async function fetchModels(baseUrl: string, apiKey: string, providerName: string) {
  await verifyProviderKey(baseUrl, apiKey, providerName);
  const response = await fetch(baseUrl + "/models", {
    method: "GET",
    headers: { "Authorization": "Bearer " + apiKey, "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Do not echo upstream response bodies: they can contain sensitive request details.
    throw new Error(response.status === 401 || response.status === 403
      ? "The provider rejected this API key. Check that it is active and belongs to the selected account."
      : "The provider model-list check failed (HTTP " + response.status + "). Confirm the account's API access and try again.");
  }
  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
  const ids = [...new Set(rows.map((row: Record<string, unknown>) => row?.id ?? row?.name)
    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 240))];
  if (!ids.length) throw new Error("The provider authenticated, but its /models response did not contain compatible model IDs.");
  return ids.slice(0, 100) as string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in to manage provider connections." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishable = getSupabaseKey("publishable");
  if (!supabaseUrl || !publishable) return reply({ error: "Workspace backend configuration is incomplete." }, 503);

  const supabase = createClient(supabaseUrl, publishable.key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Your session is invalid or expired. Sign in again." }, 401);

  let body: {
    action?: string; provider_id?: string; account_id?: string;
    api_key?: string; model_id?: string;
  };
  try { body = await req.json(); } catch { return reply({ error: "A valid JSON request is required." }, 400); }

  const action = body.action;
  const providerId = body.provider_id;
  const accountId = body.account_id;
  if (!providerId || !accountId || !["discover_models", "connect", "set_default", "disconnect"].includes(action ?? "")) {
    return reply({ error: "A provider, account and supported connection action are required." }, 400);
  }

  const ownerId = authData.user.id;
  const [{ data: provider, error: providerError }, { data: account, error: accountError }] = await Promise.all([
    supabase.from("ai_providers").select("id,name,category,is_enabled")
      .eq("id", providerId).eq("owner_id", ownerId).single(),
    supabase.from("provider_accounts").select("id,provider_id,status")
      .eq("id", accountId).eq("provider_id", providerId).eq("owner_id", ownerId).single(),
  ]);
  if (providerError || !provider) return reply({ error: "Provider not found or access denied." }, 404);
  if (accountError || !account) return reply({ error: "Provider account not found or access denied." }, 404);

  try {
    if (action === "set_default") {
      const result = await callAdminRpc(supabaseUrl, "set_default_ai_provider", {
        p_owner_id: ownerId, p_provider_id: providerId,
      });
      if (result !== true) return reply({ error: "Connect and verify an account for this provider before making it the default." }, 409);
      return reply({ ok: true, action, provider_id: providerId });
    }

    if (action === "disconnect") {
      const result = await callAdminRpc(supabaseUrl, "disconnect_provider_account", {
        p_owner_id: ownerId, p_provider_id: providerId, p_account_id: accountId,
      });
      if (result !== true) return reply({ error: "The provider account could not be disconnected." }, 404);
      return reply({ ok: true, action, account_id: accountId });
    }

    if (!provider.is_enabled) return reply({ error: "Enable this provider before connecting it." }, 409);
    if (!["script", "general"].includes(provider.category)) {
      return reply({ error: "This first connection adapter supports language-model providers. Image, video, voice and music adapters are being added separately." }, 422);
    }

    const baseUrl = providerEndpoints[String(provider.name).trim().toLowerCase()];
    if (!baseUrl) return reply({
      error: "There is no verified API adapter for this provider yet. Use one of the supported language-model providers or keep this provider as a manual handoff.",
      code: "PROVIDER_ADAPTER_UNAVAILABLE",
    }, 422);

    const apiKey = body.api_key?.trim();
    if (!apiKey || apiKey.length < 8 || apiKey.length > 4096) return reply({ error: "Enter a valid API key in the secure connection form." }, 400);

    const models = await fetchModels(baseUrl, apiKey, provider.name);
    if (action === "discover_models") {
      return reply({ ok: true, action, provider: provider.name, api_base_url: baseUrl, models });
    }

    const modelId = body.model_id?.trim();
    if (!modelId || !models.includes(modelId)) {
      return reply({ error: "Choose a model returned by the successful provider test before saving this connection.", models }, 422);
    }

    // This small live request confirms the chosen model actually accepts chat completions.
    // It may consume a minimal amount of the provider's quota.
    await verifyChatModel(baseUrl, apiKey, modelId);

    const stored = await callAdminRpc(supabaseUrl, "store_provider_secret", {
      p_owner_id: ownerId,
      p_provider_id: providerId,
      p_account_id: accountId,
      p_secret: apiKey,
      p_api_base_url: baseUrl,
      p_model_id: modelId,
      p_verified_models: models,
    });
    if (!stored?.ok) throw new Error("The provider credential could not be saved securely.");
    return reply({
      ok: true, action: "connect", provider: provider.name,
      account_id: accountId, model_id: modelId, model_count: models.length,
      connection_status: "connected",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider connection failed.";
    return reply({ error: message }, 502);
  }
});
