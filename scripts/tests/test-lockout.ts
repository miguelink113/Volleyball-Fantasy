import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
config({ path: resolve(process.cwd(), ".env.local") });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
    console.log("== TEST: BLOQUEO DE JORNADAS (FASE 10) ==\n");
    const email = `test-lock-${Date.now()}@test.com`;
    const password = "TestPassword123!";
    let userId = "", leagueId = "", roundId = "";

    try {
        const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: `lk_${Date.now().toString().slice(-6)}` } });
        userId = u.user!.id;
        await userClient.auth.signInWithPassword({ email, password });

        const { data: comp } = await admin.from("competitions").select("id").eq("rfevb_id", "152").single();
        const { data: season } = await admin.from("seasons").select("id").eq("competition_id", comp!.id).eq("rfevb_id", "186").single();
        const { data: round } = await admin.from("rounds").select("id, starts_at, ends_at").eq("season_id", season!.id).eq("round_number", 2).single(); // Usamos la J2
        roundId = round!.id;

        const { data: l } = await userClient.rpc("create_private_league", { p_competition_id: comp!.id, p_season_id: season!.id, p_name: "Lock Test", p_join_code: `LK${Date.now().toString().slice(-4)}`, p_round_id: roundId });
        leagueId = l as string;

        const { data: team } = await admin.from("fantasy_teams").select("id").eq("league_id", leagueId).single();

        // Obtenemos los jugadores actuales
        const { data: roster } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", team!.id);
        const players = roster!.map(r => r.player_id);

        console.log("Test 1: Jornada en el pasado (bloqueada)");
        // Forzamos que la jornada empezara hace 2 horas
        await admin.from("rounds").update({
            starts_at: new Date(Date.now() - 7200000).toISOString(),
            ends_at: new Date(Date.now() + 7200000).toISOString()
        }).eq("id", roundId);

        const { error: err1 } = await userClient.rpc("save_lineup", { p_fantasy_team_id: team!.id, p_round_id: roundId, p_player_ids: players });
        if (!err1 || !err1.message.includes("bloqueada porque la jornada ya ha comenzado")) throw new Error("No bloqueó la alineación en jornada pasada: " + err1?.message);

        const { error: err2 } = await userClient.rpc("transfer_player", { p_fantasy_team_id: team!.id, p_player_id: players[0], p_round_id: roundId, p_type: "SELL" });
        if (!err2 || !err2.message.includes("closed because the round has started")) throw new Error("No bloqueó la transferencia en jornada pasada");
        console.log("  ✔ RPCs bloquean operaciones si la jornada ya empezó.\n");

        console.log("Test 2: Jornada en el futuro (abierta)");
        // Restauramos las fechas al futuro
        await admin.from("rounds").update({
            starts_at: new Date(Date.now() + 7200000).toISOString(),
            ends_at: new Date(Date.now() + 14400000).toISOString()
        }).eq("id", roundId);

        const { error: err3 } = await userClient.rpc("save_lineup", { p_fantasy_team_id: team!.id, p_round_id: roundId, p_player_ids: players });
        if (err3) throw new Error("Falló el guardado en jornada futura: " + err3.message);
        console.log("  ✔ Las operaciones se permiten en jornadas futuras.\n");

        console.log("✅ TESTS DE BLOQUEO PASADOS.");
    } finally {
        // Limpieza y restauración
        await admin.from("rounds").update({ starts_at: new Date(Date.now() + 86400000).toISOString(), ends_at: new Date(Date.now() + 172800000).toISOString() }).eq("id", roundId); // Dejar en futuro lejano
        if (leagueId) await admin.from("private_leagues").delete().eq("id", leagueId);
        if (userId) await admin.auth.admin.deleteUser(userId);
        console.log("🧹 Limpieza completada.");
    }
}

run().catch((err) => {
    console.error("❌ TEST FALLIDO:", err.message);
    process.exit(1);
});