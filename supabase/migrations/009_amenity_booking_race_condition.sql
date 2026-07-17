-- Fix race condition in amenity bookings
-- Adds a unique constraint to prevent double-booking the same slot on the same date for a given amenity.

alter table public.amenity_bookings
  add constraint amenity_bookings_amenity_id_date_slot_key unique (amenity_id, date, slot);
