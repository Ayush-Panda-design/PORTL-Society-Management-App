-- pgTAP: permission notify + visible notices (run after 040).
begin;
select plan(3);

select has_function('public', 'user_ids_with_permission', array['uuid', 'text']);
select has_function('public', 'fetch_visible_notices', array['uuid']);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visitors'
      and policyname = 'Visitor managers can read society visitors'
  ),
  'visitors.manage can SELECT society visitors'
);

select * from finish();
rollback;
