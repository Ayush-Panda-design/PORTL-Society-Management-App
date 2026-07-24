-- pgTAP: amenity booking write surface stays RPC-only + payments table exists with RLS.
begin;

select plan(8);

select ok(
  has_table_privilege('authenticated', 'public.amenity_bookings', 'SELECT'),
  'authenticated can SELECT amenity_bookings'
);

select ok(
  not has_table_privilege('authenticated', 'public.amenity_bookings', 'INSERT'),
  'authenticated cannot INSERT amenity_bookings directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.amenity_bookings', 'UPDATE'),
  'authenticated cannot UPDATE amenity_bookings directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.amenity_bookings', 'DELETE'),
  'authenticated cannot DELETE amenity_bookings directly'
);

select has_table('public', 'payments', 'payments table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'payments has RLS enabled'
);

select has_function('public', 'book_amenity_slot', 'book_amenity_slot RPC exists');
select has_function('public', 'cancel_amenity_booking', 'cancel_amenity_booking RPC exists');

select * from finish();

rollback;
