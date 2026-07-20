-- Expire stale pending payments every 5 minutes via pg_cron.
-- (This repo has no existing scheduled jobs — only on-demand edge function send-push.
--  Pure SQL expiry fits the payment RPCs, so we use pg_cron rather than a new edge function.)

create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- expire_pending_payments — mark stale holds expired; soft-cancel amenity holds
-- ---------------------------------------------------------------------------

create or replace function public.expire_pending_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.payments;
  v_count integer := 0;
begin
  for r in
    select *
    from public.payments
    where status = 'pending_payment'
      and expires_at is not null
      and expires_at < now()
    for update skip locked
  loop
    update public.payments
    set status = 'expired'
    where id = r.id;

    -- Same soft-cancel as cancel_amenity_booking: frees capacity (counts only status = 'booked').
    -- reference_id is the amenity_bookings.id hold for purpose = 'amenity_booking'.
    if r.purpose = 'amenity_booking' and r.reference_id is not null then
      update public.amenity_bookings
      set
        status = 'cancelled',
        cancelled_at = timezone('utc', now())
      where id = r.reference_id
        and status = 'booked';
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_pending_payments() from public;
revoke all on function public.expire_pending_payments() from authenticated;
revoke all on function public.expire_pending_payments() from anon;
grant execute on function public.expire_pending_payments() to service_role;

-- ---------------------------------------------------------------------------
-- Schedule: every 5 minutes (idempotent; skip if pg_cron / cron schema unavailable)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise notice 'pg_cron not available — skip scheduling expire-pending-payments';
    return;
  end if;

  if exists (
    select 1 from cron.job where jobname = 'expire-pending-payments'
  ) then
    perform cron.unschedule('expire-pending-payments');
  end if;

  perform cron.schedule(
    'expire-pending-payments',
    '*/5 * * * *',
    $cron$select public.expire_pending_payments();$cron$
  );
exception
  when undefined_table then
    raise notice 'cron.job not available — skip scheduling expire-pending-payments';
  when insufficient_privilege then
    raise notice 'Insufficient privilege for pg_cron — skip scheduling expire-pending-payments';
end;
$$;
