-- pgTAP: gates + broadcasts schema/RLS invariants (migrations 035–036).
begin;

select plan(10);

select has_table('public', 'gates', 'gates table exists');
select has_table('public', 'broadcasts', 'broadcasts table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.gates'::regclass),
  'gates has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.broadcasts'::regclass),
  'broadcasts has RLS enabled'
);

select has_column('public', 'gates', 'latitude', 'gates.latitude exists');
select has_column('public', 'gates', 'longitude', 'gates.longitude exists');

select has_column('public', 'visitor_logs', 'entry_gate_id', 'visitor_logs.entry_gate_id exists');
select has_column('public', 'visitor_logs', 'exit_gate_id', 'visitor_logs.exit_gate_id exists');

select has_function('public', 'seed_default_gate', 'seed_default_gate trigger helper exists');

select ok(
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'societies'
      and t.tgname = 'societies_after_insert_seed_gate'
      and not t.tgisinternal
  ),
  'societies seed Main Gate trigger exists'
);

select * from finish();

rollback;
