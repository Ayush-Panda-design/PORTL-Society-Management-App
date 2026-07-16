-- Store Expo push tokens on profiles for visitor / notice alerts.
alter table public.profiles
  add column if not exists push_token text;

create index if not exists profiles_push_token_idx
  on public.profiles (push_token)
  where push_token is not null;
