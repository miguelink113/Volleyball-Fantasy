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
    console.log("== TEST: REGLAS DE ALINEACIÓN (FASE 8) ==\n");

    const email = `test-lineup-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    let userId = "";
    let leagueId = "";
    let teamId = "";
    let roundId = "";
    let originalRound: any = null;

    let extraSetterId = "";

    try {
        console.log("→ Creando usuario de prueba...");
        const { data: authData, error: authErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username: `tst_l_${Date.now().toString().slice(-8)}` }
        });
        if (authErr || !authData.user) throw new Error("Fallo creando usuario: " + authErr?.message);
        userId = authData.user.id;

        await userClient.auth.signInWithPassword({ email, password });

        const { data: comp } = await admin.from("competitions").select("id").eq("rfevb_id", "152").single();
        const { data: season } = await admin.from("seasons").select("id").eq("competition_id", comp!.id).eq("rfevb_id", "186").single();
        const { data: round } = await admin.from("rounds").select("id, starts_at, ends_at").eq("season_id", season!.id).eq("round_number", 1).single();
        roundId = round!.id;
        originalRound = round;

        // PARCHE: Forzar jornada al futuro
        await admin.from("rounds").update({
            starts_at: new Date(Date.now() + 86400000).toISOString(),
            ends_at: new Date(Date.now() + 172800000).toISOString()
        }).eq("id", roundId);

        console.log("→ Creando liga (esto auto-genera un equipo con 7 jugadores)...");
        const { data: newLeagueId } = await userClient.rpc("create_private_league", {
            p_competition_id: comp!.id, p_season_id: season!.id, p_name: "Test Lineup", p_join_code: `L${Date.now().toString().slice(-5)}`, p_round_id: roundId
        });
        leagueId = newLeagueId as string;

        const { data: team } = await admin.from("fantasy_teams").select("id").eq("league_id", leagueId).single();
        teamId = team!.id;

        const { data: currentRoster } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", teamId).eq("is_active", true);
        const initialPlayerIds = currentRoster!.map(r => r.player_id);

        console.log("✔ Entorno preparado con equipo de 7 jugadores.\n");

        // TEST 1: Alineación válida
        console.log("Test 1: Guardar alineación válida (7 jugadores correctos)");
        const { error: save1Err } = await userClient.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundId, p_player_ids: initialPlayerIds
        });
        if (save1Err) throw new Error("Falló el guardado válido: " + save1Err.message);
        console.log("  ✔ Alineación guardada correctamente.\n");

        // TEST 2: Número incorrecto
        console.log("Test 2: Rechazar alineación con 6 jugadores");
        const { error: save2Err } = await userClient.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundId, p_player_ids: initialPlayerIds.slice(0, 6)
        });
        if (!save2Err || !save2Err.message.includes("exactamente 7 jugadores")) throw new Error("No bloqueó la alineación con 6 jugadores");
        console.log("  ✔ Bloqueado correctamente (faltan jugadores).\n");

        // TEST 3: Jugadores duplicados
        console.log("Test 3: Rechazar alineación con IDs duplicados");
        const duplicatedIds = [initialPlayerIds[0], initialPlayerIds[0], initialPlayerIds[1], initialPlayerIds[2], initialPlayerIds[3], initialPlayerIds[4], initialPlayerIds[5]];
        const { error: save3Err } = await userClient.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundId, p_player_ids: duplicatedIds
        });
        if (!save3Err || !save3Err.message.includes("duplicados")) throw new Error("No bloqueó los jugadores duplicados");
        console.log("  ✔ Bloqueado correctamente (jugadores duplicados).\n");

        // TEST 4: Composición inválida
        console.log("Test 4: Rechazar composición incorrecta (jugando con 2 colocadores)");
        const { data: extraSetter } = await admin.from("players").select("id").eq("season_id", season!.id).eq("position", "setter").neq("id", initialPlayerIds[0]).limit(1).single();
        extraSetterId = extraSetter!.id;

        await userClient.rpc("transfer_player", { p_fantasy_team_id: teamId, p_player_id: extraSetterId, p_round_id: roundId, p_type: "BUY" });

        const invalidLineup = [...initialPlayerIds.slice(0, 6), extraSetterId];
        const { error: save4Err } = await userClient.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundId, p_player_ids: invalidLineup
        });
        if (!save4Err || !save4Err.message.includes("Composición inválida")) throw new Error("No bloqueó la composición inválida");
        console.log("  ✔ Bloqueado correctamente (composición 1/1/2/2/1 no respetada).\n");

        // TEST 5: Jugador ajeno
        console.log("Test 5: Rechazar jugador ajeno a la plantilla");
        const { data: outsider } = await admin.from("players").select("id").eq("season_id", season!.id).limit(1).single();
        const outsiderLineup = [...initialPlayerIds.slice(0, 6), outsider!.id];
        const { error: save5Err } = await userClient.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundId, p_player_ids: outsiderLineup
        });
        if (!save5Err || !save5Err.message.includes("pertenecer a tu plantilla")) throw new Error("No bloqueó a un jugador ajeno");
        console.log("  ✔ Bloqueado correctamente (jugador no pertenece al equipo).\n");

        // TEST 6: Bloqueo por jornada
        console.log("Test 6: Bloqueo de alineación durante la jornada");
        await admin.from("rounds").update({
            starts_at: new Date(Date.now() - 3600000).toISOString(),
            ends_at: new Date(Date.now() + 3600000).toISOString()
        }).eq("id", roundId);

        const { error: save6Err } = await userClient.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundId, p_player_ids: initialPlayerIds
        });

        if (!save6Err || !save6Err.message.includes("bloqueada")) throw new Error("No bloqueó la alineación en jornada en vivo");
        console.log("  ✔ Bloqueado correctamente (jornada en curso).\n");

        console.log("✅ TODOS LOS TESTS DE LA FASE 8 HAN PASADO.");

    } finally {
        // Restaurar fechas y limpiar
        if (roundId && originalRound) {
            await admin.from("rounds").update({ starts_at: originalRound.starts_at, ends_at: originalRound.ends_at }).eq("id", roundId);
        }
        if (leagueId) await admin.from("private_leagues").delete().eq("id", leagueId);
        if (userId) await admin.auth.admin.deleteUser(userId);
        console.log("\n🧹 Limpieza completada.");
    }
}

run().catch((err) => {
    console.error("❌ TEST FALLIDO:", err.message);
    process.exit(1);
});