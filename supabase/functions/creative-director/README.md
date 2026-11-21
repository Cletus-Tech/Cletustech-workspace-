# Creative Director Edge Function

This function powers the first AI-assisted stages of a production:

1. `analyze` — reads the project brief and production bible, then saves a structured project analysis.
2. `concepts` — uses the saved analysis to create three alternative creative concepts.
3. `script` — writes a complete screenplay from the concept the user selected.
4. `refine` — edits the screenplay for story logic, dialogue, pacing, emotional impact and continuity.

## Security

- The function requires a valid Supabase user JWT.
- It reads and updates project data through the caller's authenticated Supabase client, so existing row-level security remains in force.
- Provider credentials are read only from Supabase Edge Function secrets. They are never sent to the browser or written into project metadata.
- Provider accounts must use an OpenAI-compatible Chat Completions endpoint.

## Required Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `AI_API_KEY` — the API key issued by your chosen AI provider.
- `AI_MODEL` — the exact model identifier supported by that provider.

Optional:

- `AI_CHAT_COMPLETIONS_URL` — full Chat Completions URL. If omitted, the function uses `https://api.openai.com/v1/chat/completions`.

Do not commit secrets to GitHub or paste them into a chat. Use a provider/model that you are authorised to use and check its current pricing and usage limits before enabling it.

## Client invocation

The signed-in client calls:

```ts
supabase.functions.invoke("creative-director", {
  body: { project_id: project.id, action: "analyze" }
});
```

Use `action: "concepts"` only after a project analysis has been saved.

A missing AI key/model returns `503` with code `AI_PROVIDER_NOT_CONFIGURED`; it does not create fabricated AI output.
