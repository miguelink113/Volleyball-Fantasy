create extension if not exists "pgcrypto";

create table public.competitions (
    id uuid primary key default gen_random_uuid(),
    rfevb_id text not null unique,
    name text not null,
    gender text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.seasons (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete cascade,
    rfevb_id text not null,
    name text not null,
    is_current boolean not null default false,
    starts_at date,
    ends_at date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (competition_id, rfevb_id),
    unique (competition_id, id)
);

create unique index seasons_one_current_per_competition
    on public.seasons (competition_id)
    where is_current;

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete cascade,
    season_id uuid not null references public.seasons(id) on delete cascade,
    rfevb_id text not null,
    name text not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, rfevb_id),
    unique (season_id, id)
);

create table public.players (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete cascade,
    season_id uuid not null references public.seasons(id) on delete cascade,
    team_id uuid not null references public.teams(id) on delete restrict,
    rfevb_id text,
    first_name text not null,
    last_name text not null,
    display_name text not null,
    position text not null default 'unknown'
        check (position in ('setter', 'opposite', 'outside', 'middle', 'libero', 'unknown')),
    dorsal integer check (dorsal is null or dorsal > 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, id),
    unique (season_id, rfevb_id)
);

create index players_team_idx on public.players (team_id);
create index players_position_idx on public.players (season_id, position);

create table public.rounds (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete cascade,
    season_id uuid not null references public.seasons(id) on delete cascade,
    round_number integer not null check (round_number > 0),
    name text,
    starts_at timestamptz not null,
    locks_at timestamptz not null,
    ends_at timestamptz not null,
    status text not null default 'scheduled'
        check (status in ('scheduled', 'open', 'locked', 'completed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, round_number),
    unique (season_id, id),
    check (starts_at <= locks_at and locks_at <= ends_at)
);

create table public.matches (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete cascade,
    season_id uuid not null references public.seasons(id) on delete cascade,
    round_id uuid not null references public.rounds(id) on delete restrict,
    rfevb_id text not null,
    starts_at timestamptz,
    home_team_id uuid not null references public.teams(id) on delete restrict,
    away_team_id uuid not null references public.teams(id) on delete restrict,
    home_sets smallint,
    away_sets smallint,
    status text not null default 'scheduled'
        check (status in ('scheduled', 'live', 'completed', 'postponed', 'cancelled')),
    sets jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, rfevb_id),
    check (home_team_id <> away_team_id),
    check (home_sets is null or home_sets >= 0),
    check (away_sets is null or away_sets >= 0)
);

create index matches_round_idx on public.matches (round_id, starts_at);
create index matches_teams_idx on public.matches (home_team_id, away_team_id);

create table public.match_player_stats (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null references public.matches(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete restrict,
    team_id uuid not null references public.teams(id) on delete restrict,
    position text not null default 'unknown'
        check (position in ('setter', 'opposite', 'outside', 'middle', 'libero', 'unknown')),
    sets_played integer not null default 0 check (sets_played >= 0),
    points_total integer not null default 0,
    points_breakout integer not null default 0,
    won_lost integer not null default 0,
    serve_total integer not null default 0,
    serve_errors integer not null default 0,
    serve_aces integer not null default 0,
    reception_total integer not null default 0,
    reception_errors integer not null default 0,
    reception_positive numeric(5,2) not null default 0,
    reception_excellent numeric(5,2) not null default 0,
    attack_total integer not null default 0,
    attack_errors integer not null default 0,
    attack_blocked integer not null default 0,
    attack_points integer not null default 0,
    attack_excellent_percentage numeric(5,2) not null default 0,
    block_points integer not null default 0,
    raw_json jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (match_id, player_id)
);

create index match_player_stats_player_idx
    on public.match_player_stats (player_id, match_id);

create table public.private_leagues (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete restrict,
    competition_id uuid not null references public.competitions(id) on delete restrict,
    season_id uuid not null references public.seasons(id) on delete restrict,
    name text not null,
    join_code text not null unique,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, competition_id, season_id)
);

create table public.private_league_members (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references public.private_leagues(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member'
        check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    unique (league_id, user_id)
);

create index private_league_members_user_idx
    on public.private_league_members (user_id, league_id);

create table public.fantasy_teams (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references public.private_leagues(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    budget numeric(12,2) not null default 100.00 check (budget >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (league_id, user_id),
    unique (id, league_id)
);

create table public.fantasy_team_players (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete restrict,
    price numeric(12,2) not null check (price >= 0),
    acquired_at timestamptz not null default now(),
    released_at timestamptz,
    unique (fantasy_team_id, player_id, acquired_at),
    check (released_at is null or released_at >= acquired_at)
);

create unique index fantasy_team_players_active_idx
    on public.fantasy_team_players (fantasy_team_id, player_id)
    where released_at is null;

create table public.lineups (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
    round_id uuid not null references public.rounds(id) on delete restrict,
    locked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (fantasy_team_id, round_id)
);

create table public.lineup_players (
    lineup_id uuid not null references public.lineups(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete restrict,
    position_slot smallint not null check (position_slot between 1 and 7),
    is_captain boolean not null default false,
    primary key (lineup_id, player_id),
    unique (lineup_id, position_slot)
);

create unique index lineup_one_captain_idx
    on public.lineup_players (lineup_id)
    where is_captain;

create table public.player_round_scores (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references public.players(id) on delete restrict,
    match_id uuid not null references public.matches(id) on delete cascade,
    round_id uuid not null references public.rounds(id) on delete cascade,
    scoring_version text not null,
    score integer not null,
    breakdown jsonb not null default '{}'::jsonb,
    is_provisional boolean not null default false,
    calculated_at timestamptz not null default now(),
    unique (player_id, match_id, scoring_version)
);

create index player_round_scores_round_idx
    on public.player_round_scores (round_id, score desc);

create table public.fantasy_scores (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
    lineup_id uuid not null references public.lineups(id) on delete cascade,
    round_id uuid not null references public.rounds(id) on delete cascade,
    scoring_version text not null,
    score integer not null,
    breakdown jsonb not null default '{}'::jsonb,
    calculated_at timestamptz not null default now(),
    unique (fantasy_team_id, round_id, scoring_version)
);

create index fantasy_scores_round_idx
    on public.fantasy_scores (round_id, score desc);

create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete restrict,
    type text not null check (type in ('buy', 'sell')),
    amount numeric(12,2) not null check (amount >= 0),
    created_at timestamptz not null default now(),
    round_id uuid references public.rounds(id) on delete restrict
);

create index transactions_team_idx
    on public.transactions (fantasy_team_id, created_at desc);

alter table public.teams
    add constraint teams_competition_season_fk
    foreign key (competition_id, season_id)
    references public.seasons (competition_id, id);

alter table public.players
    add constraint players_competition_season_fk
    foreign key (competition_id, season_id)
    references public.seasons (competition_id, id);

alter table public.rounds
    add constraint rounds_competition_season_fk
    foreign key (competition_id, season_id)
    references public.seasons (competition_id, id);

alter table public.matches
    add constraint matches_competition_season_fk
    foreign key (competition_id, season_id)
    references public.seasons (competition_id, id);

alter table public.private_leagues
    add constraint private_leagues_competition_season_fk
    foreign key (competition_id, season_id)
    references public.seasons (competition_id, id);

create or replace function public.is_league_member(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.private_league_members
        where league_id = target_league_id
          and user_id = auth.uid()
    );
$$;

create or replace function public.is_fantasy_team_owner(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.fantasy_teams
        where id = target_team_id
          and user_id = auth.uid()
    );
$$;

alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.match_player_stats enable row level security;
alter table public.private_leagues enable row level security;
alter table public.private_league_members enable row level security;
alter table public.fantasy_teams enable row level security;
alter table public.fantasy_team_players enable row level security;
alter table public.lineups enable row level security;
alter table public.lineup_players enable row level security;
alter table public.player_round_scores enable row level security;
alter table public.fantasy_scores enable row level security;
alter table public.transactions enable row level security;

create policy "authenticated users can read competitions"
    on public.competitions for select to authenticated using (true);
create policy "authenticated users can read seasons"
    on public.seasons for select to authenticated using (true);
create policy "authenticated users can read teams"
    on public.teams for select to authenticated using (true);
create policy "authenticated users can read players"
    on public.players for select to authenticated using (true);
create policy "authenticated users can read rounds"
    on public.rounds for select to authenticated using (true);
create policy "authenticated users can read matches"
    on public.matches for select to authenticated using (true);
create policy "authenticated users can read match stats"
    on public.match_player_stats for select to authenticated using (true);
create policy "authenticated users can read player scores"
    on public.player_round_scores for select to authenticated using (true);

create policy "members can read leagues"
    on public.private_leagues for select to authenticated
    using (owner_user_id = auth.uid() or public.is_league_member(id));
create policy "users can create leagues"
    on public.private_leagues for insert to authenticated
    with check (owner_user_id = auth.uid());
create policy "owners can update leagues"
    on public.private_leagues for update to authenticated
    using (owner_user_id = auth.uid())
    with check (owner_user_id = auth.uid());
create policy "owners can delete leagues"
    on public.private_leagues for delete to authenticated
    using (owner_user_id = auth.uid());

create policy "members can read league members"
    on public.private_league_members for select to authenticated
    using (user_id = auth.uid() or public.is_league_member(league_id));
create policy "users can join leagues"
    on public.private_league_members for insert to authenticated
    with check (user_id = auth.uid());
create policy "users can leave leagues"
    on public.private_league_members for delete to authenticated
    using (user_id = auth.uid());

create policy "owners can read fantasy teams"
    on public.fantasy_teams for select to authenticated
    using (user_id = auth.uid() or public.is_league_member(league_id));
create policy "users can create fantasy teams"
    on public.fantasy_teams for insert to authenticated
    with check (user_id = auth.uid() and public.is_league_member(league_id));
create policy "owners can update fantasy teams"
    on public.fantasy_teams for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "members can read team players"
    on public.fantasy_team_players for select to authenticated
    using (public.is_fantasy_team_owner(fantasy_team_id));
create policy "owners can manage team players"
    on public.fantasy_team_players for all to authenticated
    using (public.is_fantasy_team_owner(fantasy_team_id))
    with check (public.is_fantasy_team_owner(fantasy_team_id));

create policy "members can read lineups"
    on public.lineups for select to authenticated
    using (public.is_fantasy_team_owner(fantasy_team_id));
create policy "owners can manage lineups"
    on public.lineups for all to authenticated
    using (public.is_fantasy_team_owner(fantasy_team_id))
    with check (public.is_fantasy_team_owner(fantasy_team_id));

create policy "owners can read lineup players"
    on public.lineup_players for select to authenticated
    using (exists (
        select 1 from public.lineups l
        where l.id = lineup_id
          and public.is_fantasy_team_owner(l.fantasy_team_id)
    ));
create policy "owners can manage lineup players"
    on public.lineup_players for all to authenticated
    using (exists (
        select 1 from public.lineups l
        where l.id = lineup_id
          and public.is_fantasy_team_owner(l.fantasy_team_id)
    ))
    with check (exists (
        select 1 from public.lineups l
        where l.id = lineup_id
          and public.is_fantasy_team_owner(l.fantasy_team_id)
    ));

create policy "members can read fantasy scores"
    on public.fantasy_scores for select to authenticated
    using (public.is_league_member(
        (select ft.league_id from public.fantasy_teams ft where ft.id = fantasy_team_id)
    ));
create policy "owners can read transactions"
    on public.transactions for select to authenticated
    using (public.is_fantasy_team_owner(fantasy_team_id));
create policy "owners can create transactions"
    on public.transactions for insert to authenticated
    with check (public.is_fantasy_team_owner(fantasy_team_id));
