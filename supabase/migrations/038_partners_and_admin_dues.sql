-- Society partners (delivery / cab / service whitelist + auto-approve)
-- Admin-issued maintenance dues / charges for residents

-- ---------------------------------------------------------------------------
-- society_partners
-- ---------------------------------------------------------------------------

create table if not exists public.society_partners (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  name text not null,
  phone text,
  type text not null
    check (type in ('delivery', 'cab', 'service')),
  company_name text,
  auto_approve boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists society_partners_society_idx
  on public.society_partners (society_id);

create unique index if not exists society_partners_phone_uidx
  on public.society_partners (society_id, phone)
  where phone is not null and length(trim(phone)) > 0;

alter table public.society_partners enable row level security;

drop policy if exists "Society members can read partners" on public.society_partners;
create policy "Society members can read partners"
  on public.society_partners for select
  using (society_id = public.current_society_id());

drop policy if exists "Managers can insert partners" on public.society_partners;
create policy "Managers can insert partners"
  on public.society_partners for insert
  with check (
    society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('visitors.manage')
    )
  );

drop policy if exists "Managers can update partners" on public.society_partners;
create policy "Managers can update partners"
  on public.society_partners for update
  using (
    society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('visitors.manage')
    )
  );

drop policy if exists "Managers can delete partners" on public.society_partners;
create policy "Managers can delete partners"
  on public.society_partners for delete
  using (
    society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('visitors.manage')
    )
  );

-- Normalize phone digits for matching (last 10 digits)
create or replace function public.normalize_phone_digits(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(
    right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10),
    ''
  );
$$;

create or replace function public.match_society_partner(
  p_society_id uuid,
  p_phone text,
  p_type text
)
returns public.society_partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.normalize_phone_digits(p_phone);
  v_row public.society_partners;
begin
  if p_society_id is null or v_digits is null then
    return null;
  end if;

  if p_type is null or p_type not in ('delivery', 'cab', 'service') then
    return null;
  end if;

  select sp.* into v_row
  from public.society_partners sp
  where sp.society_id = p_society_id
    and sp.type = p_type
    and sp.auto_approve = true
    and public.normalize_phone_digits(sp.phone) = v_digits
  order by sp.created_at desc
  limit 1;

  return v_row;
end;
$$;

revoke all on function public.match_society_partner(uuid, text, text) from public;
grant execute on function public.match_society_partner(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_issue_payment — create a due/charge for a resident (payer ≠ issuer)
-- ---------------------------------------------------------------------------

create or replace function public.admin_issue_payment(
  p_payer_id uuid,
  p_purpose text,
  p_amount_paise integer,
  p_notes text default null,
  p_reference_id uuid default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid := public.current_society_id();
  v_payer public.profiles;
  v_row public.payments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_admin() or public.has_permission('payments.manage')) then
    raise exception 'Not allowed to issue payments';
  end if;

  if p_purpose is null or p_purpose not in (
    'maintenance_due', 'one_off_charge', 'fine'
  ) then
    raise exception 'Purpose must be maintenance_due, one_off_charge, or fine';
  end if;

  if p_amount_paise is null or p_amount_paise < 100 then
    raise exception 'Amount must be at least 100 paise (₹1)';
  end if;

  select * into v_payer
  from public.profiles
  where id = p_payer_id
    and society_id = v_society
    and status = 'active';

  if not found then
    raise exception 'Payer is not an active member of this society';
  end if;

  insert into public.payments (
    society_id,
    payer_id,
    purpose,
    reference_id,
    amount_paise,
    status,
    expires_at,
    notes,
    paid_paise
  )
  values (
    v_society,
    p_payer_id,
    p_purpose,
    p_reference_id,
    p_amount_paise,
    'pending_payment',
    now() + interval '30 days',
    nullif(trim(coalesce(p_notes, '')), ''),
    0
  )
  returning * into v_row;

  perform public.log_audit(
    'payment.issued',
    'payment',
    v_row.id,
    jsonb_build_object(
      'payer_id', p_payer_id,
      'purpose', p_purpose,
      'amount_paise', p_amount_paise
    )
  );

  return v_row;
end;
$$;

revoke all on function public.admin_issue_payment(uuid, text, integer, text, uuid) from public;
grant execute on function public.admin_issue_payment(uuid, text, integer, text, uuid) to authenticated;
