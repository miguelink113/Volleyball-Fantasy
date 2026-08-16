import { NextRequest, NextResponse } from "next/server";
import { scrapeMatches } from "@/lib/scraper/fetch-matches";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const competition = searchParams.get("competition");
        const season = searchParams.get("season");
        const round = searchParams.get("round");

        if (!competition || !season) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Faltan los parámetros competition-statistics y season.",
                },
                { status: 400 }
            );
        }

        const competitionId = Number(competition);
        const seasonId = Number(season);
        const roundNumber =
            round !== null ? Number(round) : undefined;

        if (
            !Number.isInteger(competitionId) ||
            !Number.isInteger(seasonId) ||
            (roundNumber !== undefined &&
                !Number.isInteger(roundNumber))
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Los parámetros deben ser números enteros.",
                },
                { status: 400 }
            );
        }

        const matches = await scrapeMatches(
            competitionId,
            seasonId,
            roundNumber
        );

        return NextResponse.json({
            success: true,
            count: matches.length,
            matches,
        });
    } catch (error) {
        console.error("Error en el matches:", error);

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