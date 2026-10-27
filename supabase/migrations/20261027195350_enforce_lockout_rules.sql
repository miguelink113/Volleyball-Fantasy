-- Modificamos save_lineup para que el bloqueo sea estricto: si la jornada ya empezó, no se puede tocar.
create or replace function public.save_lineup(
    p_fantasy_team_id uuid,
    p_round_id uuid,
    p_player_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
v_team public.fantasy_teams%rowtype;
    v_round public.rounds%rowtype;
    v_count_setter int;
    v_count_opposite int;
    v_count_outside int;
    v_count_middle int;
    v_count_libero int;
    v_valid_players int;
    v_lineup_id uuid;
begin
    -- 1. Validar equipo y jornada
select * into v_team from public.fantasy_teams where id = p_fantasy_team_id and user_id = auth.uid();
if not found then raise exception 'Equipo no encontrado o no te pertenece'; end if;

select * into v_round from public.rounds where id = p_round_id;
if not found then raise exception 'Jornada no encontrada'; end if;

    -- EL CAMBIO CLAVE: Si ya ha empezado (o pasó), está bloqueada.
    if now() >= v_round.starts_at then
        raise exception 'La alineación está bloqueada porque la jornada ya ha comenzado o finalizado.';
end if;

    -- 2. Validar cantidad y duplicados
    if array_length(p_player_ids, 1) is null or array_length(p_player_ids, 1) != 7 then
        raise exception 'La alineación debe tener exactamente 7 jugadores';
end if;

    if (select count(distinct p_id) from unnest(p_player_ids) as p_id) != 7 then
        raise exception 'No se permiten jugadores duplicados en la alineación';
end if;

    -- 3. Validar pertenencia
select count(*) into v_valid_players
from public.fantasy_team_players
where fantasy_team_id = p_fantasy_team_id and is_active = true and player_id = any(p_player_ids);

if v_valid_players != 7 then raise exception 'Todos los jugadores deben pertenecer a tu plantilla activa'; end if;

    -- 4. Validar composición (1/1/2/2/1)
select
    count(*) filter (where position = 'setter'),
    count(*) filter (where position = 'opposite'),
    count(*) filter (where position = 'outside'),
    count(*) filter (where position = 'middle'),
    count(*) filter (where position = 'libero')
into v_count_setter, v_count_opposite, v_count_outside, v_count_middle, v_count_libero
from public.players where id = any(p_player_ids);

if v_count_setter != 1 or v_count_opposite != 1 or v_count_outside != 2 or v_count_middle != 2 or v_count_libero != 1 then
        raise exception 'Composición inválida. Se requiere: 1 colocador, 1 opuesto, 2 receptores, 2 centrales, 1 líbero.';
end if;

    -- 5. Upsert alineación
insert into public.lineups (fantasy_team_id, competition_id, season_id, round_id)
values (p_fantasy_team_id, v_team.competition_id, v_team.season_id, p_round_id)
    on conflict (fantasy_team_id, round_id) do update set updated_at = now()
                                                   returning id into v_lineup_id;

delete from public.lineup_players where lineup_id = v_lineup_id;

insert into public.lineup_players (lineup_id, competition_id, season_id, player_id, position_slot)
select v_lineup_id, v_team.competition_id, v_team.season_id, p_id, row_number() over ()::smallint
from unnest(p_player_ids) as p_id;
end;
$$;

-- Modificamos transfer_player para aplicar la misma regla
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
select * into team from public.fantasy_teams where id = p_fantasy_team_id and user_id = auth.uid();
if not found then raise exception 'Fantasy team not found'; end if;

select * into round_data from public.rounds where id = p_round_id and competition_id = team.competition_id and season_id = team.season_id;
if not found then raise exception 'Round does not belong to team season'; end if;

    -- EL CAMBIO CLAVE
    if now() >= round_data.starts_at then
        raise exception 'Transfers are closed because the round has started or finished';
end if;

select pmv.price into price from public.player_market_values pmv
where pmv.player_id = p_player_id and pmv.round_id = p_round_id and pmv.competition_id = team.competition_id and pmv.season_id = team.season_id;
if price is null then raise exception 'Market value not found'; end if;

    if upper(p_type) = 'BUY' then
select count(*) into active_count from public.fantasy_team_players where fantasy_team_id = team.id and is_active;
if active_count >= 14 then raise exception 'Fantasy team limit reached'; end if;
        if exists (select 1 from public.fantasy_team_players where league_id = team.league_id and player_id = p_player_id and is_active) then raise exception 'Player already owned in league'; end if;
        if team.budget < price then raise exception 'Insufficient budget'; end if;

insert into public.fantasy_team_players (fantasy_team_id, league_id, competition_id, season_id, player_id, joined_round_id, buy_price)
values (team.id, team.league_id, team.competition_id, team.season_id, p_player_id, p_round_id, price);
update public.fantasy_teams set budget = budget - price, updated_at = now() where id = team.id;
elsif upper(p_type) = 'SELL' then
        if not exists (select 1 from public.fantasy_team_players where fantasy_team_id = team.id and player_id = p_player_id and is_active) then raise exception 'Player is not owned by team'; end if;

update public.fantasy_team_players set is_active = false, left_round_id = p_round_id, left_at = now() where fantasy_team_id = team.id and player_id = p_player_id and is_active;
update public.fantasy_teams set budget = budget + price, updated_at = now() where id = team.id;
else
        raise exception 'Transfer type must be BUY or SELL';
end if;

insert into public.transactions (fantasy_team_id, league_id, competition_id, season_id, player_id, round_id, type, amount)
values (team.id, team.league_id, team.competition_id, team.season_id, p_player_id, p_round_id, upper(p_type), price);
end;
$$;