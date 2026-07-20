-- Payment auto-retry, partial payments, and resident ledger/statement.

-- ---------------------------------------------------------------------------
-- Payments: retry + partial tracking
-- ---------------------------------------------------------------------------

alter table public.payments
  add column if not exists paid_paise integer not null default 0
    check (paid_paise >= 0),
  add column if not exists retry_of uuid references public.payments (id) on delete set null,
  add column if not exists retry_count integer not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists max_retries integer not null default 3,
  add column if not exists notes text;

-- Allow partially_paid status
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in (
    'pending_payment',
    'confirmed',
    'expired',
    'failed',
    'partially_paid'
  ));

create index if not exists payments_payer_created_idx
  on public.payments (payer_id, created_at desc);

create index if not exists payments_retry_due_idx
  on public.payments (status, next_retry_at)
  where status = 'failed' and next_retry_at is not null;

-- When a payment fails, schedule auto-retry
create or replace function public.payments_after_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'failed'
     and old.status is distinct from 'failed'
     and new.retry_count < coalesce(new.max_retries, 3) then
    new.next_retry_at := now() + make_interval(hours => least(24, greatest(1, (new.retry_count + 1) * 2)));
  end if;

  if new.status = 'confirmed' then
    new.paid_paise := greatest(coalesce(new.paid_paise, 0), new.amount_paise);
    new.next_retry_at := null;
  end if;

  return new;
end;
$$;

-- BEFORE trigger so we can mutate NEW
drop trigger if exists payments_before_status on public.payments;
create trigger payments_before_status
  before update of status on public.payments
  for each row execute function public.payments_after_status();

-- Auto-retry cron: clone failed payment into a new pending attempt
create or replace function public.retry_failed_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.payments;
  v_count integer := 0;
  v_new public.payments;
begin
  for r in
    select *
    from public.payments
    where status = 'failed'
      and next_retry_at is not null
      and next_retry_at <= now()
      and retry_count < coalesce(max_retries, 3)
    for update skip locked
  loop
    insert into public.payments (
      society_id, payer_id, purpose, reference_id,
      amount_paise, paid_paise, status, expires_at,
      retry_of, retry_count, max_retries, notes
    )
    values (
      r.society_id, r.payer_id, r.purpose, r.reference_id,
      r.amount_paise - coalesce(r.paid_paise, 0),
      0,
      'pending_payment',
      now() + interval '10 minutes',
      coalesce(r.retry_of, r.id),
      r.retry_count + 1,
      r.max_retries,
      'Auto-retry of failed payment'
    )
    returning * into v_new;

    update public.payments
    set next_retry_at = null
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.retry_failed_payments() from public;
revoke all on function public.retry_failed_payments() from authenticated;
revoke all on function public.retry_failed_payments() from anon;
grant execute on function public.retry_failed_payments() to service_role;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise notice 'pg_cron not available — skip retry-failed-payments';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'retry-failed-payments') then
    perform cron.unschedule('retry-failed-payments');
  end if;

  perform cron.schedule(
    'retry-failed-payments',
    '*/10 * * * *',
    $cron$select public.retry_failed_payments();$cron$
  );
exception
  when undefined_table then
    raise notice 'cron.job not available — skip retry-failed-payments';
  when insufficient_privilege then
    raise notice 'Insufficient privilege for pg_cron — skip retry-failed-payments';
end;
$$;

-- Partial payment: pay less than full amount against an existing charge
create or replace function public.initiate_partial_payment(
  p_parent_payment_id uuid,
  p_amount_paise integer
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent public.payments;
  v_remaining integer;
  v_row public.payments;
  v_account_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_parent
  from public.payments
  where id = p_parent_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_parent.payer_id is distinct from auth.uid()
     and not (public.is_admin() or public.has_permission('payments.manage')) then
    raise exception 'Not allowed';
  end if;

  if v_parent.status not in ('pending_payment', 'partially_paid', 'failed', 'expired') then
    raise exception 'Parent payment is not open for partial pay';
  end if;

  v_remaining := v_parent.amount_paise - coalesce(v_parent.paid_paise, 0);
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > v_remaining then
    raise exception 'Invalid partial amount';
  end if;

  select spa.status into v_account_status
  from public.society_payment_accounts spa
  where spa.society_id = v_parent.society_id;

  if not found or v_account_status is distinct from 'verified' then
    raise exception 'Society payment account is not verified';
  end if;

  insert into public.payments (
    society_id, payer_id, purpose, reference_id,
    amount_paise, paid_paise, status, expires_at,
    retry_of, notes
  )
  values (
    v_parent.society_id,
    v_parent.payer_id,
    v_parent.purpose,
    v_parent.reference_id,
    p_amount_paise,
    0,
    'pending_payment',
    now() + interval '10 minutes',
    v_parent.id,
    'Partial payment'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.initiate_partial_payment(uuid, integer) from public;
grant execute on function public.initiate_partial_payment(uuid, integer) to authenticated;

-- When a partial child confirms, roll amount into parent
create or replace function public.apply_partial_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent public.payments;
  v_paid integer;
begin
  if new.status = 'confirmed'
     and old.status is distinct from 'confirmed'
     and new.retry_of is not null
     and coalesce(new.notes, '') = 'Partial payment' then
    select * into v_parent from public.payments where id = new.retry_of for update;
    if found then
      v_paid := coalesce(v_parent.paid_paise, 0) + new.amount_paise;
      update public.payments
      set
        paid_paise = v_paid,
        status = case
          when v_paid >= v_parent.amount_paise then 'confirmed'
          else 'partially_paid'
        end
      where id = v_parent.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_apply_partial on public.payments;
create trigger payments_apply_partial
  after update of status on public.payments
  for each row execute function public.apply_partial_on_confirm();

-- ---------------------------------------------------------------------------
-- Resident ledger / statement view
-- ---------------------------------------------------------------------------

create or replace view public.payment_ledger
with (security_invoker = true)
as
select
  p.id,
  p.society_id,
  p.payer_id,
  p.purpose,
  p.reference_id,
  p.amount_paise,
  p.paid_paise,
  p.status,
  p.created_at,
  p.expires_at,
  p.retry_of,
  p.retry_count,
  p.notes,
  case
    when p.status = 'confirmed' then p.amount_paise
    when p.status = 'partially_paid' then coalesce(p.paid_paise, 0)
    else 0
  end as credited_paise,
  case
    when p.status in ('pending_payment', 'failed', 'expired', 'partially_paid')
      then greatest(p.amount_paise - coalesce(p.paid_paise, 0), 0)
    else 0
  end as outstanding_paise
from public.payments p;

grant select on public.payment_ledger to authenticated;

create or replace function public.fetch_my_payment_statement(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns setof public.payment_ledger
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.payment_ledger
  where payer_id = auth.uid()
    and (p_from is null or created_at >= p_from)
    and (p_to is null or created_at <= p_to)
  order by created_at desc;
$$;

revoke all on function public.fetch_my_payment_statement(timestamptz, timestamptz) from public;
grant execute on function public.fetch_my_payment_statement(timestamptz, timestamptz) to authenticated;
