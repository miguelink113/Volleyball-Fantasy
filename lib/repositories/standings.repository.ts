// lib/repositories/standings.repository.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface StandingWithTeam {
    position: number;
    group_name: string | null;
    points: number;
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    sets_won: number;
    sets_lost: number;
    points_won: number;
    points_lost: number;
    sets_ratio: number | null;
    points_ratio: number | null;
    penalty: number;
    team: { id: string; name: string };
}

export async function getStandings(
    supabase: SupabaseClient,
    seasonId: string,
): Promise<StandingWithTeam[]> {
    const { data, error } = await supabase
        .from('team_standings')
        .select(`
      position, group_name, points,
      matches_played, matches_won, matches_lost,
      sets_won, sets_lost, points_won, points_lost,
      sets_ratio, points_ratio, penalty,
      team:teams(id, name)
    `)
        .eq('season_id', seasonId)
        .order('group_name', { nullsFirst: true })
        .order('position')
        .returns<StandingWithTeam[]>();
    if (error) throw error;
    return data ?? [];
}