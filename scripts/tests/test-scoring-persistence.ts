import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
config({ path: resolve(process.cwd(), ".env.local") });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
    console.log("== TEST: PERSISTENCIA DE SCORING Y AISLAMIENTO (FASE 9) ==\n");

    const email1 = `test-score1-${Date.now()}@test.com`;
    const email2 = `test-score2-${Date.now()}@test.com`;
    const password = "TestPassword123!";
    let user1Id = "", user2Id = "";
    let league1Id = "", league2Id = "";

    try {
        // 1. Crear 2 usuarios
        const { data: u1 } = await admin.auth.admin.createUser({ email: email1, password, email_confirm: true, user_metadata: { username: `sc1_${Date.now().toString().slice(-6)}` } });
        const { data: u2 } = await admin.auth.admin.createUser({ email: email2, password, email_confirm: true, user_metadata: { username: `sc2_${Date.now().toString().slice(-6)}` } });
        user1Id = u1.user!.id;
        user2Id = u2.user!.id;

        const { data: comp } = await admin.from("competitions").select("id").eq("rfevb_id", "152").single();
        const { data: season } = await admin.from("seasons").select("id").eq("competition_id", comp!.id).eq("rfevb_id", "186").single();
        const { data: round } = await admin.from("rounds").select("id").eq("season_id", season!.id).eq("round_number", 1).single();

        // 2. Usuario 1 crea liga
        await userClient.auth.signInWithPassword({ email: email1, password });
        const { data: l1 } = await userClient.rpc("create_private_league", { p_competition_id: comp!.id, p_season_id: season!.id, p_name: "Liga 1", p_join_code: `L1${Date.now().toString().slice(-4)}`, p_round_id: round!.id });
        league1Id = l1 as string;

        // 3. Usuario 2 crea liga
        await userClient.auth.signInWithPassword({ email: email2, password });
        const { data: l2 } = await userClient.rpc("create_private_league", { p_competition_id: comp!.id, p_season_id: season!.id, p_name: "Liga 2", p_join_code: `L2${Date.now().toString().slice(-4)}`, p_round_id: round!.id });
        league2Id = l2 as string;

        // 4. Test de Aislamiento (Usuario 2 intenta ver ranking de Liga 1)
        console.log("Test 1: Aislamiento entre ligas");
        const { data: hackAttempt, error: hackErr } = await userClient.rpc("is_league_member", { target_league_id: league1Id });
        if (hackAttempt === true) throw new Error("Fallo de aislamiento: El usuario 2 puede ver la liga 1");
        console.log("  ✔ Bloqueado el acceso a ligas ajenas.\n");

        // 5. Test de Idempotencia (Ejecutar cálculo 2 veces)
        console.log("Test 2: Idempotencia (Ejecución repetida)");
        // Buscamos el equipo 1
        const { data: team1 } = await admin.from("fantasy_teams").select("id").eq("league_id", league1Id).single();

        // Forzamos una puntuación manual para probar el upsert
        await admin.from("fantasy_scores").upsert({
            fantasy_team_id: team1!.id, competition_id: comp!.id, season_id: season!.id, lineup_id: (await admin.from("lineups").select("id").eq("fantasy_team_id", team1!.id).single()).data!.id, round_id: round!.id, scoring_version: "v1", score: 10, breakdown: {}
        }, { onConflict: "fantasy_team_id,round_id,scoring_version" });

        // Ejecutamos "el script" 2 veces (simulado usando el admin directamente)
        const { persistScoresForSeason } = await import("@/lib/services/fantasy/scoring-persistence.service");
        await persistScoresForSeason(admin, comp!.id, season!.id);
        await persistScoresForSeason(admin, comp!.id, season!.id);

        const { count } = await admin.from("fantasy_scores").select("*", { count: "exact", head: true }).eq("fantasy_team_id", team1!.id).eq("round_id", round!.id);
        if (count !== 1) throw new Error(`Fallo de idempotencia: Se esperaban 1 fila de fantasy_scores, hay ${count}`);
        console.log("  ✔ Cálculo idempotente verificado (sin duplicados).\n");

        console.log("✅ TODOS LOS TESTS DE LA FASE 9 HAN PASADO.");

    } finally {
        if (league1Id) await admin.from("private_leagues").delete().eq("id", league1Id);
        if (league2Id) await admin.from("private_leagues").delete().eq("id", league2Id);
        if (user1Id) await admin.auth.admin.deleteUser(user1Id);
        if (user2Id) await admin.auth.admin.deleteUser(user2Id);
        console.log("🧹 Limpieza completada.");
    }
}

run().catch((err) => {
    console.error("❌ TEST FALLIDO:", err.message);
    process.exit(1);
});