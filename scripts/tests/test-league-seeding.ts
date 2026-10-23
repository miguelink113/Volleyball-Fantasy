import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
config({ path: resolve(process.cwd(), ".env.local") });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

function createUserClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function run() {
    console.log("== TEST: CREACIÓN DE LIGAS Y ASIGNACIÓN ALEATORIA ==");
    const email1 = `test-l1-${Date.now()}@test.com`;
    const email2 = `test-l2-${Date.now()}@test.com`;
    const password = "TestPassword123!";
    let user1Id = "", user2Id = "";
    let leagueId = "";

    const c1 = createUserClient();
    const c2 = createUserClient();

    try {
        // Setup usuarios
        const { data: u1 } = await admin.auth.admin.createUser({ email: email1, password, email_confirm: true, user_metadata: { username: `u1_${Date.now().toString().slice(-6)}` } });
        const { data: u2 } = await admin.auth.admin.createUser({ email: email2, password, email_confirm: true, user_metadata: { username: `u2_${Date.now().toString().slice(-6)}` } });
        user1Id = u1.user!.id;
        user2Id = u2.user!.id;

        await c1.auth.signInWithPassword({ email: email1, password });
        await c2.auth.signInWithPassword({ email: email2, password });

        // Setup IDs necesarios
        const { data: comp } = await admin.from("competitions").select("id").eq("rfevb_id", "152").single();
        const { data: season } = await admin.from("seasons").select("id").eq("competition_id", comp!.id).eq("rfevb_id", "186").single();
        const { data: round } = await admin.from("rounds").select("id").eq("season_id", season!.id).eq("round_number", 1).single();

        console.log("→ Usuario 1 crea la liga...");
        const { data: newLeague } = await c1.rpc("create_private_league", { p_competition_id: comp!.id, p_season_id: season!.id, p_name: "Test Multiusuario", p_join_code: "MULTI1", p_round_id: round!.id });
        leagueId = newLeague as string;

        console.log("→ Usuario 2 se une a la liga...");
        await c2.rpc("join_private_league", { p_join_code: "MULTI1", p_round_id: round!.id });

        // Verificar Equipos
        const { data: teams } = await admin.from("fantasy_teams").select("id, budget, user_id").eq("league_id", leagueId);
        const team1 = teams!.find(t => t.user_id === user1Id)!;
        const team2 = teams!.find(t => t.user_id === user2Id)!;

        if (!team1 || !team2) throw new Error("No se crearon los dos equipos en la liga");

        const { data: p1 } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", team1.id).eq("is_active", true);
        const { data: p2 } = await admin.from("fantasy_team_players").select("player_id").eq("fantasy_team_id", team2.id).eq("is_active", true);

        console.log("\nTest 1: No colisión intra-liga");
        const set1 = new Set(p1!.map(p => p.player_id));
        const colisiones = p2!.filter(p => set1.has(p.player_id));
        if (colisiones.length > 0) throw new Error(`¡Colisión! ${colisiones.length} jugadores están en ambos equipos.`);
        console.log("  ✔ Los 14 jugadores son totalmente distintos.");

        console.log("\nTest 2: Aleatoriedad y Presupuesto");
        if (JSON.stringify(p1!.map(x=>x.player_id).sort()) === JSON.stringify(p2!.map(x=>x.player_id).sort())) {
            throw new Error("Los equipos son idénticos. La aleatoriedad falló.");
        }
        if (team1.budget !== 37 || team2.budget !== 37) {
            throw new Error(`Presupuesto incorrecto: ${team1.budget} y ${team2.budget}. Deberían ser 37.`);
        }
        console.log("  ✔ Equipos distintos y ambos con 37M de presupuesto inicial.");

        console.log("\nTest 3: Mercado intra-liga");
        // El usuario 1 intenta comprar un jugador del equipo 2
        const targetPlayer = p2![0].player_id;
        const { error: buyErr } = await c1.rpc("transfer_player", { p_fantasy_team_id: team1.id, p_player_id: targetPlayer, p_round_id: round!.id, p_type: "BUY" });
        if (!buyErr || !buyErr.message.includes("already owned")) throw new Error("Fallo de aislamiento: se pudo comprar un jugador de otro equipo.");
        console.log("  ✔ Bloqueada la compra de un jugador que pertenece a otro entrenador.");

        console.log("\nTest 4: Sucesión de propietario");
        const { data: lBefore } = await admin.from("private_leagues").select("owner_user_id").eq("id", leagueId).single();
        if (lBefore!.owner_user_id !== user1Id) throw new Error("El dueño inicial no es el usuario 1");

        await c1.rpc("leave_private_league", { p_league_id: leagueId }); // Sale el dueño

        const { data: lAfter } = await admin.from("private_leagues").select("owner_user_id").eq("id", leagueId).single();
        if (lAfter!.owner_user_id !== user2Id) throw new Error("La propiedad no pasó al usuario 2.");
        console.log("  ✔ Al salir el dueño, la propiedad pasa al siguiente miembro.");

        console.log("\nTest 5: Eliminación de liga vacía");
        await c2.rpc("leave_private_league", { p_league_id: leagueId }); // Sale el último miembro

        const { data: lGone } = await admin.from("private_leagues").select("id").eq("id", leagueId).maybeSingle();
        if (lGone) throw new Error("La liga no se borró al salir el último miembro.");
        console.log("  ✔ La liga se ha eliminado correctamente.");

        console.log("\n✅ TODOS LOS TESTS DE LIGAS HAN PASADO.");

    } finally {
        if (leagueId) await admin.from("private_leagues").delete().eq("id", leagueId);
        if (user1Id) await admin.auth.admin.deleteUser(user1Id);
        if (user2Id) await admin.auth.admin.deleteUser(user2Id);
        console.log("🧹 Limpieza completada.");
    }
}

run().catch((err) => {
    console.error("❌ TEST FALLIDO:", err.message);
    process.exit(1);
});