-- pgTAP: amenity booking writes must go through RPCs (migration 034).
begin;

select plan(3);

select ok(
  has_table_privilege('authenticated', 'public.amenity_bookings', 'SELECT'),
  'authenticated can SELECT amenity_bookings'
);

select ok(
  not has_table_privilege('authenticated', 'public.amenity_bookings', 'INSERT'),
  'authenticated cannot INSERT amenity_bookings directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.amenity_bookings', 'DELETE'),
  'authenticated cannot DELETE amenity_bookings directly'
);

select * from finish();

rollback;
