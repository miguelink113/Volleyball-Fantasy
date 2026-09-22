import { NextRequest, NextResponse } from "next/server";
import { scrapeCompetitionRoster } from "@/lib/scraper/fetch-competition-roster";

export async function GET(request: NextRequest) {
    const competition = request.nextUrl.searchParams.get("competition");
    const competitionId = Number(competition);

    if (
        !competition ||
        !Number.isInteger(competitionId) ||
        competitionId <= 0
    ) {
        return NextResponse.json(
            {
                success: false,
                error: "El parámetro competition debe ser un entero positivo.",
            },
            { status: 400 }
        );
    }

    try {
        const roster = await scrapeCompetitionRoster(competitionId);

        return NextResponse.json({
            success: true,
            ...roster,
        });
    } catch (error) {
        console.error("Error obteniendo el roster de la competición:", error);

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
