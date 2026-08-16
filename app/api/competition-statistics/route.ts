import { NextRequest, NextResponse } from "next/server";

import { scrapeCompetition } from "@/lib/scraper/fetch-competition-statistics";

export async function GET(request: NextRequest) {
    try {
        const searchParams =
            request.nextUrl.searchParams;

        const competition =
            searchParams.get("competition");

        const season =
            searchParams.get("season");

        const round =
            searchParams.get("round");

        if (!competition || !season) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Faltan competition-statistics y season.",
                },
                { status: 400 }
            );
        }

        const competitionId = Number(competition);
        const seasonId = Number(season);

        const roundNumber =
            round !== null
                ? Number(round)
                : undefined;

        if (
            !Number.isInteger(competitionId) ||
            !Number.isInteger(seasonId) ||
            (
                roundNumber !== undefined &&
                !Number.isInteger(roundNumber)
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Los parámetros deben ser números enteros.",
                },
                { status: 400 }
            );
        }

        const results =
            await scrapeCompetition(
                competitionId,
                seasonId,
                roundNumber
            );

        return NextResponse.json({
            success: true,
            count: results.length,
            matches: results,
        });

    } catch (error) {
        console.error(
            "Error obteniendo competición:",
            error
        );

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