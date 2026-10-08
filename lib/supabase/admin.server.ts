// lib/supabase/admin.server.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service role key.
 *
 * PROTECCIÓN:
 * - Esta función solo debe ejecutarse desde código de servidor: scripts
 *   administrativos, rutas API o servicios de ingesta.
 * - Nunca debe importarse desde `components/` ni `hooks/`.
 * - Nunca debe exponerse al navegador.
 *
 * La comprobación de `typeof window` actúa como red de seguridad: si por
 * accidente este módulo se carga en el navegador, lanzará de inmediato en
 * lugar de filtrar la secret key.
 */
export function createAdminClient() {
    if (typeof window !== "undefined") {
        throw new Error(
            "createAdminClient must never run in the browser. " +
            "Check that lib/supabase/admin.server.ts is not imported from client code."
        );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!key) throw new Error("Missing SUPABASE_SECRET_KEY");

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}