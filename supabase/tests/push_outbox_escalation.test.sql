-- push_outbox + escalation / missed helpers (migration 039)
begin;

select plan(7);

select has_table('public', 'push_outbox', 'push_outbox exists');

select has_function('public', 'enqueue_push', 'enqueue_push exists');
select has_function('public', 'escalate_pending_visitors', 'escalate_pending_visitors exists');
select has_function('public', 'mark_missed_expired_visitors', 'mark_missed_expired_visitors exists');
select has_function('public', 'claim_push_outbox', 'claim_push_outbox exists');

select ok(
  (select relrowsecurity from pg_class where relname = 'push_outbox' and relnamespace = 'public'::regnamespace),
  'RLS enabled on push_outbox'
);

select ok(
  not has_table_privilege('authenticated', 'public.push_outbox', 'SELECT'),
  'authenticated cannot SELECT push_outbox (service-only)'
);

select * from finish();

rollback;
