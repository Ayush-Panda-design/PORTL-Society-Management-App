-- Portl initial schema + Row Level Security
-- Run against your Supabase Postgres database.

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null
);

create table public.towers (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  name text not null
);

create table public.flats (
  id uuid primary key default gen_random_uuid(),
  tower_id uuid not null references public.towers (id) on delete cascade,
  number text not null
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('resident', 'guard', 'admin')),
  full_name text,
  phone text,
  flat_id uuid references public.flats (id) on delete set null,
  society_id uuid references public.societies (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  photo_url text,
  purpose text,
  type text not null check (type in ('guest', 'delivery', 'cab', 'service')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'checked_in', 'checked_out')),
  flat_id uuid not null references public.flats (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  society_id uuid not null references public.societies (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.visitor_logs (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.visitors (id) on delete cascade,
  entry_time timestamptz,
  exit_time timestamptz,
  guard_id uuid references public.profiles (id) on delete set null
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  title text not null,
  body text not null,
  posted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null
);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option text not null,
  unique (poll_id, user_id)
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats (id) on delete cascade,
  category text not null,
  description text not null,
  status text not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  name text not null,
  description text,
  slots jsonb not null default '[]'::jsonb
);

create table public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  flat_id uuid not null references public.flats (id) on delete cascade,
  date date not null,
  slot text not null,
  status text not null default 'booked'
);

create table public.staff_directory (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  name text not null,
  role text not null,
  phone text,
  photo_url text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index profiles_society_id_idx on public.profiles (society_id);
create index profiles_flat_id_idx on public.profiles (flat_id);
create index towers_society_id_idx on public.towers (society_id);
create index flats_tower_id_idx on public.flats (tower_id);
create index visitors_society_id_idx on public.visitors (society_id);
create index visitors_flat_id_idx on public.visitors (flat_id);
create index visitor_logs_visitor_id_idx on public.visitor_logs (visitor_id);
create index notices_society_id_idx on public.notices (society_id);
create index polls_society_id_idx on public.polls (society_id);
create index complaints_flat_id_idx on public.complaints (flat_id);
create index amenities_society_id_idx on public.amenities (society_id);
create index amenity_bookings_amenity_id_idx on public.amenity_bookings (amenity_id);
create index staff_directory_society_id_idx on public.staff_directory (society_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_society_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select society_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_flat_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select flat_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_guard()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'guard'
  );
$$;

create or replace function public.is_resident()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'resident'
  );
$$;

create or replace function public.flat_belongs_to_society(p_flat_id uuid, p_society_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.flats f
    join public.towers t on t.id = f.tower_id
    where f.id = p_flat_id and t.society_id = p_society_id
  );
$$;

create or replace function public.complaint_society_id(p_flat_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.society_id
  from public.flats f
  join public.towers t on t.id = f.tower_id
  where f.id = p_flat_id;
$$;

-- Auto-create profile from auth.users metadata on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone, society_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'resident'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'society_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.societies enable row level security;
alter table public.towers enable row level security;
alter table public.flats enable row level security;
alter table public.profiles enable row level security;
alter table public.visitors enable row level security;
alter table public.visitor_logs enable row level security;
alter table public.notices enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.complaints enable row level security;
alter table public.amenities enable row level security;
alter table public.amenity_bookings enable row level security;
alter table public.staff_directory enable row level security;

-- ---------------------------------------------------------------------------
-- Societies
-- ---------------------------------------------------------------------------

create policy "Members can read own society"
  on public.societies for select
  using (id = public.current_society_id());

create policy "Admins can insert societies"
  on public.societies for insert
  with check (public.is_admin());

create policy "Admins can update own society"
  on public.societies for update
  using (id = public.current_society_id() and public.is_admin())
  with check (id = public.current_society_id() and public.is_admin());

create policy "Admins can delete own society"
  on public.societies for delete
  using (id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Towers
-- ---------------------------------------------------------------------------

create policy "Members can read society towers"
  on public.towers for select
  using (society_id = public.current_society_id());

create policy "Admins can insert towers"
  on public.towers for insert
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can update towers"
  on public.towers for update
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can delete towers"
  on public.towers for delete
  using (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Flats
-- ---------------------------------------------------------------------------

create policy "Members can read society flats"
  on public.flats for select
  using (
    exists (
      select 1 from public.towers t
      where t.id = flats.tower_id and t.society_id = public.current_society_id()
    )
  );

create policy "Admins can insert flats"
  on public.flats for insert
  with check (
    public.is_admin()
    and exists (
      select 1 from public.towers t
      where t.id = tower_id and t.society_id = public.current_society_id()
    )
  );

create policy "Admins can update flats"
  on public.flats for update
  using (
    public.is_admin()
    and exists (
      select 1 from public.towers t
      where t.id = flats.tower_id and t.society_id = public.current_society_id()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.towers t
      where t.id = tower_id and t.society_id = public.current_society_id()
    )
  );

create policy "Admins can delete flats"
  on public.flats for delete
  using (
    public.is_admin()
    and exists (
      select 1 from public.towers t
      where t.id = flats.tower_id and t.society_id = public.current_society_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Members can read profiles in own society"
  on public.profiles for select
  using (society_id = public.current_society_id());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can update profiles in own society"
  on public.profiles for update
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can delete profiles in own society"
  on public.profiles for delete
  using (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Visitors
-- Residents: own flat; Guards/Admins: own society
-- ---------------------------------------------------------------------------

create policy "Residents can read own flat visitors"
  on public.visitors for select
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Guards can read society visitors"
  on public.visitors for select
  using (
    public.is_guard()
    and society_id = public.current_society_id()
  );

create policy "Admins can read society visitors"
  on public.visitors for select
  using (
    public.is_admin()
    and society_id = public.current_society_id()
  );

create policy "Residents can create visitors for own flat"
  on public.visitors for insert
  with check (
    public.is_resident()
    and flat_id = public.current_flat_id()
    and society_id = public.current_society_id()
    and created_by = auth.uid()
  );

create policy "Guards can create society visitors"
  on public.visitors for insert
  with check (
    public.is_guard()
    and society_id = public.current_society_id()
  );

create policy "Admins can create society visitors"
  on public.visitors for insert
  with check (
    public.is_admin()
    and society_id = public.current_society_id()
  );

create policy "Residents can update own flat visitors"
  on public.visitors for update
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  )
  with check (
    public.is_resident()
    and flat_id = public.current_flat_id()
    and society_id = public.current_society_id()
  );

create policy "Guards can update society visitors"
  on public.visitors for update
  using (
    public.is_guard()
    and society_id = public.current_society_id()
  )
  with check (
    public.is_guard()
    and society_id = public.current_society_id()
  );

create policy "Admins can update society visitors"
  on public.visitors for update
  using (
    public.is_admin()
    and society_id = public.current_society_id()
  )
  with check (
    public.is_admin()
    and society_id = public.current_society_id()
  );

create policy "Admins can delete society visitors"
  on public.visitors for delete
  using (
    public.is_admin()
    and society_id = public.current_society_id()
  );

-- ---------------------------------------------------------------------------
-- Visitor logs
-- ---------------------------------------------------------------------------

create policy "Guards can read society visitor logs"
  on public.visitor_logs for select
  using (
    public.is_guard()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_logs.visitor_id
        and v.society_id = public.current_society_id()
    )
  );

create policy "Admins can read society visitor logs"
  on public.visitor_logs for select
  using (
    public.is_admin()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_logs.visitor_id
        and v.society_id = public.current_society_id()
    )
  );

create policy "Residents can read logs for own flat visitors"
  on public.visitor_logs for select
  using (
    public.is_resident()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_logs.visitor_id
        and v.flat_id = public.current_flat_id()
    )
  );

create policy "Guards can insert visitor logs"
  on public.visitor_logs for insert
  with check (
    public.is_guard()
    and guard_id = auth.uid()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_id
        and v.society_id = public.current_society_id()
    )
  );

create policy "Admins can insert visitor logs"
  on public.visitor_logs for insert
  with check (
    public.is_admin()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_id
        and v.society_id = public.current_society_id()
    )
  );

create policy "Guards can update visitor logs"
  on public.visitor_logs for update
  using (
    public.is_guard()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_logs.visitor_id
        and v.society_id = public.current_society_id()
    )
  )
  with check (
    public.is_guard()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_id
        and v.society_id = public.current_society_id()
    )
  );

create policy "Admins can update visitor logs"
  on public.visitor_logs for update
  using (
    public.is_admin()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_logs.visitor_id
        and v.society_id = public.current_society_id()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_id
        and v.society_id = public.current_society_id()
    )
  );

create policy "Admins can delete visitor logs"
  on public.visitor_logs for delete
  using (
    public.is_admin()
    and exists (
      select 1 from public.visitors v
      where v.id = visitor_logs.visitor_id
        and v.society_id = public.current_society_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Notices
-- ---------------------------------------------------------------------------

create policy "Members can read society notices"
  on public.notices for select
  using (society_id = public.current_society_id());

create policy "Admins can insert notices"
  on public.notices for insert
  with check (
    public.is_admin()
    and society_id = public.current_society_id()
    and posted_by = auth.uid()
  );

create policy "Admins can update notices"
  on public.notices for update
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can delete notices"
  on public.notices for delete
  using (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Polls
-- ---------------------------------------------------------------------------

create policy "Members can read society polls"
  on public.polls for select
  using (society_id = public.current_society_id());

create policy "Admins can insert polls"
  on public.polls for insert
  with check (
    public.is_admin()
    and society_id = public.current_society_id()
    and created_by = auth.uid()
  );

create policy "Admins can update polls"
  on public.polls for update
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can delete polls"
  on public.polls for delete
  using (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Poll votes
-- ---------------------------------------------------------------------------

create policy "Members can read poll votes in society"
  on public.poll_votes for select
  using (
    exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
        and p.society_id = public.current_society_id()
    )
  );

create policy "Residents can vote once"
  on public.poll_votes for insert
  with check (
    user_id = auth.uid()
    and (
      public.is_resident()
      or public.is_admin()
    )
    and exists (
      select 1 from public.polls p
      where p.id = poll_id
        and p.society_id = public.current_society_id()
    )
  );

create policy "Users can update own vote"
  on public.poll_votes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own vote"
  on public.poll_votes for delete
  using (user_id = auth.uid());

create policy "Admins can delete society poll votes"
  on public.poll_votes for delete
  using (
    public.is_admin()
    and exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
        and p.society_id = public.current_society_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Complaints
-- ---------------------------------------------------------------------------

create policy "Residents can read own flat complaints"
  on public.complaints for select
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Admins can read society complaints"
  on public.complaints for select
  using (
    public.is_admin()
    and public.complaint_society_id(flat_id) = public.current_society_id()
  );

create policy "Residents can create complaints for own flat"
  on public.complaints for insert
  with check (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Admins can create society complaints"
  on public.complaints for insert
  with check (
    public.is_admin()
    and public.complaint_society_id(flat_id) = public.current_society_id()
  );

create policy "Residents can update own flat complaints"
  on public.complaints for update
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  )
  with check (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Admins can update society complaints"
  on public.complaints for update
  using (
    public.is_admin()
    and public.complaint_society_id(flat_id) = public.current_society_id()
  )
  with check (
    public.is_admin()
    and public.complaint_society_id(flat_id) = public.current_society_id()
  );

create policy "Admins can delete society complaints"
  on public.complaints for delete
  using (
    public.is_admin()
    and public.complaint_society_id(flat_id) = public.current_society_id()
  );

-- ---------------------------------------------------------------------------
-- Amenities
-- ---------------------------------------------------------------------------

create policy "Members can read society amenities"
  on public.amenities for select
  using (society_id = public.current_society_id());

create policy "Admins can insert amenities"
  on public.amenities for insert
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can update amenities"
  on public.amenities for update
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can delete amenities"
  on public.amenities for delete
  using (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Amenity bookings
-- ---------------------------------------------------------------------------

create policy "Residents can read own flat bookings"
  on public.amenity_bookings for select
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Admins can read society bookings"
  on public.amenity_bookings for select
  using (
    public.is_admin()
    and exists (
      select 1 from public.amenities a
      where a.id = amenity_bookings.amenity_id
        and a.society_id = public.current_society_id()
    )
  );

create policy "Members can read bookings for society amenities"
  on public.amenity_bookings for select
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_bookings.amenity_id
        and a.society_id = public.current_society_id()
    )
  );

create policy "Residents can create bookings for own flat"
  on public.amenity_bookings for insert
  with check (
    public.is_resident()
    and flat_id = public.current_flat_id()
    and exists (
      select 1 from public.amenities a
      where a.id = amenity_id
        and a.society_id = public.current_society_id()
    )
  );

create policy "Admins can create society bookings"
  on public.amenity_bookings for insert
  with check (
    public.is_admin()
    and exists (
      select 1 from public.amenities a
      where a.id = amenity_id
        and a.society_id = public.current_society_id()
    )
  );

create policy "Residents can update own flat bookings"
  on public.amenity_bookings for update
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  )
  with check (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Admins can update society bookings"
  on public.amenity_bookings for update
  using (
    public.is_admin()
    and exists (
      select 1 from public.amenities a
      where a.id = amenity_bookings.amenity_id
        and a.society_id = public.current_society_id()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.amenities a
      where a.id = amenity_id
        and a.society_id = public.current_society_id()
    )
  );

create policy "Residents can delete own flat bookings"
  on public.amenity_bookings for delete
  using (
    public.is_resident()
    and flat_id = public.current_flat_id()
  );

create policy "Admins can delete society bookings"
  on public.amenity_bookings for delete
  using (
    public.is_admin()
    and exists (
      select 1 from public.amenities a
      where a.id = amenity_bookings.amenity_id
        and a.society_id = public.current_society_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Staff directory
-- ---------------------------------------------------------------------------

create policy "Members can read society staff"
  on public.staff_directory for select
  using (society_id = public.current_society_id());

create policy "Admins can insert staff"
  on public.staff_directory for insert
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can update staff"
  on public.staff_directory for update
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create policy "Admins can delete staff"
  on public.staff_directory for delete
  using (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_society_id() to authenticated;
grant execute on function public.current_flat_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_guard() to authenticated;
grant execute on function public.is_resident() to authenticated;
grant execute on function public.flat_belongs_to_society(uuid, uuid) to authenticated;
grant execute on function public.complaint_society_id(uuid) to authenticated;
