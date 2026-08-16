import { NextRequest, NextResponse } from "next/server";
import { scrapeMatch } from "@/lib/scraper/fetch-match-statistics";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const matchId = searchParams.get("matchId");
        const competitionId = searchParams.get("competition");
        const categoryId = searchParams.get("category");
        const seasonId = searchParams.get("season");

        if (
            !matchId ||
            !competitionId ||
            !categoryId ||
            !seasonId
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Faltan matchId, competition-statistics, category o season.",
                },
                { status: 400 }
            );
        }

        const stats = await scrapeMatch(
            matchId,
            competitionId,
            categoryId,
            seasonId
        );

        return NextResponse.json({
            success: true,
            match: stats,
        });
    } catch (error) {
        console.error(
            "Error obteniendo estadísticas del partido:",
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