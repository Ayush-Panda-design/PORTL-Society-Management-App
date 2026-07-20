-- Payments: pending holds + Razorpay order linkage.
-- Amenity booking payments take the same amenities row lock as book_amenity_slot.

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  purpose text not null
    check (purpose in (
      'maintenance_due',
      'amenity_booking',
      'one_off_charge',
      'fine'
    )),
  reference_id uuid,
  amount_paise integer not null,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'confirmed',
      'expired',
      'failed'
    )),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- ---------------------------------------------------------------------------
-- initiate_payment — verify Razorpay account, lock amenity when needed, hold
-- ---------------------------------------------------------------------------

create or replace function public.initiate_payment(
  p_society_id uuid,
  p_purpose text,
  p_reference_id uuid,
  p_amount_paise integer
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_status text;
  v_row public.payments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select spa.status into v_account_status
  from public.society_payment_accounts spa
  where spa.society_id = p_society_id;

  if not found or v_account_status is distinct from 'verified' then
    raise exception 'Society payment account is not verified';
  end if;

  -- Same amenity row lock as book_amenity_slot so payment hold and booking
  -- cannot race on capacity.
  if p_purpose = 'amenity_booking' then
    perform 1 from public.amenities where id = p_reference_id for update;
  end if;

  insert into public.payments (
    society_id,
    payer_id,
    purpose,
    reference_id,
    amount_paise,
    status,
    expires_at
  )
  values (
    p_society_id,
    auth.uid(),
    p_purpose,
    p_reference_id,
    p_amount_paise,
    'pending_payment',
    now() + interval '10 minutes'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.initiate_payment(uuid, text, uuid, integer) from public;
grant execute on function public.initiate_payment(uuid, text, uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- confirm_payment — server webhook only; re-check pending + expiry before confirm
-- ---------------------------------------------------------------------------

-- Webhook-only: call via service role from the Razorpay webhook handler.
-- Never expose or invoke this RPC from the client.
create or replace function public.confirm_payment(
  p_razorpay_payment_id text,
  p_razorpay_order_id text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if p_razorpay_order_id is null or length(trim(p_razorpay_order_id)) = 0 then
    raise exception 'Order id is required';
  end if;

  if p_razorpay_payment_id is null or length(trim(p_razorpay_payment_id)) = 0 then
    raise exception 'Payment id is required';
  end if;

  select * into v_row
  from public.payments
  where razorpay_order_id = p_razorpay_order_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_row.status is distinct from 'pending_payment' then
    raise exception 'Payment is not pending';
  end if;

  if v_row.expires_at is null or v_row.expires_at <= now() then
    raise exception 'Payment has expired';
  end if;

  update public.payments
  set
    status = 'confirmed',
    razorpay_payment_id = p_razorpay_payment_id
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.confirm_payment(text, text) from public;
revoke all on function public.confirm_payment(text, text) from authenticated;
revoke all on function public.confirm_payment(text, text) from anon;
grant execute on function public.confirm_payment(text, text) to service_role;
