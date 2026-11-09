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

        // 3. Obtener la última jornada que tenga precios calculados.
        //    Como hay múltiples grupos por jornada (A, B, C), necesitamos
        //    agregar precios de TODAS las rondas de esa jornada.
        const { data: latestRound } = await supabase
            .from("rounds")
            .select("round_number")
            .eq("season_id", seasonData.id)
            .order("round_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        let marketPrices = new Map<string, number>();

        if (latestRound) {
            const { data: targetRounds } = await supabase
                .from("rounds")
                .select("id")
                .eq("season_id", seasonData.id)
                .eq("round_number", latestRound.round_number);

            for (const round of targetRounds || []) {
                const roundPrices = await getMarketValuesByRoundId(supabase, round.id);
                for (const [playerId, price] of roundPrices) {
                    marketPrices.set(playerId, price);
                }
            }
        }

        // 4. Leer equipos y jugadores en paralelo
        const [teams, players] = await Promise.all([
            getTeamsBySeasonId(supabase, seasonData.id),
            getPlayersBySeasonId(supabase, seasonData.id),
        ]);

        // 5. Inyectar precio real (fallback 1M, no 10M)
        const playersWithPrices = players.map((p) => ({
            ...p,
            price: marketPrices.get(p.id) ?? 1,
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