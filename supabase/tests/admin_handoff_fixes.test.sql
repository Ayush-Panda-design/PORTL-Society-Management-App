-- pgTAP smoke for 041 admin handoff fixes.
begin;
select plan(3);

select has_function('public', 'review_join_request', array['uuid', 'boolean']);
select has_function('public', 'user_ids_for_tower', array['uuid', 'uuid']);

select ok(
  pg_get_functiondef('public.review_join_request(uuid,boolean)'::regprocedure)
    like '%members.review%',
  'review_join_request allows members.review'
);

select * from finish();
rollback;
