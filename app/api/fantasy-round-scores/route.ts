import { NextRequest, NextResponse } from "next/server";
import type { Player } from "@/domain/player/player.types";
import { scrapeCompetition } from "@/lib/scraper/fetch-competition-statistics";
import { scrapeCompetitionRoster } from "@/lib/scraper/fetch-competition-roster";
import { calculateFantasyRoundScores } from "@/lib/services/fantasy/fantasy-round-score.service";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const competitionId = Number(params.get("competition"));
    const seasonId = Number(params.get("season"));
    const roundNumber = Number(params.get("round"));

    if (
        !Number.isInteger(competitionId) ||
        !Number.isInteger(seasonId) ||
        !Number.isInteger(roundNumber) ||
        competitionId <= 0 ||
        seasonId <= 0 ||
        roundNumber <= 0
    ) {
        return NextResponse.json(
            {
                success: false,
                error: "competition, season y round deben ser enteros positivos.",
            },
            { status: 400 }
        );
    }

    try {
        const [roster, matches] = await Promise.all([
            scrapeCompetitionRoster(competitionId),
            scrapeCompetition(competitionId, seasonId, roundNumber),
        ]);
        const players: Player[] = roster.players;
        const teamNameById = new Map(
            roster.teams.map((team) => [
                `rfevb:team:${team.rfevbId}`,
                team.name,
            ])
        );
        const scores = calculateFantasyRoundScores(
            matches,
            players,
            teamNameById
        );

        return NextResponse.json({
            success: true,
            competitionId: String(competitionId),
            seasonId: String(seasonId),
            roundNumber,
            scores,
        });
    } catch (error) {
        console.error("Error calculando puntuaciones fantasy:", error);

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error desconocido",
            },
            { status: 500 }
        );
    }
}
