import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin.server"; // <-- IMPORTANTE

export async function GET(request: NextRequest) {
    const leagueId = request.nextUrl.searchParams.get("league_id");
    if (!leagueId) return NextResponse.json({ error: "Falta league_id" }, { status: 400 });

    // 1. Cliente normal para verificar quién está pidiendo los datos
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // 2. Verificar que el usuario es miembro de la liga
    const { data: member } = await supabase
        .from("private_league_members")
        .select("league_id")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!member) return NextResponse.json({ error: "No perteneces a esta liga" }, { status: 403 });

    // 3. Usar el cliente Admin para saltar RLS y leer los datos de todos los miembros
    const admin = createAdminClient();

    // 3a. Obtener equipos
    const { data: teams } = await admin
        .from("fantasy_teams")
        .select("id, name, user_id")
        .eq("league_id", leagueId);

    if (!teams || teams.length === 0) return NextResponse.json({ success: true, ranking: [] });

    const teamIds = teams.map(t => t.id);
    const userIds = teams.map(t => t.user_id);

    // 3b. Obtener nombres de usuario (profiles)
    const { data: profiles } = await admin
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    // 3c. Obtener puntuaciones acumuladas
    const { data: scores } = await admin
        .from("fantasy_scores")
        .select("fantasy_team_id, score")
        .in("fantasy_team_id", teamIds);

    // Sumamos los puntos de cada equipo
    const scoreMap = new Map<string, number>();
    scores?.forEach(s => {
        scoreMap.set(s.fantasy_team_id, (scoreMap.get(s.fantasy_team_id) || 0) + s.score);
    });

    // 4. Construir el ranking final
    const ranking = teams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        username: profileMap.get(team.user_id) || "Desconocido",
        totalPoints: scoreMap.get(team.id) || 0
    })).sort((a, b) => b.totalPoints - a.totalPoints); // Ordenar de mayor a menor

    return NextResponse.json({ success: true, ranking });
}