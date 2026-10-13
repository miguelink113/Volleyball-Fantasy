-- Los nombres de equipo que extrae el scraper RFEVB no son estables entre
-- páginas:
--   - CompetitionTeamDetails.aspx (roster) -> "CV Melilla"
--   - MatchStatistics.aspx (actas)        -> "Club Voleibol Melilla"
-- Las actas no exponen TeamID/PlayerID técnicos, así que no podemos cruzar
-- por identificador. Esta tabla mantiene la correspondencia explícita entre
-- el nombre crudo de cada fuente y el team_id oficial de la temporada.

create table public.team_source_aliases (
                                            id uuid primary key default gen_random_uuid(),
                                            competition_id uuid not null,
                                            season_id uuid not null,
                                            team_id uuid not null,
                                            source text not null
                                                check (source in ('roster', 'matches')),
                                            alias text not null check (btrim(alias) <> ''),
                                            normalized_alias text not null check (btrim(normalized_alias) <> ''),
                                            created_at timestamptz not null default now(),
                                            updated_at timestamptz not null default now(),
                                            unique (season_id, normalized_alias),
                                            foreign key (competition_id, season_id, team_id)
                                                references public.teams(competition_id, season_id, id) on delete cascade
);

create index team_source_aliases_team_idx
    on public.team_source_aliases (team_id);

alter table public.team_source_aliases enable row level security;

create policy "authenticated users read team aliases"
    on public.team_source_aliases
    for select to authenticated using (true);