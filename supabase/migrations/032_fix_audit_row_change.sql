-- Fix audit_row_change: never touch NEW/OLD typed fields that only exist on
-- some tables (e.g. tower_id on flats). Use jsonb so the same trigger is safe
-- on complaints, notices, visitors, and flats.
-- Error seen in app: record "new" has no field "tower_id"

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid;
  v_entity_id uuid;
  v_action text;
  v_meta jsonb;
  v_row jsonb;
  v_flat_id uuid;
  v_tower_id uuid;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_entity_id := old.id;
    v_action := tg_argv[0] || '.delete';
    v_meta := v_row;
  elsif tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_entity_id := new.id;
    v_action := tg_argv[0] || '.create';
    v_meta := v_row;
  else
    v_row := to_jsonb(new);
    v_entity_id := new.id;
    v_action := tg_argv[0] || '.update';
    v_meta := jsonb_build_object('old', to_jsonb(old), 'new', v_row);
  end if;

  if v_row ? 'society_id' and nullif(v_row ->> 'society_id', '') is not null then
    v_society := (v_row ->> 'society_id')::uuid;
  elsif tg_argv[0] = 'complaint' then
    v_flat_id := nullif(v_row ->> 'flat_id', '')::uuid;
    if v_flat_id is not null then
      v_society := public.complaint_society_id(v_flat_id);
    end if;
  elsif tg_argv[0] = 'flat' then
    v_tower_id := nullif(v_row ->> 'tower_id', '')::uuid;
    if v_tower_id is not null then
      select t.society_id into v_society
      from public.towers t
      where t.id = v_tower_id;
    end if;
  else
    v_society := public.current_society_id();
  end if;

  if v_society is null then
    return coalesce(new, old);
  end if;

  -- Only log when an authenticated actor is present (skip system/cron noise)
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  insert into public.audit_logs (
    society_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    v_society,
    auth.uid(),
    v_action,
    tg_argv[0],
    v_entity_id,
    v_meta
  );

  return coalesce(new, old);
end;
$$;
