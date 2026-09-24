import assert from "node:assert/strict";
import { BasicScoringSystem } from "@/domain/scoring/basic-scoring.system";
import type { Match } from "@/domain/match/match.types";
import { mapScrapedMatch } from "@/lib/domain/map-scraped-match";
import type { Match as ScrapedMatch } from "@/lib/scraper/fetch-matches";
import type {
    MatchStats,
    PlayerStats,
} from "@/lib/scraper/fetch-match-statistics";

function createPlayerStats(
    overrides: Partial<PlayerStats> = {}
): PlayerStats {
    return {
        number: 7,
        name: "Ana García",
        startingFormation: {
            position1: 1,
            position2: 2,
            position3: "*",
            position4: null,
            position5: null,
        },
        points: {
            total: 12,
            bp: 2,
            wonLost: 5,
        },
        serve: {
            total: 10,
            errors: 1,
            directPoints: 2,
        },
        reception: {
            total: 8,
            errors: 1,
            positivePercentage: 75,
            excellentPercentage: 50,
        },
        attack: {
            total: 20,
            errors: 2,
            blocks: 3,
            excellent: 9,
            excellentPercentage: 45,
        },
        block: {
            points: 1,
        },
        ...overrides,
    };
}

function createScrapedMatch(): ScrapedMatch {
    return {
        matchId: "match-1",
        competitionId: "152",
        categoryId: "362",
        seasonId: "186",
        round: 1,
        homeTeam: "Equipo Local",
        awayTeam: "Equipo Visitante",
        url: "https://example.test/match-1",
    };
}

function createMatchStats(
    teams: MatchStats["teams"] = [
        {
            name: "Equipo Local",
            players: [createPlayerStats()],
        },
        {
            name: "Equipo Visitante",
            players: [
                createPlayerStats({
                    number: 8,
                    name: "Luis Pérez",
                }),
            ],
        },
    ]
): MatchStats {
    return {
        matchId: "match-1",
        competitionId: "152",
        categoryId: "362",
        seasonId: "186",
        homeTeam: "Equipo Local",
        awayTeam: "Equipo Visitante",
        homeScore: 3,
        awayScore: 1,
        sets: [
            { home: 25, away: 20 },
            { home: 25, away: 22 },
            { home: 20, away: 25 },
            { home: 25, away: 18 },
        ],
        teams,
    };
}

function testBasicScoringSystem(): void {
    const scoringSystem = new BasicScoringSystem();
    const match: Match = {
        id: "match-1",
        rfevbMatchId: "match-1",
        competitionId: "152",
        seasonId: "186",
        roundNumber: 1,
        homeTeamId: "home",
        awayTeamId: "away",
        homeSets: 3,
        awaySets: 1,
        status: "COMPLETED",
    };

    const result = scoringSystem.calculate(
        {
            matchId: "match-1",
            playerId: "player-1",
            teamId: "home",
            setsPlayed: 3,
            pointsTotal: 12,
            pointsBreakout: 2,
            wonLost: 5,
            serveTotal: 10,
            serveErrors: 1,
            serveAces: 2,
            receptionTotal: 8,
            receptionErrors: 1,
            receptionPositive: 75,
            receptionExcellent: 50,
            attackTotal: 20,
            attackErrors: 2,
            attackBlocked: 3,
            attackPoints: 9,
            blockPoints: 1,
        },
        match
    );

    assert.equal(scoringSystem.version, "basic-v1");
    assert.deepEqual(result, {
        totalScore: 8,
        breakdown: {
            setsPlayed: 3,
            wonLost: 5,
        },
        isProvisional: true,
    });
}

function testMatchMapping(): void {
    const mapped = mapScrapedMatch(
        createScrapedMatch(),
        createMatchStats()
    );

    assert.equal(mapped.competition.rfevbId, "152");
    assert.equal(mapped.season.competitionId, "152");
    assert.equal(mapped.match.competitionId, "152");
    assert.equal(mapped.match.roundNumber, 1);
    assert.equal(mapped.match.homeSets, 3);
    assert.equal(mapped.match.awaySets, 1);
    assert.equal(mapped.match.sets?.length, 4);

    const playerStats = mapped.playerStats[0];
    assert.ok(playerStats);
    assert.equal(playerStats.setsPlayed, 3);
    assert.equal(playerStats.pointsBreakout, 2);
    assert.equal(playerStats.wonLost, 5);
    assert.equal(playerStats.serveAces, 2);
    assert.equal(playerStats.attackBlocked, 3);

    const player = mapped.teams[0]?.players[0];
    assert.ok(player);
    assert.equal(player.firstName, "Ana");
    assert.equal(player.lastName, "García");
    assert.equal(player.displayName, "Ana García");
    assert.equal(player.position, "outside");
}

function testNullStatisticsBecomeZero(): void {
    const mapped = mapScrapedMatch(
        createScrapedMatch(),
        createMatchStats([
            {
                name: "Equipo Local",
                players: [
                    createPlayerStats({
                        points: {
                            total: null,
                            bp: null,
                            wonLost: null,
                        },
                        serve: {
                            total: null,
                            errors: null,
                            directPoints: null,
                        },
                        reception: {
                            total: null,
                            errors: null,
                            positivePercentage: null,
                            excellentPercentage: null,
                        },
                        attack: {
                            total: null,
                            errors: null,
                            blocks: null,
                            excellent: null,
                            excellentPercentage: null,
                        },
                        block: {
                            points: null,
                        },
                    }),
                ],
            },
            {
                name: "Equipo Visitante",
                players: [],
            },
        ])
    );

    assert.deepEqual(mapped.playerStats[0], {
        id: "match-player:match-1-team-equipo-local-7",
        matchId: "match-1",
        playerId: "player:team-equipo-local-7-ana-garcia",
        teamId: "team:equipo-local",
        setsPlayed: 3,
        pointsTotal: 0,
        pointsBreakout: 0,
        wonLost: 0,
        serveTotal: 0,
        serveErrors: 0,
        serveAces: 0,
        receptionTotal: 0,
        receptionErrors: 0,
        receptionPositive: 0,
        receptionExcellent: 0,
        attackTotal: 0,
        attackErrors: 0,
        attackBlocked: 0,
        attackPoints: 0,
        blockPoints: 0,
    });
}

function testIncompleteMatchIsRejected(): void {
    assert.throws(
        () =>
            mapScrapedMatch(
                createScrapedMatch(),
                createMatchStats([{ name: "Equipo Local", players: [] }])
            ),
        /Se esperaban dos equipos/
    );
}

interface DomainTest {
    name: string;
    description: string;
    run: () => void;
}

const tests: DomainTest[] = [
    {
        name: "BasicScoringSystem",
        description:
            "Comprueba la versión del sistema y la fórmula provisional " +
            "sets jugados + G-P.",
        run: testBasicScoringSystem,
    },
    {
        name: "Mapeo de partido completo",
        description:
            "Comprueba que competición, temporada, partido, jugador y " +
            "estadísticas adoptan el contrato del dominio.",
        run: testMatchMapping,
    },
    {
        name: "Normalización de estadísticas ausentes",
        description:
            "Comprueba que los valores null proporcionados por RFEVB se " +
            "convierten en cero sin perder la participación registrada.",
        run: testNullStatisticsBecomeZero,
    },
    {
        name: "Rechazo de partido incompleto",
        description:
            "Comprueba que el mapper falla explícitamente cuando no recibe " +
            "los dos equipos necesarios.",
        run: testIncompleteMatchIsRejected,
    },
];

function formatError(error: unknown): string {
    if (error instanceof assert.AssertionError) {
        return `${error.message}\n       Actual: ${JSON.stringify(
            error.actual
        )}\n       Esperado: ${JSON.stringify(error.expected)}`;
    }

    return error instanceof Error ? error.message : String(error);
}

function runDomainTests(): void {
    console.log("==========================================");
    console.log(" TESTS DE DOMINIO");
    console.log("==========================================");
    console.log(
        "Se validan el contrato de scoring, el mapper de partidos y " +
        "la normalización de datos incompletos.\n"
    );

    let passed = 0;

    tests.forEach((test, index) => {
        console.log(`[${index + 1}/${tests.length}] ${test.name}`);
        console.log(`    Qué se prueba: ${test.description}`);
        console.log("    Ejecutando...");

        try {
            test.run();
            passed += 1;
            console.log(`    ✅ SUPERADO: ${test.name}\n`);
        } catch (error) {
            console.error(`    ❌ FALLIDO: ${test.name}`);
            console.error(`       Motivo: ${formatError(error)}\n`);
        }
    });

    const failed = tests.length - passed;
    console.log("==========================================");
    console.log(
        ` RESULTADO: ${passed} superados, ${failed} fallidos ` +
        `de ${tests.length}`
    );
    console.log("==========================================");

    if (failed > 0) {
        throw new Error(
            `${failed} test(s) de dominio han fallado. ` +
            "Revisa el detalle mostrado sobre cada caso."
        );
    }

    console.log("✅ Todos los tests de dominio han pasado.");
}

runDomainTests();
