-- Secure provider connection metadata and per-account encrypted API credentials.
alter table public.provider_accounts
  add column if not exists api_base_url text,
  add column if not exists model_id text,
  add column if not exists adapter_key text,
  add column if not exists verified_models jsonb not null default '[]'::jsonb,
  add column if not exists last_tested_at timestamptz,
  add column if not exists connection_error text;
alter table public.provider_accounts drop constraint if exists provider_accounts_verified_models_array_check;
alter table public.provider_accounts add constraint provider_accounts_verified_models_array_check check (jsonb_typeof(verified_models) = 'array');
create index if not exists provider_accounts_connected_provider_idx on public.provider_accounts(owner_id, provider_id, status, last_verified_at desc);
revoke all privileges on public.ai_providers from authenticated;
grant select, delete on public.ai_providers to authenticated;
grant insert(owner_id, name, category, website_url, connection_type, capabilities, notes) on public.ai_providers to authenticated;
grant update(name, category, website_url, connection_type, capabilities, is_enabled, notes, updated_at) on public.ai_providers to authenticated;
revoke all privileges on public.provider_accounts from authenticated;
grant select, delete on public.provider_accounts to authenticated;
grant insert(owner_id, provider_id, label, external_account_label, connection_method, notes) on public.provider_accounts to authenticated;
grant update(label, external_account_label, connection_method, notes, updated_at) on public.provider_accounts to authenticated;
create or replace function public.cleanup_provider_secret_on_account_change()
returns trigger language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare old_secret_id uuid;
begin
  if old.secret_reference is not null
     and old.secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and (tg_op = 'DELETE' or old.secret_reference is distinct from new.secret_reference) then
    old_secret_id := old.secret_reference::uuid;
    delete from vault.secrets where id = old_secret_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists provider_account_secret_cleanup on public.provider_accounts;
create trigger provider_account_secret_cleanup before update of secret_reference or delete on public.provider_accounts for each row execute function public.cleanup_provider_secret_on_account_change();
create or replace function public.store_provider_secret(p_owner_id uuid,p_provider_id uuid,p_account_id uuid,p_secret text,p_api_base_url text,p_model_id text,p_verified_models jsonb)
returns jsonb language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare v_provider_name text; v_secret_reference text; v_secret_id uuid; v_secret_name text;
begin
  if p_secret is null or length(trim(p_secret)) < 8 or length(p_secret) > 4096 then raise exception 'A valid provider API key is required'; end if;
  if p_api_base_url is null or p_api_base_url !~ '^https://[a-zA-Z0-9.-]+(/[a-zA-Z0-9._~/-]*)?$' then raise exception 'The verified HTTPS provider endpoint is invalid'; end if;
  if p_model_id is null or length(trim(p_model_id)) = 0 or length(p_model_id) > 240 then raise exception 'Select a model before connecting this provider'; end if;
  if p_verified_models is null or jsonb_typeof(p_verified_models) <> 'array' then raise exception 'Verified model list is invalid'; end if;
  select p.name,a.secret_reference into v_provider_name,v_secret_reference
  from public.ai_providers p join public.provider_accounts a on a.provider_id=p.id
  where p.id=p_provider_id and p.owner_id=p_owner_id and p.is_enabled=true and p.category in ('script','general')
    and a.id=p_account_id and a.owner_id=p_owner_id for update of a;
  if not found then raise exception 'Provider or account not found, disabled, or not eligible for this adapter'; end if;
  v_secret_name := 'provider_' || replace(p_account_id::text,'-','');
  if v_secret_reference is not null and v_secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and exists(select 1 from vault.secrets where id=v_secret_reference::uuid) then
    v_secret_id := v_secret_reference::uuid;
    perform vault.update_secret(v_secret_id,p_secret,v_secret_name,'Encrypted API credential for '||v_provider_name||' account '||p_account_id::text,null);
  else
    select vault.create_secret(p_secret,v_secret_name,'Encrypted API credential for '||v_provider_name||' account '||p_account_id::text,null) into v_secret_id;
  end if;
  update public.provider_accounts set secret_reference=v_secret_id::text,api_base_url=p_api_base_url,model_id=p_model_id,
    adapter_key='openai_compatible_chat',verified_models=p_verified_models,status='connected',last_verified_at=now(),
    last_tested_at=now(),connection_error=null,updated_at=now()
  where id=p_account_id and provider_id=p_provider_id and owner_id=p_owner_id;
  update public.ai_providers set connection_status='connected',connection_type='official_api',is_enabled=true,updated_at=now()
  where id=p_provider_id and owner_id=p_owner_id;
  return jsonb_build_object('ok',true,'provider_id',p_provider_id,'account_id',p_account_id);
end; $$;
create or replace function public.read_provider_secret(p_owner_id uuid,p_provider_id uuid,p_account_id uuid)
returns text language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare v_secret text;
begin
  select ds.decrypted_secret into v_secret from public.provider_accounts a
  join public.ai_providers p on p.id=a.provider_id and p.owner_id=a.owner_id
  join vault.decrypted_secrets ds on ds.id::text=a.secret_reference
  where a.id=p_account_id and a.provider_id=p_provider_id and a.owner_id=p_owner_id
    and a.status='connected' and p.connection_status='connected' and p.is_enabled=true;
  return v_secret;
end; $$;
create or replace function public.set_default_ai_provider(p_owner_id uuid,p_provider_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_category text;
begin
  select category into v_category from public.ai_providers where id=p_provider_id and owner_id=p_owner_id and is_enabled=true;
  if v_category is null then return false; end if;
  if not exists(select 1 from public.provider_accounts where provider_id=p_provider_id and owner_id=p_owner_id
    and status='connected' and adapter_key='openai_compatible_chat' and secret_reference is not null and model_id is not null) then return false; end if;
  update public.ai_providers set is_default=false,updated_at=now() where owner_id=p_owner_id and category=v_category and is_default=true;
  update public.ai_providers set is_default=true,updated_at=now() where id=p_provider_id and owner_id=p_owner_id;
  return true;
end; $$;
create or replace function public.disconnect_provider_account(p_owner_id uuid,p_provider_id uuid,p_account_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_updated integer;
begin
  update public.provider_accounts set secret_reference=null,api_base_url=null,model_id=null,adapter_key=null,verified_models='[]'::jsonb,
    status='not_connected',last_verified_at=null,last_tested_at=now(),connection_error=null,updated_at=now()
  where id=p_account_id and provider_id=p_provider_id and owner_id=p_owner_id;
  get diagnostics v_updated=row_count;
  if v_updated=0 then return false; end if;
  if not exists(select 1 from public.provider_accounts where provider_id=p_provider_id and owner_id=p_owner_id and status='connected') then
    update public.ai_providers set connection_status='not_connected',is_default=false,updated_at=now() where id=p_provider_id and owner_id=p_owner_id;
  end if;
  return true;
end; $$;
revoke all on function public.cleanup_provider_secret_on_account_change() from public,anon,authenticated;
revoke all on function public.store_provider_secret(uuid,uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.read_provider_secret(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.set_default_ai_provider(uuid,uuid) from public,anon,authenticated;
revoke all on function public.disconnect_provider_account(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.store_provider_secret(uuid,uuid,uuid,text,text,text,jsonb) to service_role;
grant execute on function public.read_provider_secret(uuid,uuid,uuid) to service_role;
grant execute on function public.set_default_ai_provider(uuid,uuid) to service_role;
grant execute on function public.disconnect_provider_account(uuid,uuid,uuid) to service_role;

-- Generic, allowlisted adapter connection storage for multimodal providers.
create or replace function public.store_provider_connection(
  p_owner_id uuid,p_provider_id uuid,p_account_id uuid,p_secret text,
  p_api_base_url text,p_model_id text,p_adapter_key text,p_verified_models jsonb
)
returns jsonb language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare v_provider_name text; v_category text; v_secret_reference text; v_secret_id uuid; v_secret_name text; v_adapter_valid boolean := false;
begin
  if p_secret is null or length(trim(p_secret)) < 8 or length(p_secret) > 4096 then raise exception 'A valid provider API key is required'; end if;
  if p_model_id is null or length(trim(p_model_id))=0 or length(p_model_id)>240 then raise exception 'A provider model or endpoint identifier is required'; end if;
  if p_verified_models is null or jsonb_typeof(p_verified_models)<>'array' then raise exception 'Verified provider capabilities are invalid'; end if;
  select p.name,p.category,a.secret_reference into v_provider_name,v_category,v_secret_reference
  from public.ai_providers p join public.provider_accounts a on a.provider_id=p.id
  where p.id=p_provider_id and p.owner_id=p_owner_id and p.is_enabled=true and a.id=p_account_id and a.owner_id=p_owner_id
  for update of a;
  if not found then raise exception 'Provider or account not found, disabled, or not owned by this user'; end if;
  v_adapter_valid :=
    (p_adapter_key='openai_compatible_chat' and v_category in ('script','general') and p_api_base_url in (
      'https://api.openai.com/v1','https://openrouter.ai/api/v1','https://api.groq.com/openai/v1',
      'https://generativelanguage.googleapis.com/v1beta/openai','https://api.deepseek.com/v1',
      'https://api.together.xyz/v1','https://api.mistral.ai/v1','https://api.cerebras.ai/v1','https://api.fireworks.ai/inference/v1'))
    or (p_adapter_key='runway_v1' and v_category in ('image','video','voice','music') and p_api_base_url='https://api.dev.runwayml.com/v1')
    or (p_adapter_key='fal_queue' and v_category in ('image','video','voice','music') and p_api_base_url='https://queue.fal.run')
    or (p_adapter_key='elevenlabs_v1' and v_category in ('voice','music') and p_api_base_url='https://api.elevenlabs.io');
  if not v_adapter_valid then raise exception 'This adapter is not approved for the provider category or endpoint'; end if;
  v_secret_name := 'provider_'||replace(p_account_id::text,'-','');
  if v_secret_reference is not null and v_secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and exists(select 1 from vault.secrets where id=v_secret_reference::uuid) then
    v_secret_id := v_secret_reference::uuid;
    perform vault.update_secret(v_secret_id,p_secret,v_secret_name,'Encrypted API credential for '||v_provider_name||' account '||p_account_id::text,null);
  else
    select vault.create_secret(p_secret,v_secret_name,'Encrypted API credential for '||v_provider_name||' account '||p_account_id::text,null) into v_secret_id;
  end if;
  update public.provider_accounts set secret_reference=v_secret_id::text,api_base_url=p_api_base_url,model_id=trim(p_model_id),
    adapter_key=p_adapter_key,verified_models=p_verified_models,status='connected',last_verified_at=now(),last_tested_at=now(),
    connection_error=null,updated_at=now()
  where id=p_account_id and provider_id=p_provider_id and owner_id=p_owner_id;
  update public.ai_providers set connection_status='connected',connection_type='official_api',is_enabled=true,updated_at=now()
  where id=p_provider_id and owner_id=p_owner_id;
  return jsonb_build_object('ok',true,'provider_id',p_provider_id,'account_id',p_account_id,'adapter_key',p_adapter_key);
end; $$;
revoke all on function public.store_provider_connection(uuid,uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.store_provider_connection(uuid,uuid,uuid,text,text,text,text,jsonb) to service_role;

-- Disabling a provider must also clear its default-routing flag.
create or replace function public.clear_default_ai_provider_when_disabled()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.is_enabled = false then new.is_default := false; end if;
  return new;
end; $$;
revoke all on function public.clear_default_ai_provider_when_disabled() from public,anon,authenticated;
drop trigger if exists ai_provider_disable_clears_default on public.ai_providers;
create trigger ai_provider_disable_clears_default before update of is_enabled on public.ai_providers
for each row execute function public.clear_default_ai_provider_when_disabled();

-- Keep the provider registry consistent if an owner removes an account directly.
create or replace function public.sync_provider_after_account_delete()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.ai_providers p
  set connection_status=case when exists(select 1 from public.provider_accounts a where a.provider_id=old.provider_id and a.owner_id=old.owner_id and a.status='connected') then 'connected' else 'not_connected' end,
      is_default=case when exists(select 1 from public.provider_accounts a where a.provider_id=old.provider_id and a.owner_id=old.owner_id and a.status='connected') then p.is_default else false end,
      updated_at=now()
  where p.id=old.provider_id and p.owner_id=old.owner_id;
  return old;
end; $$;
revoke all on function public.sync_provider_after_account_delete() from public,anon,authenticated;
drop trigger if exists provider_account_delete_sync on public.provider_accounts;
create trigger provider_account_delete_sync after delete on public.provider_accounts
for each row execute function public.sync_provider_after_account_delete();
