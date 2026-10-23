import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const leagueId = request.nextUrl.searchParams.get("league_id");

    if (!leagueId) {
        return NextResponse.json({ success: false, error: "Falta league_id" }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        // 1. Obtener el usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
        }

        // 2. Obtener el equipo del usuario para esta liga (filtrando por user_id)
        const { data: team, error: teamError } = await supabase
            .from("fantasy_teams")
            .select(`
                id, name, budget, season_id,
                seasons!inner (
                    rfevb_id,
                    competitions!inner ( rfevb_id )
                )
            `)
            .eq("league_id", leagueId)
            .eq("user_id", user.id) // <--- CRÍTICO: Solo el equipo de ESTE usuario
            .single();

        if (teamError || !team) {
            return NextResponse.json({ success: false, error: "Equipo no encontrado en esta liga" }, { status: 404 });
        }

        // Extraemos los IDs de RFEVB de la consulta anidada
        const seasonRfevbId = (team.seasons as any).rfevb_id;
        const competitionRfevbId = (team.seasons as any).competitions.rfevb_id;

        // 3. Obtener los jugadores activos de la plantilla
        const { data: teamPlayers, error: playersError } = await supabase
            .from("fantasy_team_players")
            .select("player_id")
            .eq("fantasy_team_id", team.id)
            .eq("is_active", true);

        if (playersError) throw playersError;
        const activePlayerIds = teamPlayers.map((p) => p.player_id);

        // 4. Obtener la alineación actual
        const { data: lineup, error: lineupError } = await supabase
            .from("lineups")
            .select("id")
            .eq("fantasy_team_id", team.id)
            .limit(1)
            .maybeSingle();

        let lineupPlayerIds: string[] = [];
        if (lineup) {
            const { data: lineupPlayers } = await supabase
                .from("lineup_players")
                .select("player_id")
                .eq("lineup_id", lineup.id);

            if (lineupPlayers) {
                lineupPlayerIds = lineupPlayers.map((p) => p.player_id);
            }
        }

        return NextResponse.json({
            success: true,
            team: {
                id: team.id,
                name: team.name,
                budget: team.budget,
            },
            season_id: team.season_id,
            competition_rfevb_id: competitionRfevbId,
            season_rfevb_id: seasonRfevbId,
            activePlayerIds,
            lineupPlayerIds,
        });

    } catch (error) {
        console.error("Error obteniendo el equipo fantasy:", error);
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
    }
}