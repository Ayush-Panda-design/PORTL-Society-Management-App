-- Profile bio (society-visible) + private personal fields + personal notes.
-- Admins/society members can read public bio columns on profiles.
-- profile_private and profile_notes are owner-only (admins cannot SELECT).

-- ---------------------------------------------------------------------------
-- Public / admin-visible bio fields on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists bio text,
  add column if not exists occupation text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists vehicle_number text;

-- ---------------------------------------------------------------------------
-- Private personal details — only the owner can read/write
-- ---------------------------------------------------------------------------

create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  personal_email text,
  date_of_birth date,
  blood_group text,
  allergies text,
  permanent_address text,
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

create policy "Owners can read own private profile"
  on public.profile_private for select
  using (user_id = auth.uid());

create policy "Owners can insert own private profile"
  on public.profile_private for insert
  with check (user_id = auth.uid());

create policy "Owners can update own private profile"
  on public.profile_private for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Owners can delete own private profile"
  on public.profile_private for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Personal notes — owner-only, created_at stamped automatically
-- ---------------------------------------------------------------------------

create table if not exists public.profile_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists profile_notes_user_id_created_at_idx
  on public.profile_notes (user_id, created_at desc);

alter table public.profile_notes enable row level security;

create policy "Owners can read own notes"
  on public.profile_notes for select
  using (user_id = auth.uid());

create policy "Owners can insert own notes"
  on public.profile_notes for insert
  with check (user_id = auth.uid());

create policy "Owners can update own notes"
  on public.profile_notes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Owners can delete own notes"
  on public.profile_notes for delete
  using (user_id = auth.uid());
