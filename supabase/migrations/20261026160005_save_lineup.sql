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
    -- 1. Validar que el equipo pertenece al usuario autenticado
select * into v_team from public.fantasy_teams
where id = p_fantasy_team_id and user_id = auth.uid();
if not found then raise exception 'Equipo no encontrado o no te pertenece'; end if;

    -- 2. Validar que la jornada existe y no está bloqueada
select * into v_round from public.rounds where id = p_round_id;
if not found then raise exception 'Jornada no encontrada'; end if;
    if now() >= v_round.starts_at and now() <= v_round.ends_at then
        raise exception 'La alineación está bloqueada durante la jornada';
end if;

    -- 3. Validar que hay exactamente 7 jugadores
    if array_length(p_player_ids, 1) is null or array_length(p_player_ids, 1) != 7 then
        raise exception 'La alineación debe tener exactamente 7 jugadores';
end if;

    -- 3.1 Validar que no hay IDs duplicados
    if (select count(distinct p_id) from unnest(p_player_ids) as p_id) != 7 then
        raise exception 'No se permiten jugadores duplicados en la alineación';
end if;

    -- 4. Validar que los 7 jugadores están en la plantilla activa del equipo
select count(*) into v_valid_players
from public.fantasy_team_players
where fantasy_team_id = p_fantasy_team_id
  and is_active = true
  and player_id = any(p_player_ids);

if v_valid_players != 7 then
        raise exception 'Todos los jugadores deben pertenecer a tu plantilla activa';
end if;

    -- 5. Validar la composición (1/1/2/2/1)
select
    count(*) filter (where position = 'setter'),
    count(*) filter (where position = 'opposite'),
    count(*) filter (where position = 'outside'),
    count(*) filter (where position = 'middle'),
    count(*) filter (where position = 'libero')
into
    v_count_setter, v_count_opposite, v_count_outside, v_count_middle, v_count_libero
from public.players
where id = any(p_player_ids);

if v_count_setter != 1 or v_count_opposite != 1 or v_count_outside != 2 or v_count_middle != 2 or v_count_libero != 1 then
        raise exception 'Composición inválida. Se requiere: 1 colocador, 1 opuesto, 2 receptores, 2 centrales, 1 líbero.';
end if;

    -- 6. Guardar la alineación (borramos la anterior si existía)
delete from public.lineups
where fantasy_team_id = p_fantasy_team_id and round_id = p_round_id;

insert into public.lineups (fantasy_team_id, competition_id, season_id, round_id)
values (p_fantasy_team_id, v_team.competition_id, v_team.season_id, p_round_id)
    returning id into v_lineup_id;

insert into public.lineup_players (lineup_id, competition_id, season_id, player_id, position_slot)
select v_lineup_id, v_team.competition_id, v_team.season_id, p_id, row_number() over ()::smallint
from unnest(p_player_ids) as p_id;
end;
$$;

grant execute on function public.save_lineup(uuid, uuid, uuid[]) to authenticated;