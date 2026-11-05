create table public.team_standings (
                                       id uuid primary key default gen_random_uuid(),
                                       competition_id uuid not null references public.competitions(id) on delete cascade,
                                       season_id uuid not null references public.seasons(id) on delete cascade,
                                       team_id uuid not null references public.teams(id) on delete cascade,
                                       group_name text,
                                       position integer not null,
                                       matches_played integer not null default 0,
                                       matches_won integer not null default 0,
                                       matches_lost integer not null default 0,
                                       sets_won integer not null default 0,
                                       sets_lost integer not null default 0,
                                       points integer not null default 0,
                                       updated_at timestamptz not null default now(),
                                       unique (season_id, team_id)
);

alter table public.team_standings enable row level security;

create policy "authenticated users read team standings"
    on public.team_standings
    for select
                   to authenticated
                   using (true);

create policy "service role manages team standings"
    on public.team_standings
    for all
    to service_role
    using (true)
    with check (true);