import { config } from "dotenv";
import {createAdminClient} from "@/lib/supabase/admin.server";
config({ path: ".env.local" });
const PROBE_RFEVB_ID = "__admin_probe__";

async function main() {
    console.log("→ Creando cliente admin…");
    const supabase = createAdminClient();
    console.log("  OK");

    // 1. Lectura. Las tablas deportivas están protegidas por RLS y son
    //    legibles por authenticated, pero el service role las ve todas.
    //    Al principio están vacías, así que esperamos 0 filas sin error.
    console.log("→ Leyendo competitions…");
    const { data: competitions, error: readError } = await supabase
        .from("competitions")
        .select("id, rfevb_id, name, category, active")
        .limit(5);

    if (readError) {
        console.error("  FALLO lectura:", readError);
        process.exit(1);
    }
    console.log(`  OK (${competitions?.length ?? 0} filas)`);

    // 2. Limpieza defensiva por si una ejecución previa dejó la fila.
    console.log("→ Limpieza previa de la fila de prueba…");
    const { error: preCleanError } = await supabase
        .from("competitions")
        .delete()
        .eq("rfevb_id", PROBE_RFEVB_ID);
    if (preCleanError) {
        console.error("  FALLO limpieza previa:", preCleanError);
        process.exit(1);
    }

    // 3. Escritura: si RLS bloqueara al cliente, esto fallaría con 42501.
    console.log("→ Insertando competition de prueba…");
    const { data: inserted, error: insertError } = await supabase
        .from("competitions")
        .insert({
            rfevb_id: PROBE_RFEVB_ID,
            name: "Admin probe",
            active: false,
        })
        .select("id, rfevb_id, name, active")
        .single();

    if (insertError) {
        console.error("  FALLO inserción:", insertError);
        if (insertError.code === "42501") {
            console.error(
                "  RLS bloqueó la operación. Estás usando la anon key, no la secret key."
            );
        }
        process.exit(1);
    }
    console.log("  OK inserción:", inserted.id);

    // 4. Update: confirma permiso de modificación.
    console.log("→ Actualizando la fila…");
    const { error: updateError } = await supabase
        .from("competitions")
        .update({ name: "Admin probe updated" })
        .eq("id", inserted.id);

    if (updateError) {
        console.error("  FALLO update:", updateError);
        process.exit(1);
    }
    console.log("  OK update");

    // 5. Limpieza: deja la tabla como estaba.
    console.log("→ Limpieza final…");
    const { error: deleteError } = await supabase
        .from("competitions")
        .delete()
        .eq("id", inserted.id);

    if (deleteError) {
        console.error("  FALLO limpieza final:", deleteError);
        process.exit(1);
    }
    console.log("  OK limpieza");

    console.log("\n✅ admin.server.ts funciona: lee, inserta, actualiza y borra saltándose RLS.");
}

main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
});