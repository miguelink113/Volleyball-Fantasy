alter table public.team_standings
    add column points_won   integer not null default 0,
  add column points_lost  integer not null default 0,
  add column result_3_0   integer not null default 0,
  add column result_3_1   integer not null default 0,
  add column result_3_2   integer not null default 0,
  add column result_2_3   integer not null default 0,
  add column result_1_3   integer not null default 0,
  add column result_0_3   integer not null default 0,
  add column sets_ratio   numeric(6,3),
  add column points_ratio numeric(6,3),
  add column penalty      integer not null default 0;