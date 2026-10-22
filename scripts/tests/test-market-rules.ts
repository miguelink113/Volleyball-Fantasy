import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
config({ path: resolve(process.cwd(), ".env.local") });

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("== TEST: REGLAS DE MERCADO (FASE 7) ==\n");

    const email = `test-market-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    let userId = "";
    let leagueId = "";
    let teamId = "";
    let roundId = "";
    let player1Id = "";
    let player2Id = "";

    try {
        // 1. Setup: Crear usuario, loguearse
        console.log("→ Creando usuario de prueba...");
        const { data: authData, error: authErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username: `tst_${Date.now().toString().slice(-8)}` }
        });
        if (authErr || !authData.user) throw new Error("Fallo creando usuario: " + authErr?.message);
        userId = authData.user.id;

        await userClient.auth.signInWithPassword({ email, password });

        // 2. Buscar IDs necesarios
        console.log("→ Buscando competición, temporada y jornada...");
        const { data: comp, error: compErr } = await admin.from("competitions").select("id").eq("rfevb_id", "152").single();
        if (compErr || !comp) throw new Error("No se encontró la competición 152");

        const { data: season, error: seasonErr } = await admin.from("seasons").select("id").eq("competition_id", comp.id).eq("rfevb_id", "186").single();
        if (seasonErr || !season) throw new Error("No se encontró la temporada 186");

        const { data: round, error: roundErr } = await admin.from("rounds").select("id, starts_at, ends_at").eq("season_id", season.id).eq("round_number", 1).single();
        if (roundErr || !round) throw new Error("No se encontró la jornada 1 de la temporada 186");
        roundId = round.id;

        console.log("→ Creando liga...");
        const { data: newLeagueId, error: leagueErr } = await userClient.rpc("create_private_league", {
            p_competition_id: comp.id, p_season_id: season.id, p_name: "Test League", p_join_code: "TEST77", p_round_id: roundId
        });
        if (leagueErr || !newLeagueId) throw new Error("Fallo creando liga: " + leagueErr?.message);
        leagueId = newLeagueId as string;

        const { data: team, error: teamErr } = await admin.from("fantasy_teams").select("id, budget").eq("league_id", leagueId).single();
        if (teamErr || !team) throw new Error("No se encontró el equipo fantasy");
        teamId = team.id;

        // 3. Buscar jugadores que NO estén en nuestro equipo inicial
        const { data: currentRoster } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", teamId).eq("is_active", true);
        const ownedIds = currentRoster?.map(r => r.player_id) || [];
        const excludeString = ownedIds.length > 0 ? `(${ownedIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';

        const { data: players, error: playersErr } = await admin
            .from("players")
            .select("id")
            .eq("season_id", season.id)
            .not("id", "in", excludeString)
            .limit(15);

        if (playersErr || !players || players.length < 2) throw new Error("No hay suficientes jugadores libres en la temporada");
        player1Id = players[0].id;
        player2Id = players[1].id;

        console.log("✔ Entorno preparado.\n");

        // TEST 1: Compra exitosa
        console.log("Test 1: Compra normal");
        const { error: buyErr } = await userClient.rpc("transfer_player", { p_fantasy_team_id: teamId, p_player_id: player1Id, p_round_id: roundId, p_type: "BUY" });
        if (buyErr) throw new Error("Falló la compra normal: " + buyErr.message);
        console.log("  ✔ Compra realizada correctamente.\n");

        // TEST 2: Límite de 14 jugadores
        console.log("Test 2: Límite de plantilla (14 max)");

        // Damos presupuesto de sobra para asegurarnos de que el límite salta por cantidad, no por dinero
        await admin.from("fantasy_teams").update({ budget: 500 }).eq("id", teamId);

        let limitErr = null;
        let boughtCount = 0;

        // Buscamos 20 jugadores que NO tengamos ya
        const excludeIds2 = [...ownedIds, player1Id].join(',');
        const { data: extraPlayers } = await admin
            .from("players")
            .select("id")
            .eq("season_id", season.id)
            .not("id", "in", `(${excludeIds2})`)
            .limit(20);

        for (const p of extraPlayers!) {
            const { error } = await userClient.rpc("transfer_player", {
                p_fantasy_team_id: teamId,
                p_player_id: p.id,
                p_round_id: roundId,
                p_type: "BUY"
            });

            if (error) {
                if (error.message.includes("limit reached")) {
                    limitErr = error;
                    break;
                }
            } else {
                boughtCount++;
            }
        }

        if (!limitErr) throw new Error(`No saltó el límite de 14 jugadores después de comprar ${boughtCount} jugadores extra.`);
        console.log(`  ✔ Bloqueado al llegar a 14 jugadores (se compraron ${boughtCount} extra).\n`);

        // TEST 3: Exclusividad
        console.log("Test 3: Exclusividad de jugador");

        // 1. Cogemos un jugador que ya esté en el equipo
        const { data: ownedPlayer } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", teamId).eq("is_active", true).limit(1).single();

        // 2. Hacemos hueco vendiendo a otro jugador (porque tenemos 14, si no, salta el límite primero)
        const { data: playerToSell } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", teamId).eq("is_active", true).neq("player_id", ownedPlayer!.player_id).limit(1).single();

        await userClient.rpc("transfer_player", {
            p_fantasy_team_id: teamId,
            p_player_id: playerToSell!.player_id,
            p_round_id: roundId,
            p_type: "SELL"
        });

        // 3. Intentamos comprar al ownedPlayer de nuevo
        const { error: exclusiveErr } = await userClient.rpc("transfer_player", {
            p_fantasy_team_id: teamId,
            p_player_id: ownedPlayer!.player_id,
            p_round_id: roundId,
            p_type: "BUY"
        });

        if (!exclusiveErr || !exclusiveErr.message.includes("already owned")) throw new Error("No saltó la exclusividad al intentar comprar un jugador propio");
        console.log("  ✔ Bloqueada la compra de un jugador ya fichado.\n");

        // TEST 4: Bloqueo de jornada
        console.log("Test 4: Bloqueo por jornada en vivo");
        await admin.from("rounds").update({ starts_at: new Date(Date.now() - 3600000).toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString() }).eq("id", roundId);

        const { error: lockErr } = await userClient.rpc("transfer_player", { p_fantasy_team_id: teamId, p_player_id: player2Id, p_round_id: roundId, p_type: "BUY" });
        if (!lockErr || !lockErr.message.includes("Transfers are closed")) throw new Error("No saltó el bloqueo de jornada");
        console.log("  ✔ Transferencias bloqueadas durante la jornada.\n");

        // Restaurar la jornada
        await admin.from("rounds").update({ starts_at: round.starts_at, ends_at: round.ends_at }).eq("id", roundId);

        console.log("✅ TODOS LOS TESTS DE LA FASE 7 HAN PASADO.");

    } finally {
        // Limpieza
        if (leagueId) await admin.from("private_leagues").delete().eq("id", leagueId);
        if (userId) await admin.auth.admin.deleteUser(userId);
        console.log("\n🧹 Limpieza completada.");
    }
}

run().catch((err) => {
    console.error("❌ TEST FALLIDO:", err.message);
    process.exit(1);
});