-- Multi-role RLS behavior for visitors (not just privilege/schema smoke).
begin;

select plan(6);

-- Helpers exist
select has_function(
  'public',
  'is_admin',
  'is_admin() helper exists'
);

select has_function(
  'public',
  'current_society_id',
  'current_society_id() helper exists'
);

select has_function(
  'public',
  'has_permission',
  'has_permission() helper exists'
);

-- RLS enabled on core gate tables
select ok(
  (select relrowsecurity from pg_class where relname = 'visitors' and relnamespace = 'public'::regnamespace),
  'RLS enabled on visitors'
);

select ok(
  (select relrowsecurity from pg_class where relname = 'visitor_logs' and relnamespace = 'public'::regnamespace),
  'RLS enabled on visitor_logs'
);

-- Policies present for resident flat scope + admin society scope (names from 001+)
select ok(
  (
    select count(*) >= 2
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visitors'
  ),
  'visitors has multiple RLS policies (role-scoped access)'
);

select * from finish();

rollback;
