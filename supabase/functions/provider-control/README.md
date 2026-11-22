# Provider Control

Authenticated Supabase Edge Function for connecting and managing private AI provider accounts.

## Supported credential verification

| Provider adapter | Category | Verification | Stored connection |
| --- | --- | --- | --- |
| OpenAI-compatible chat | Script / General | Authenticated model-list request and one minimal chat completion using the selected model | Base URL, model ID, verified model list, encrypted API key |
| Runway API v1 | Image / Video / Voice / Music | Read-only organization account/credit lookup | Runway API key and preferred model ID |
| fal Queue API | Image / Video / Voice / Music | Read-only status lookup for a deliberately nonexistent request; no generation submitted | fal API key and preferred model endpoint |
| ElevenLabs API | Voice / Music | Read-only user subscription lookup | ElevenLabs API key and preferred model ID |

All supported endpoints are fixed allowlisted URLs. The function does not accept arbitrary user-supplied URLs, which avoids turning provider verification into an SSRF proxy.

## Actions

- `discover_models`: verifies an OpenAI-compatible provider key and returns its model IDs. It does not save the key.
- `connect`: verifies the selected chat model with a minimal request, then stores the key in Supabase Vault.
- `connect_media`: verifies Runway, fal or ElevenLabs credentials without starting media generation, then stores the key in Supabase Vault.
- `set_default`: sets the verified script/general provider as the user's default language model.
- `disconnect`: clears the account reference; a database trigger deletes the encrypted Vault secret.

## Security

- JWT verification is enabled.
- The user's bearer token is validated before any provider action.
- Provider and account ownership are checked using the caller-scoped Supabase client.
- Secret storage and retrieval use server-only database functions granted to `service_role`.
- The raw API key is never returned, logged, or written to ordinary provider tables.
- Browser users cannot directly update provider connection status, default flags, API model configuration, or secret references.
- Provider API credentials are never sent to the client after the request.
- The Creative Director reads the chosen user's default text provider through a server-only RPC.

## Important boundary

Credential verification is not the same as a production generation adapter. The media provider connections are verified and stored, but the Production Director correctly keeps execution readiness false until the task worker has real adapters for the provider's generation, polling, asset storage, and retry lifecycle. FFmpeg/final assembly must run on a separate worker, not inside a short-lived Supabase Edge Function.
