-- Platform admins: cross-society superusers, tracked separately from profiles.role.

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Society Razorpay payment accounts
-- ---------------------------------------------------------------------------

create table if not exists public.society_payment_accounts (
  society_id uuid primary key references public.societies (id) on delete cascade,
  razorpay_account_id text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.society_payment_accounts enable row level security;

drop policy if exists "Admins can read own society payment account"
  on public.society_payment_accounts;
create policy "Admins can read own society payment account"
  on public.society_payment_accounts for select
  using (society_id = public.current_society_id() and public.is_admin());

drop policy if exists "Platform admins can read all payment accounts"
  on public.society_payment_accounts;
create policy "Platform admins can read all payment accounts"
  on public.society_payment_accounts for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can update payment accounts"
  on public.society_payment_accounts;
create policy "Platform admins can update payment accounts"
  on public.society_payment_accounts for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
