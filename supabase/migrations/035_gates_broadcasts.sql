-- Multi-gate visitor entry/exit + society-wide broadcast alerts.

-- ---------------------------------------------------------------------------
-- Gates (multi-entry points per society)
-- ---------------------------------------------------------------------------

create table if not exists public.gates (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (society_id, name)
);

create index if not exists gates_society_id_idx on public.gates (society_id);

alter table public.gates enable row level security;

drop policy if exists "Members can read gates" on public.gates;
create policy "Members can read gates"
  on public.gates for select
  using (society_id = public.current_society_id());

drop policy if exists "Admins manage gates" on public.gates;
create policy "Admins manage gates"
  on public.gates for all
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

-- Seed a default Main Gate for every existing society
insert into public.gates (society_id, name, sort_order)
select s.id, 'Main Gate', 0
from public.societies s
where not exists (
  select 1 from public.gates g where g.society_id = s.id
);

-- Auto-seed Main Gate when a society is created
create or replace function public.seed_default_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gates (society_id, name, sort_order)
  values (new.id, 'Main Gate', 0)
  on conflict (society_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists societies_after_insert_seed_gate on public.societies;
create trigger societies_after_insert_seed_gate
  after insert on public.societies
  for each row
  execute function public.seed_default_gate();

-- ---------------------------------------------------------------------------
-- visitor_logs: track which gate for entry and exit
-- ---------------------------------------------------------------------------

alter table public.visitor_logs
  add column if not exists entry_gate_id uuid references public.gates (id) on delete set null,
  add column if not exists exit_gate_id uuid references public.gates (id) on delete set null;

create index if not exists visitor_logs_entry_gate_id_idx
  on public.visitor_logs (entry_gate_id)
  where entry_gate_id is not null;

create index if not exists visitor_logs_exit_gate_id_idx
  on public.visitor_logs (exit_gate_id)
  where exit_gate_id is not null;

-- ---------------------------------------------------------------------------
-- Broadcast alerts (push-only, urgent, no ack)
-- ---------------------------------------------------------------------------

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  title text not null,
  body text not null,
  severity text not null default 'urgent'
    check (severity in ('info', 'urgent', 'critical')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists broadcasts_society_created_idx
  on public.broadcasts (society_id, created_at desc);

alter table public.broadcasts enable row level security;

drop policy if exists "Members can read broadcasts" on public.broadcasts;
create policy "Members can read broadcasts"
  on public.broadcasts for select
  using (society_id = public.current_society_id());

drop policy if exists "Admins create broadcasts" on public.broadcasts;
create policy "Admins create broadcasts"
  on public.broadcasts for insert
  with check (society_id = public.current_society_id() and public.is_admin());

drop policy if exists "Admins delete broadcasts" on public.broadcasts;
create policy "Admins delete broadcasts"
  on public.broadcasts for delete
  using (society_id = public.current_society_id() and public.is_admin());

alter table public.broadcasts replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.broadcasts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
