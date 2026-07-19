-- Poll results privacy: admin-only vote identities, publishable tallies for members.

alter table public.polls
  add column if not exists results_published_at timestamptz;

-- ---------------------------------------------------------------------------
-- Tighten poll_votes SELECT: admins see all; others only their own vote
-- ---------------------------------------------------------------------------

drop policy if exists "Members can read poll votes in society" on public.poll_votes;

create policy "Admins can read society poll votes"
  on public.poll_votes for select
  using (
    public.is_admin()
    and exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
        and p.society_id = public.current_society_id()
    )
  );

create policy "Users can read own poll votes"
  on public.poll_votes for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- poll_option_counts — aggregate tallies without exposing voter identity
-- Admins: always. Members: only after results are published.
-- ---------------------------------------------------------------------------

create or replace function public.poll_option_counts(p_poll_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
  v_is_admin boolean := public.is_admin();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_poll from public.polls where id = p_poll_id;
  if not found then
    raise exception 'Poll not found';
  end if;

  if v_poll.society_id is distinct from public.current_society_id() then
    raise exception 'Poll is not in your society';
  end if;

  if not v_is_admin and v_poll.results_published_at is null then
    raise exception 'Poll results are not published yet';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'option', opt.option_label,
        'count', coalesce(v.cnt, 0)
      )
      order by opt.ord
    )
    from (
      select
        t.option_label,
        t.ord
      from jsonb_array_elements_text(v_poll.options)
        with ordinality as t(option_label, ord)
    ) opt
    left join (
      select pv.option, count(*)::int as cnt
      from public.poll_votes pv
      where pv.poll_id = p_poll_id
      group by pv.option
    ) v on v.option = opt.option_label
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- publish_poll_results — admin only, only after poll has ended
-- ---------------------------------------------------------------------------

create or replace function public.publish_poll_results(p_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can publish poll results';
  end if;

  select * into v_poll from public.polls where id = p_poll_id;
  if not found then
    raise exception 'Poll not found';
  end if;

  if v_poll.society_id is distinct from public.current_society_id() then
    raise exception 'Poll is not in your society';
  end if;

  if v_poll.expires_at is null or v_poll.expires_at > now() then
    raise exception 'Publish results only after the poll has ended';
  end if;

  if v_poll.results_published_at is not null then
    return jsonb_build_object(
      'poll_id', v_poll.id,
      'results_published_at', v_poll.results_published_at
    );
  end if;

  update public.polls
  set results_published_at = now()
  where id = p_poll_id
  returning * into v_poll;

  return jsonb_build_object(
    'poll_id', v_poll.id,
    'results_published_at', v_poll.results_published_at
  );
end;
$$;

grant execute on function public.poll_option_counts(uuid) to authenticated;
grant execute on function public.publish_poll_results(uuid) to authenticated;

notify pgrst, 'reload schema';
