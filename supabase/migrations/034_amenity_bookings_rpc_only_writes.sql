-- Amenity bookings: reads via RLS, writes only through security-definer RPCs
-- (book_amenity_slot, cancel_amenity_booking, create_recurring_amenity_bookings).

drop policy if exists "Residents can create bookings for own flat"
  on public.amenity_bookings;

drop policy if exists "Admins can create society bookings"
  on public.amenity_bookings;

drop policy if exists "Residents can update own flat bookings"
  on public.amenity_bookings;

drop policy if exists "Admins can update society bookings"
  on public.amenity_bookings;

drop policy if exists "Residents can delete own flat bookings"
  on public.amenity_bookings;

drop policy if exists "Admins can delete society bookings"
  on public.amenity_bookings;

-- Belt-and-suspenders: authenticated clients may only SELECT the table.
revoke insert, update, delete on public.amenity_bookings from authenticated;
grant select on public.amenity_bookings to authenticated;
