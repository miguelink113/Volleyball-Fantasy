create extension if not exists "pgcrypto";

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    username text not null unique
        check (username = btrim(username) and username ~ '^[A-Za-z0-9_]{3,24}$'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    requested_username text := nullif(
        btrim(coalesce(new.raw_user_meta_data ->> 'username', '')),
        ''
    );
begin
    if requested_username is null then
        raise exception 'username is required';
    end if;

    insert into public.profiles (id, email, username)
    values (new.id, coalesce(new.email, ''), requested_username);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

create table public.competitions (
    id uuid primary key default gen_random_uuid(),
    rfevb_id text not null unique,
    name text not null,
    category text,
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
    on public.seasons (competition_id) where is_current;

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    rfevb_id text,
    name text not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, rfevb_id),
    unique (id, competition_id, season_id),
    unique (competition_id, season_id, id),
    foreign key (competition_id, season_id)
        references public.seasons(competition_id, id) on delete cascade
);

create table public.players (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    team_id uuid not null,
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
    unique (season_id, rfevb_id),
    unique (id, competition_id, season_id),
    unique (competition_id, season_id, id),
    foreign key (competition_id, season_id, team_id)
        references public.teams(competition_id, season_id, id) on delete restrict
);

create index players_team_idx on public.players (team_id);
create index players_position_idx on public.players (season_id, position);

create table public.rounds (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    round_number integer not null check (round_number > 0),
    name text,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    status text not null default 'SCHEDULED'
        check (status in ('SCHEDULED', 'OPEN', 'LOCKED', 'COMPLETED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, round_number),
    unique (id, competition_id, season_id),
    check (starts_at <= ends_at),
    foreign key (competition_id, season_id)
        references public.seasons(competition_id, id) on delete cascade
);

create table public.matches (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    round_id uuid not null,
    rfevb_match_id text not null,
    match_date timestamptz,
    home_team_id uuid not null,
    away_team_id uuid not null,
    home_sets smallint,
    away_sets smallint,
    status text not null default 'SCHEDULED'
        check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED')),
    sets jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, rfevb_match_id),
    unique (id, competition_id, season_id),
    check (home_team_id <> away_team_id),
    check (home_sets is null or home_sets >= 0),
    check (away_sets is null or away_sets >= 0),
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, home_team_id)
        references public.teams(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, away_team_id)
        references public.teams(competition_id, season_id, id) on delete restrict
);

create index matches_round_idx on public.matches (round_id, match_date);

create table public.match_player_stats (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    match_id uuid not null,
    player_id uuid not null,
    team_id uuid not null,
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
    attack_excellent integer not null default 0,
    attack_excellent_percentage numeric(5,2) not null default 0,
    block_points integer not null default 0,
    raw_json jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (match_id, player_id),
    foreign key (competition_id, season_id, match_id)
        references public.matches(competition_id, season_id, id) on delete cascade,
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, team_id)
        references public.teams(competition_id, season_id, id) on delete restrict
);

create index match_player_stats_player_idx
    on public.match_player_stats (player_id, match_id);

create table public.player_market_values (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    player_id uuid not null,
    round_id uuid not null,
    price numeric(12,2) not null check (price >= 0),
    valid_from timestamptz not null default now(),
    valid_to timestamptz,
    calculation_reason text,
    unique (player_id, round_id),
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete cascade,
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete cascade,
    check (valid_to is null or valid_to >= valid_from)
);

create table public.private_leagues (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete restrict,
    competition_id uuid not null,
    season_id uuid not null,
    name text not null check (btrim(name) <> ''),
    join_code text not null unique,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, competition_id, season_id),
    foreign key (competition_id, season_id)
        references public.seasons(competition_id, id) on delete restrict
);

create table public.private_league_members (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references public.private_leagues(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    unique (league_id, user_id)
);

create index private_league_members_user_idx
    on public.private_league_members (user_id, league_id);

create table public.fantasy_teams (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    competition_id uuid not null,
    season_id uuid not null,
    name text not null,
    budget numeric(12,2) not null default 100.00 check (budget >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (league_id, user_id),
    unique (id, competition_id, season_id),
    foreign key (league_id, competition_id, season_id)
        references public.private_leagues(id, competition_id, season_id) on delete cascade,
    foreign key (competition_id, season_id)
        references public.seasons(competition_id, id) on delete restrict
);

create table public.fantasy_team_players (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null,
    league_id uuid not null,
    competition_id uuid not null,
    season_id uuid not null,
    player_id uuid not null,
    joined_round_id uuid not null,
    buy_price numeric(12,2) not null check (buy_price >= 0),
    left_round_id uuid,
    joined_at timestamptz not null default now(),
    left_at timestamptz,
    is_active boolean not null default true,
    foreign key (fantasy_team_id, competition_id, season_id)
        references public.fantasy_teams(id, competition_id, season_id) on delete cascade,
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, joined_round_id)
        references public.rounds(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, left_round_id)
        references public.rounds(competition_id, season_id, id) on delete restrict,
    check ((is_active and left_round_id is null and left_at is null)
        or (not is_active and left_round_id is not null and left_at is not null))
);

create unique index active_player_per_league_idx
    on public.fantasy_team_players (league_id, player_id)
    where is_active;

create index fantasy_team_players_team_idx
    on public.fantasy_team_players (fantasy_team_id, is_active);

create table public.lineups (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null,
    competition_id uuid not null,
    season_id uuid not null,
    round_id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (fantasy_team_id, round_id),
    unique (competition_id, season_id, id),
    foreign key (fantasy_team_id, competition_id, season_id)
        references public.fantasy_teams(id, competition_id, season_id) on delete cascade,
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete restrict
);

create table public.lineup_players (
    lineup_id uuid not null references public.lineups(id) on delete cascade,
    competition_id uuid not null,
    season_id uuid not null,
    player_id uuid not null,
    position_slot smallint not null check (position_slot between 1 and 7),
    primary key (lineup_id, player_id),
    unique (lineup_id, position_slot),
    foreign key (competition_id, season_id, lineup_id)
        references public.lineups(competition_id, season_id, id) on delete cascade,
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete restrict
);

create table public.player_match_scores (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    player_id uuid not null,
    match_id uuid not null,
    round_id uuid not null,
    scoring_version text not null,
    score integer not null,
    breakdown jsonb not null default '{}'::jsonb,
    is_provisional boolean not null default false,
    calculated_at timestamptz not null default now(),
    unique (player_id, match_id, scoring_version),
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, match_id)
        references public.matches(competition_id, season_id, id) on delete cascade,
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete cascade
);

create index player_match_scores_round_idx
    on public.player_match_scores (round_id, score desc);

create table public.player_round_scores (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null,
    season_id uuid not null,
    player_id uuid not null,
    round_id uuid not null,
    scoring_version text not null,
    score integer not null,
    breakdown jsonb not null default '{}'::jsonb,
    is_provisional boolean not null default false,
    calculated_at timestamptz not null default now(),
    unique (player_id, round_id, scoring_version),
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete cascade
);

create table public.fantasy_scores (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null,
    competition_id uuid not null,
    season_id uuid not null,
    lineup_id uuid not null,
    round_id uuid not null,
    scoring_version text not null,
    score integer not null,
    breakdown jsonb not null default '{}'::jsonb,
    calculated_at timestamptz not null default now(),
    unique (fantasy_team_id, round_id, scoring_version),
    foreign key (fantasy_team_id, competition_id, season_id)
        references public.fantasy_teams(id, competition_id, season_id) on delete cascade,
    foreign key (competition_id, season_id, lineup_id)
        references public.lineups(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete restrict
);

create index fantasy_scores_round_idx on public.fantasy_scores (round_id, score desc);

create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    fantasy_team_id uuid not null,
    league_id uuid not null,
    competition_id uuid not null,
    season_id uuid not null,
    player_id uuid not null,
    round_id uuid not null,
    type text not null check (type in ('BUY', 'SELL')),
    amount numeric(12,2) not null check (amount >= 0),
    created_at timestamptz not null default now(),
    foreign key (fantasy_team_id, competition_id, season_id)
        references public.fantasy_teams(id, competition_id, season_id) on delete cascade,
    foreign key (competition_id, season_id, player_id)
        references public.players(competition_id, season_id, id) on delete restrict,
    foreign key (competition_id, season_id, round_id)
        references public.rounds(competition_id, season_id, id) on delete restrict
);

create index transactions_team_idx on public.transactions (fantasy_team_id, created_at desc);

create or replace function public.is_league_member(target_league_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.private_league_members
        where league_id = target_league_id and user_id = auth.uid()
    );
$$;

create or replace function public.is_fantasy_team_owner(target_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.fantasy_teams
        where id = target_team_id and user_id = auth.uid()
    );
$$;

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.match_player_stats enable row level security;
alter table public.player_market_values enable row level security;
alter table public.private_leagues enable row level security;
alter table public.private_league_members enable row level security;
alter table public.fantasy_teams enable row level security;
alter table public.fantasy_team_players enable row level security;
alter table public.lineups enable row level security;
alter table public.lineup_players enable row level security;
alter table public.player_match_scores enable row level security;
alter table public.player_round_scores enable row level security;
alter table public.fantasy_scores enable row level security;
alter table public.transactions enable row level security;

create policy "users read own profile" on public.profiles
    for select to authenticated using (id = auth.uid());
create policy "authenticated users read sports data" on public.competitions
    for select to authenticated using (true);
create policy "authenticated users read seasons" on public.seasons
    for select to authenticated using (true);
create policy "authenticated users read teams" on public.teams
    for select to authenticated using (true);
create policy "authenticated users read players" on public.players
    for select to authenticated using (true);
create policy "authenticated users read rounds" on public.rounds
    for select to authenticated using (true);
create policy "authenticated users read matches" on public.matches
    for select to authenticated using (true);
create policy "authenticated users read match stats" on public.match_player_stats
    for select to authenticated using (true);
create policy "authenticated users read market values" on public.player_market_values
    for select to authenticated using (true);
create policy "authenticated users read player match scores" on public.player_match_scores
    for select to authenticated using (true);
create policy "authenticated users read player round scores" on public.player_round_scores
    for select to authenticated using (true);

create policy "members read leagues" on public.private_leagues
    for select to authenticated
    using (owner_user_id = auth.uid() or public.is_league_member(id));
create policy "members read members" on public.private_league_members
    for select to authenticated
    using (user_id = auth.uid() or public.is_league_member(league_id));
create policy "members read fantasy teams" on public.fantasy_teams
    for select to authenticated
    using (user_id = auth.uid() or public.is_league_member(league_id));
create policy "owners read team players" on public.fantasy_team_players
    for select to authenticated using (public.is_fantasy_team_owner(fantasy_team_id));
create policy "owners read lineups" on public.lineups
    for select to authenticated using (public.is_fantasy_team_owner(fantasy_team_id));
create policy "owners read lineup players" on public.lineup_players
    for select to authenticated using (exists (
        select 1 from public.lineups l
        where l.id = lineup_id and public.is_fantasy_team_owner(l.fantasy_team_id)
    ));
create policy "members read fantasy scores" on public.fantasy_scores
    for select to authenticated using (public.is_league_member(
        (select ft.league_id from public.fantasy_teams ft where ft.id = fantasy_team_id)
    ));
create policy "owners read transactions" on public.transactions
    for select to authenticated using (public.is_fantasy_team_owner(fantasy_team_id));

create or replace function public.seed_fantasy_team(
    p_team_id uuid,
    p_league_id uuid,
    p_competition_id uuid,
    p_season_id uuid,
    p_round_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    selected record;
    selected_players uuid[] := '{}';
    total_cost numeric(12,2) := 0;
    new_lineup_id uuid;
begin
    for selected in
        select p.id, pmv.price
        from public.players p
        join public.player_market_values pmv
          on pmv.player_id = p.id and pmv.round_id = p_round_id
        where p.competition_id = p_competition_id
          and p.season_id = p_season_id
          and p.position = 'setter'
        order by pmv.price
        limit 1
    loop
        selected_players := array_append(selected_players, selected.id);
        total_cost := total_cost + selected.price;
    end loop;
    for selected in
        select p.id, pmv.price
        from public.players p
        join public.player_market_values pmv
          on pmv.player_id = p.id and pmv.round_id = p_round_id
        where p.competition_id = p_competition_id
          and p.season_id = p_season_id
          and p.position = 'opposite'
        order by pmv.price
        limit 1
    loop
        selected_players := array_append(selected_players, selected.id);
        total_cost := total_cost + selected.price;
    end loop;
    for selected in
        select p.id, pmv.price
        from public.players p
        join public.player_market_values pmv
          on pmv.player_id = p.id and pmv.round_id = p_round_id
        where p.competition_id = p_competition_id
          and p.season_id = p_season_id
          and p.position = 'libero'
        order by pmv.price
        limit 1
    loop
        selected_players := array_append(selected_players, selected.id);
        total_cost := total_cost + selected.price;
    end loop;
    for selected in
        select p.id, pmv.price
        from public.players p
        join public.player_market_values pmv
          on pmv.player_id = p.id and pmv.round_id = p_round_id
        where p.competition_id = p_competition_id
          and p.season_id = p_season_id
          and p.position = 'middle'
        order by pmv.price
        limit 2
    loop
        selected_players := array_append(selected_players, selected.id);
        total_cost := total_cost + selected.price;
    end loop;
    for selected in
        select p.id, pmv.price
        from public.players p
        join public.player_market_values pmv
          on pmv.player_id = p.id and pmv.round_id = p_round_id
        where p.competition_id = p_competition_id
          and p.season_id = p_season_id
          and p.position = 'outside'
        order by pmv.price
        limit 2
    loop
        selected_players := array_append(selected_players, selected.id);
        total_cost := total_cost + selected.price;
    end loop;

    if coalesce(array_length(selected_players, 1), 0) < 7
       or total_cost > 100 then
        raise exception 'Unable to create the minimum fantasy lineup within budget';
    end if;

    insert into public.fantasy_team_players (
        fantasy_team_id, league_id, competition_id, season_id,
        player_id, joined_round_id, buy_price
    )
    select p_team_id, p_league_id, p_competition_id, p_season_id,
           p.id, p_round_id, pmv.price
    from public.players p
    join public.player_market_values pmv
      on pmv.player_id = p.id and pmv.round_id = p_round_id
    where p.id = any(selected_players);

    insert into public.lineups (
        fantasy_team_id, competition_id, season_id, round_id
    ) values (
        p_team_id, p_competition_id, p_season_id, p_round_id
    ) returning id into new_lineup_id;

    insert into public.lineup_players (
        lineup_id, competition_id, season_id, player_id, position_slot
    )
    select new_lineup_id, p_competition_id, p_season_id, ftp.player_id,
           row_number() over (
               order by case p.position
                   when 'setter' then 1
                   when 'opposite' then 2
                   when 'outside' then 3
                   when 'middle' then 4
                   when 'libero' then 5
                   else 6
               end, ftp.player_id
           )::smallint
    from public.fantasy_team_players ftp
    join public.players p on p.id = ftp.player_id
    where ftp.fantasy_team_id = p_team_id and ftp.is_active;

    update public.fantasy_teams
    set budget = 100 - total_cost, updated_at = now()
    where id = p_team_id;
end;
$$;

create or replace function public.create_private_league(
    p_competition_id uuid,
    p_season_id uuid,
    p_name text,
    p_join_code text,
    p_round_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_league_id uuid;
    new_team_id uuid;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    if not exists (
        select 1 from public.seasons
        where id = p_season_id and competition_id = p_competition_id
    ) then raise exception 'Invalid competition and season'; end if;

    insert into public.private_leagues (
        owner_user_id, competition_id, season_id, name, join_code
    ) values (
        auth.uid(), p_competition_id, p_season_id, btrim(p_name), btrim(p_join_code)
    ) returning id into new_league_id;

    insert into public.private_league_members (league_id, user_id, role)
    values (new_league_id, auth.uid(), 'owner');

    select id into new_team_id from public.fantasy_teams
    where false;

    insert into public.fantasy_teams (
        league_id, user_id, competition_id, season_id, name
    )
    select new_league_id, auth.uid(), p_competition_id, p_season_id,
           'Equipo de ' || username
    from public.profiles where id = auth.uid();
    select id into new_team_id from public.fantasy_teams
    where league_id = new_league_id and user_id = auth.uid();

    perform public.seed_fantasy_team(
        new_team_id, new_league_id, p_competition_id, p_season_id, p_round_id
    );
    return new_league_id;
end;
$$;

create or replace function public.join_private_league(
    p_join_code text,
    p_round_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    target public.private_leagues%rowtype;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    select * into target from public.private_leagues
    where join_code = btrim(p_join_code) and active;
    if not found then raise exception 'League not found'; end if;
    if exists (
        select 1 from public.private_league_members
        where league_id = target.id and user_id = auth.uid()
    ) then raise exception 'Already a member'; end if;

    insert into public.private_league_members (league_id, user_id, role)
    values (target.id, auth.uid(), 'member');
    insert into public.fantasy_teams (
        league_id, user_id, competition_id, season_id, name
    )
    select target.id, auth.uid(), target.competition_id, target.season_id,
           'Equipo de ' || username
    from public.profiles where id = auth.uid();
    perform public.seed_fantasy_team(
        (select id from public.fantasy_teams
         where league_id = target.id and user_id = auth.uid()),
        target.id, target.competition_id, target.season_id, p_round_id
    );
    return target.id;
end;

$$;

create or replace function public.leave_private_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    member_role text;
    successor_user_id uuid;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;

    select role into member_role
    from public.private_league_members
    where league_id = p_league_id and user_id = auth.uid();
    if member_role is null then raise exception 'Not a league member'; end if;

    if member_role = 'owner' then
        select user_id into successor_user_id
        from public.private_league_members
        where league_id = p_league_id and user_id <> auth.uid()
        order by joined_at, id
        limit 1
        for update;

        if successor_user_id is null then
            delete from public.private_leagues
            where id = p_league_id;
            return;
        end if;

        update public.private_league_members
        set role = 'owner'
        where league_id = p_league_id and user_id = successor_user_id;

        update public.private_leagues
        set owner_user_id = successor_user_id,
            updated_at = now()
        where id = p_league_id;
    end if;

    delete from public.private_league_members
    where league_id = p_league_id and user_id = auth.uid();

    delete from public.fantasy_teams
    where league_id = p_league_id and user_id = auth.uid();
end;
$$;

create or replace function public.transfer_player(
    p_fantasy_team_id uuid,
    p_player_id uuid,
    p_round_id uuid,
    p_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    team public.fantasy_teams%rowtype;
    price numeric(12,2);
    round_data public.rounds%rowtype;
    active_count integer;
begin
    select * into team from public.fantasy_teams
    where id = p_fantasy_team_id and user_id = auth.uid();
    if not found then raise exception 'Fantasy team not found'; end if;

    select * into round_data from public.rounds
    where id = p_round_id
      and competition_id = team.competition_id
      and season_id = team.season_id;
    if not found then raise exception 'Round does not belong to team season'; end if;
    if now() >= round_data.starts_at and now() <= round_data.ends_at then
        raise exception 'Transfers are closed during the round';
    end if;

    select pmv.price into price
    from public.player_market_values pmv
    where pmv.player_id = p_player_id and pmv.round_id = p_round_id
      and pmv.competition_id = team.competition_id
      and pmv.season_id = team.season_id;
    if price is null then raise exception 'Market value not found'; end if;

    if upper(p_type) = 'BUY' then
        select count(*) into active_count from public.fantasy_team_players
        where fantasy_team_id = team.id and is_active;
        if active_count >= 14 then raise exception 'Fantasy team limit reached'; end if;
        if exists (
            select 1 from public.fantasy_team_players
            where league_id = team.league_id and player_id = p_player_id and is_active
        ) then raise exception 'Player already owned in league'; end if;
        if team.budget < price then raise exception 'Insufficient budget'; end if;

        insert into public.fantasy_team_players (
            fantasy_team_id, league_id, competition_id, season_id,
            player_id, joined_round_id, buy_price
        ) values (
            team.id, team.league_id, team.competition_id, team.season_id,
            p_player_id, p_round_id, price
        );
        update public.fantasy_teams set budget = budget - price, updated_at = now()
        where id = team.id;
    elsif upper(p_type) = 'SELL' then
        if not exists (
            select 1 from public.fantasy_team_players
            where fantasy_team_id = team.id and player_id = p_player_id and is_active
        ) then raise exception 'Player is not owned by team'; end if;

        update public.fantasy_team_players
        set is_active = false, left_round_id = p_round_id, left_at = now()
        where fantasy_team_id = team.id and player_id = p_player_id and is_active;
        update public.fantasy_teams set budget = budget + price, updated_at = now()
        where id = team.id;
    else
        raise exception 'Transfer type must be BUY or SELL';
    end if;

    insert into public.transactions (
        fantasy_team_id, league_id, competition_id, season_id,
        player_id, round_id, type, amount
    ) values (
        team.id, team.league_id, team.competition_id, team.season_id,
        p_player_id, p_round_id, upper(p_type), price
    );
end;
$$;

revoke all on function public.seed_fantasy_team(uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_private_league(uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.join_private_league(text, uuid) from public, anon, authenticated;
revoke all on function public.leave_private_league(uuid) from public, anon, authenticated;
revoke all on function public.transfer_player(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_private_league(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function public.join_private_league(text, uuid) to authenticated;
grant execute on function public.leave_private_league(uuid) to authenticated;
grant execute on function public.transfer_player(uuid, uuid, uuid, text) to authenticated;
