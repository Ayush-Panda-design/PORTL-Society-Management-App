-- Close payment integration gaps:
-- - amenity fee_paise
-- - initiate_payment locks via booking id (not amenity id)
-- - abandon_payment for client cancel
-- - unique razorpay_order_id
-- - platform_admins RLS
-- - society_payment_accounts insert for platform admins

-- ---------------------------------------------------------------------------
-- Amenity pricing (0 / null = free)
-- ---------------------------------------------------------------------------

alter table public.amenities
  add column if not exists fee_paise integer not null default 0;

alter table public.amenities
  drop constraint if exists amenities_fee_paise_check;

alter table public.amenities
  add constraint amenities_fee_paise_check
  check (fee_paise >= 0);

-- ---------------------------------------------------------------------------
-- payments hardening
-- ---------------------------------------------------------------------------

create unique index if not exists payments_razorpay_order_id_uidx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

-- ---------------------------------------------------------------------------
-- platform_admins RLS (service role / SQL still manage membership)
-- ---------------------------------------------------------------------------

alter table public.platform_admins enable row level security;

drop policy if exists "Platform admins can read own membership" on public.platform_admins;
create policy "Platform admins can read own membership"
  on public.platform_admins for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- society_payment_accounts: platform admins can insert
-- ---------------------------------------------------------------------------

drop policy if exists "Platform admins can insert payment accounts"
  on public.society_payment_accounts;
create policy "Platform admins can insert payment accounts"
  on public.society_payment_accounts for insert
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- initiate_payment — reference_id for amenity_booking is amenity_bookings.id
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
  v_amenity_id uuid;
  v_booking_society uuid;
  v_fee_paise integer;
  v_row public.payments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_society_id is distinct from public.current_society_id() then
    raise exception 'Society is not your society';
  end if;

  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Amount is required';
  end if;

  if p_purpose not in (
    'maintenance_due',
    'amenity_booking',
    'one_off_charge',
    'fine'
  ) then
    raise exception 'Invalid payment purpose';
  end if;

  select spa.status
  into v_account_status
  from public.society_payment_accounts spa
  where spa.society_id = p_society_id;

  if not found or v_account_status is distinct from 'verified' then
    raise exception 'Society payment account is not verified';
  end if;

  -- Amenity booking: reference_id is the hold booking created by book_amenity_slot.
  -- Lock the amenity row the same way book_amenity_slot does.
  if p_purpose = 'amenity_booking' then
    if p_reference_id is null then
      raise exception 'Booking is required';
    end if;

    select b.amenity_id into v_amenity_id
    from public.amenity_bookings b
    where b.id = p_reference_id
      and b.status = 'booked'
    for update;

    if not found then
      raise exception 'Booking not found';
    end if;

    select a.society_id, coalesce(a.fee_paise, 0)
    into v_booking_society, v_fee_paise
    from public.amenities a
    where a.id = v_amenity_id;

    if not found then
      raise exception 'Amenity not found';
    end if;

    if v_booking_society is distinct from p_society_id then
      raise exception 'Booking is not in this society';
    end if;

    if v_fee_paise is distinct from p_amount_paise then
      raise exception 'Amount does not match amenity fee';
    end if;

    -- Same amenity row lock as book_amenity_slot.
    perform 1 from public.amenities where id = v_amenity_id for update;
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
-- abandon_payment — payer cancels checkout; frees amenity hold immediately
-- ---------------------------------------------------------------------------

create or replace function public.abandon_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_row.payer_id is distinct from auth.uid() then
    raise exception 'Not allowed to abandon this payment';
  end if;

  if v_row.status is distinct from 'pending_payment' then
    return v_row;
  end if;

  update public.payments
  set status = 'failed'
  where id = v_row.id
  returning * into v_row;

  if v_row.purpose = 'amenity_booking' and v_row.reference_id is not null then
    update public.amenity_bookings
    set
      status = 'cancelled',
      cancelled_at = timezone('utc', now())
    where id = v_row.reference_id
      and status = 'booked';
  end if;

  return v_row;
end;
$$;

revoke all on function public.abandon_payment(uuid) from public;
grant execute on function public.abandon_payment(uuid) to authenticated;
