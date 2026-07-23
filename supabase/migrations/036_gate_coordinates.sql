-- Optional gate coordinates for nearest-gate suggestions (guard desk).

alter table public.gates
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.gates.latitude is 'Optional WGS84 latitude for nearest-gate suggestions';
comment on column public.gates.longitude is 'Optional WGS84 longitude for nearest-gate suggestions';
