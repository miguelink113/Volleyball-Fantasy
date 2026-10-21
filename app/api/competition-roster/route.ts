import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { getTeamsBySeasonId } from "@/lib/repositories/teams.repository";
import { getPlayersBySeasonId } from "@/lib/repositories/players.repository";
import { getMarketValuesByRoundId } from "@/lib/repositories/market-values.repository";

export async function GET(request: NextRequest) {
    const competition = request.nextUrl.searchParams.get("competition");
    const competitionId = Number(competition);

    if (!competition || !Number.isInteger(competitionId) || competitionId <= 0) {
        return NextResponse.json(
            { success: false, error: "El parámetro competition debe ser un entero positivo." },
            { status: 400 }
        );
    }

    try {
        const supabase = createAdminClient();
        const competitionRfevbId = String(competitionId);

        // 1. Obtener el UUID de la competición
        const { data: competitionData, error: compError } = await supabase
            .from("competitions")
            .select("id")
            .eq("rfevb_id", competitionRfevbId)
            .maybeSingle();

        if (compError) throw compError;
        if (!competitionData) {
            return NextResponse.json(
                { success: false, error: "Competición no encontrada en la base de datos." },
                { status: 404 }
            );
        }

        // 2. Obtener la temporada actual
        const { data: seasonData, error: seasonError } = await supabase
            .from("seasons")
            .select("id")
            .eq("competition_id", competitionData.id)
            .eq("is_current", true)
            .maybeSingle();

        if (seasonError) throw seasonError;
        if (!seasonData) {
            return NextResponse.json(
                { success: false, error: "Temporada actual no encontrada para esta competición." },
                { status: 404 }
            );
        }

        // 3. Obtener la primera jornada (para sacar los precios iniciales)
        const { data: roundData, error: roundError } = await supabase
            .from("rounds")
            .select("id")
            .eq("season_id", seasonData.id)
            .order("round_number", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (roundError) throw roundError;

        // 4. Leer equipos, jugadores y precios en paralelo
        const [teams, players, marketPrices] = await Promise.all([
            getTeamsBySeasonId(supabase, seasonData.id),
            getPlayersBySeasonId(supabase, seasonData.id),
            roundData ? getMarketValuesByRoundId(supabase, roundData.id) : Promise.resolve(new Map<string, number>()),
        ]);

        // 5. Inyectar el precio real a cada jugador
        const playersWithPrices = players.map((p) => ({
            ...p,
            price: marketPrices.get(p.id) ?? 9, // 9M por defecto si falta
        }));

        return NextResponse.json({
            success: true,
            competitionId: competitionRfevbId,
            seasonId: seasonData.id,
            teams,
            players: playersWithPrices,
        });

    } catch (error) {
        console.error("Error obteniendo el roster de la competición:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 }
        );
    }
}