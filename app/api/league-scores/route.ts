import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const leagueId = request.nextUrl.searchParams.get("league_id");
    if (!leagueId) return NextResponse.json({ error: "Falta league_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Obtener el equipo del usuario
    const { data: team } = await supabase.from("fantasy_teams").select("id").eq("league_id", leagueId).eq("user_id", user.id).single();
    if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

    // Obtener las puntuaciones REALES guardadas en la base de datos para este equipo
    const { data: scores } = await supabase
        .from("fantasy_scores")
        .select("score, round_id, rounds!inner(round_number)")
        .eq("fantasy_team_id", team.id);

    // Formatear para el frontend: { 1: 57, 2: 59, ... }
    const scoresMap: Record<number, number> = {};
    scores?.forEach((s: any) => {
        scoresMap[s.rounds.round_number] = s.score;
    });

    return NextResponse.json({ success: true, scores: scoresMap });
}