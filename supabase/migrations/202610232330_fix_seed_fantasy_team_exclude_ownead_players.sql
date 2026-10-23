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
    -- Buscar 1 colocador (Barajado por ID de equipo)
for selected in
select p.id, pmv.price
from public.players p
         join public.player_market_values pmv on pmv.player_id = p.id and pmv.round_id = p_round_id
where p.competition_id = p_competition_id and p.season_id = p_season_id and p.position = 'setter'
  and p.id not in (select player_id from public.fantasy_team_players where league_id = p_league_id and is_active = true)
order by md5(p.id::text || p_team_id::text) limit 1
    loop
        selected_players := array_append(selected_players, selected.id);
total_cost := total_cost + selected.price;
end loop;

    -- Buscar 1 opuesto
for selected in
select p.id, pmv.price
from public.players p
         join public.player_market_values pmv on pmv.player_id = p.id and pmv.round_id = p_round_id
where p.competition_id = p_competition_id and p.season_id = p_season_id and p.position = 'opposite'
  and p.id not in (select player_id from public.fantasy_team_players where league_id = p_league_id and is_active = true)
order by md5(p.id::text || p_team_id::text) limit 1
    loop
        selected_players := array_append(selected_players, selected.id);
total_cost := total_cost + selected.price;
end loop;

    -- Buscar 1 líbero
for selected in
select p.id, pmv.price
from public.players p
         join public.player_market_values pmv on pmv.player_id = p.id and pmv.round_id = p_round_id
where p.competition_id = p_competition_id and p.season_id = p_season_id and p.position = 'libero'
  and p.id not in (select player_id from public.fantasy_team_players where league_id = p_league_id and is_active = true)
order by md5(p.id::text || p_team_id::text) limit 1
    loop
        selected_players := array_append(selected_players, selected.id);
total_cost := total_cost + selected.price;
end loop;

    -- Buscar 2 centrales
for selected in
select p.id, pmv.price
from public.players p
         join public.player_market_values pmv on pmv.player_id = p.id and pmv.round_id = p_round_id
where p.competition_id = p_competition_id and p.season_id = p_season_id and p.position = 'middle'
  and p.id not in (select player_id from public.fantasy_team_players where league_id = p_league_id and is_active = true)
order by md5(p.id::text || p_team_id::text) limit 2
    loop
        selected_players := array_append(selected_players, selected.id);
total_cost := total_cost + selected.price;
end loop;

    -- Buscar 2 receptores
for selected in
select p.id, pmv.price
from public.players p
         join public.player_market_values pmv on pmv.player_id = p.id and pmv.round_id = p_round_id
where p.competition_id = p_competition_id and p.season_id = p_season_id and p.position = 'outside'
  and p.id not in (select player_id from public.fantasy_team_players where league_id = p_league_id and is_active = true)
order by md5(p.id::text || p_team_id::text) limit 2
    loop
        selected_players := array_append(selected_players, selected.id);
total_cost := total_cost + selected.price;
end loop;

    if coalesce(array_length(selected_players, 1), 0) < 7 or total_cost > 100 then
        raise exception 'No hay suficientes jugadores libres en esta liga para crear un equipo válido (1/1/2/2/1) o el coste supera 100M.';
end if;

insert into public.fantasy_team_players (fantasy_team_id, league_id, competition_id, season_id, player_id, joined_round_id, buy_price)
select p_team_id, p_league_id, p_competition_id, p_season_id, p.id, p_round_id, pmv.price
from public.players p
         join public.player_market_values pmv on pmv.player_id = p.id and pmv.round_id = p_round_id
where p.id = any(selected_players);

insert into public.lineups (fantasy_team_id, competition_id, season_id, round_id)
values (p_team_id, p_competition_id, p_season_id, p_round_id) returning id into new_lineup_id;

insert into public.lineup_players (lineup_id, competition_id, season_id, player_id, position_slot)
select new_lineup_id, p_competition_id, p_season_id, ftp.player_id,
       row_number() over (order by case p.position when 'setter' then 1 when 'opposite' then 2 when 'outside' then 3 when 'middle' then 4 when 'libero' then 5 else 6 end, ftp.player_id)::smallint
from public.fantasy_team_players ftp
         join public.players p on p.id = ftp.player_id
where ftp.fantasy_team_id = p_team_id and ftp.is_active;

update public.fantasy_teams set budget = 100 - total_cost, updated_at = now() where id = p_team_id;
end;
$$;