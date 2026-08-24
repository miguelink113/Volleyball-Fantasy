import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
    path: ".env.local",
});

function getEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Falta la variable de entorno: ${name}`
        );
    }

    return value;
}

const supabaseUrl = getEnv(
    "NEXT_PUBLIC_SUPABASE_URL"
);

const supabasePublishableKey = getEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
);

const secretKey = getEnv(
    "SUPABASE_SECRET_KEY"
);

/**
 * Cliente con permisos de administrador.
 *
 * SOLO para preparar y limpiar el entorno de pruebas.
 */
const admin = createClient(
    supabaseUrl,
    secretKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

/**
 * Cliente público.
 *
 * Es el que representa a un usuario normal
 * utilizando la aplicación.
 */
function createUserClient() {
    return createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

function assert(
    condition: boolean,
    message: string
) {
    if (!condition) {
        throw new Error(`❌ ${message}`);
    }

    console.log(`✅ ${message}`);
}

function uniqueEmail(prefix: string) {
    return `${prefix}-${Date.now()}@example.com`;
}

/**
 * Ejecuta todos los tests.
 */
async function run() {
    console.log("");
    console.log("==========================================");
    console.log(" TEST DE SUPABASE AUTH + RLS");
    console.log("==========================================");
    console.log("");

    let user1Id: string | null = null;
    let user2Id: string | null = null;

    const user1Email = uniqueEmail("test-user-1");
    const user2Email = uniqueEmail("test-user-2");

    const password = "TestPassword123!";

    try {
        // =========================================================
        // 1. REGISTRO / CREACIÓN DE USUARIO
        // =========================================================

        console.log("1. REGISTRO DE USUARIO");
        console.log("----------------------");

        const { data: createdUser1, error: createError1 } =
            await admin.auth.admin.createUser({
                email: user1Email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: "Usuario Test 1",
                },
            });

        if (createError1) {
            throw createError1;
        }

        assert(
            !!createdUser1.user,
            "El usuario 1 se ha creado en auth.users."
        );

        user1Id = createdUser1.user.id;

        // =========================================================
        // 2. COMPROBAR TRIGGER / PROFILE
        // =========================================================

        console.log("");
        console.log("2. CREACIÓN AUTOMÁTICA DEL PROFILE");
        console.log("----------------------------------");

        const {
            data: profile1,
            error: profile1Error,
        } = await admin
            .from("profiles")
            .select("*")
            .eq("id", user1Id)
            .maybeSingle();

        if (profile1Error) {
            throw profile1Error;
        }

        assert(
            !!profile1,
            "Se ha creado automáticamente el perfil."
        );

        assert(
            profile1?.email === user1Email,
            "El email del perfil coincide con el usuario."
        );

        assert(
            profile1?.full_name === "Usuario Test 1",
            "El full_name del perfil coincide con los metadatos."
        );

        assert(
            profile1?.id === user1Id,
            "El ID del perfil coincide con el usuario."
        );

        assert(
            !!profile1?.created_at,
            "El perfil tiene fecha de creación."
        );

        assert(
            !!profile1?.updated_at,
            "El perfil tiene fecha de actualización."
        );
        // =========================================================
        // 3. CREAR SEGUNDO USUARIO
        // =========================================================

        console.log("");
        console.log("3. CREAR SEGUNDO USUARIO");
        console.log("------------------------");

        const { data: createdUser2, error: createError2 } =
            await admin.auth.admin.createUser({
                email: user2Email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: "Usuario Test 2",
                },
            });

        if (createError2) {
            throw createError2;
        }

        assert(
            !!createdUser2.user,
            "El usuario 2 se ha creado."
        );

        user2Id = createdUser2.user.id;

        const {
            data: profile2,
            error: profile2Error,
        } = await admin
            .from("profiles")
            .select("*")
            .eq("id", user2Id)
            .maybeSingle();

        if (profile2Error) {
            throw profile2Error;
        }

        assert(
            !!profile2,
            "El perfil del usuario 2 se ha creado automáticamente."
        );

        // =========================================================
        // 4. LOGIN USUARIO 1
        // =========================================================

        console.log("");
        console.log("4. INICIO DE SESIÓN");
        console.log("-------------------");

        const client1 = createUserClient();

        const {
            data: session1,
            error: loginError1,
        } = await client1.auth.signInWithPassword({
            email: user1Email,
            password,
        });

        if (loginError1) {
            throw loginError1;
        }

        assert(
            !!session1.session,
            "El usuario 1 ha iniciado sesión."
        );

        assert(
            session1.user.id === user1Id,
            "La sesión corresponde al usuario 1."
        );

        const {
            data: {
                session: persistedSession,
            },
        } = await client1.auth.getSession();

        assert(
            persistedSession?.user.id === user1Id,
            "La sesión persistida pertenece al usuario correcto."
        );

        // =========================================================
        // 5. SELECT DE SU PROPIO PROFILE
        // =========================================================

        console.log("");
        console.log("5. RLS - LEER SU PROPIO PROFILE");
        console.log("-------------------------------");

        const {
            data: ownProfile,
            error: ownProfileError,
        } = await client1
            .from("profiles")
            .select("*")
            .eq("id", user1Id)
            .maybeSingle();

        if (ownProfileError) {
            throw ownProfileError;
        }

        assert(
            !!ownProfile,
            "El usuario puede leer su propio perfil."
        );

        // =========================================================
        // 6. INTENTAR LEER PROFILE DEL USUARIO 2
        // =========================================================

        console.log("");
        console.log("6. RLS - LEER PROFILE DE OTRO USUARIO");
        console.log("-------------------------------------");

        const {
            data: otherProfile,
            error: otherProfileError,
        } = await client1
            .from("profiles")
            .select("*")
            .eq("id", user2Id)
            .maybeSingle();

        assert(
            !otherProfile,
            "El usuario NO puede leer el perfil de otro usuario."
        );

        assert(
            !otherProfileError,
            "La política bloquea correctamente la lectura."
        );

        // =========================================================
        // 7. ACTUALIZAR SU PROPIO PROFILE
        // =========================================================

        console.log("");
        console.log("7. RLS - ACTUALIZAR SU PROPIO PROFILE");
        console.log("-------------------------------------");

        const previousUpdatedAt = ownProfile.updated_at;

        const {
            data: updatedProfile,
            error: updateOwnError,
        } = await client1
            .from("profiles")
            .update({
                full_name: "Usuario Test 1 Actualizado",
            })
            .eq("id", user1Id)
            .select()
            .single();

        if (updateOwnError) {
            throw updateOwnError;
        }

        assert(
            updatedProfile.full_name ===
            "Usuario Test 1 Actualizado",
            "El usuario puede actualizar su propio perfil."
        );

//        assert(
//          updatedProfile.updated_at !== previousUpdatedAt,
//        "updated_at cambia al modificar el perfil."
//  );

        // =========================================================
        // 8. INTENTAR ACTUALIZAR PROFILE DE OTRO
        // =========================================================

        console.log("");
        console.log("8. RLS - ACTUALIZAR PROFILE DE OTRO");
        console.log("-----------------------------------");

        const {
            data: updatedOtherProfile,
            error: updateOtherError,
        } = await client1
            .from("profiles")
            .update({
                full_name: "ATAQUE",
            })
            .eq("id", user2Id)
            .select();

        assert(
            !updateOtherError,
            "No se produce un error inesperado al intentar modificar otro perfil."
        );

        assert(
            !updatedOtherProfile ||
            updatedOtherProfile.length === 0,
            "El usuario NO puede actualizar el perfil de otro usuario."
        );

        // =========================================================
        // 9. INTENTAR CAMBIAR EL ID DEL PROPIO PROFILE
        // =========================================================

        console.log("");
        console.log("9. RLS - INTENTAR CAMBIAR EL ID");
        console.log("-------------------------------");

        const {
            data: changedIdProfile,
            error: changedIdError,
        } = await client1
            .from("profiles")
            .update({
                id: user2Id,
            })
            .eq("id", user1Id)
            .select();

        assert(
            !!changedIdError,
            "No se permite cambiar el ID del perfil a otro usuario."
        );

        assert(
            !changedIdProfile ||
            changedIdProfile.length === 0,
            "El perfil no ha cambiado de propietario."
        );

        // =========================================================
        // 10. LOGOUT
        // =========================================================

        console.log("");
        console.log("10. CIERRE DE SESIÓN");
        console.log("--------------------");

        const { error: logoutError } =
            await client1.auth.signOut();

        if (logoutError) {
            throw logoutError;
        }

        const {
            data: {
                session: sessionAfterLogout,
            },
        } = await client1.auth.getSession();

        assert(
            sessionAfterLogout === null,
            "La sesión se ha cerrado correctamente."
        );

        const {
            data: profileAfterLogout,
        } = await admin
            .from("profiles")
            .select("*")
            .eq("id", user1Id)
            .single();

        assert(
            !!profileAfterLogout,
            "El logout no elimina el perfil."
        );

        // =========================================================
        // 11. INTENTAR LEER PROFILE SIN AUTENTICAR
        // =========================================================

        console.log("");
        console.log("11. RLS - SIN AUTENTICACIÓN");
        console.log("---------------------------");

        const {
            data: unauthenticatedProfile,
            error: unauthenticatedError,
        } = await client1
            .from("profiles")
            .select("*")
            .eq("id", user1Id)
            .maybeSingle();

        assert(
            !unauthenticatedProfile,
            "Un usuario no autenticado NO puede leer profiles."
        );

        assert(
            !unauthenticatedError,
            "RLS bloquea correctamente el acceso sin sesión."
        );

        // =========================================================
        // RESULTADO
        // =========================================================

        console.log("");
        console.log("==========================================");
        console.log(" ✅ TODOS LOS TESTS HAN PASADO");
        console.log("==========================================");
        console.log("");

    } finally {
        // =========================================================
        // LIMPIEZA
        // =========================================================

        console.log("");
        console.log("Limpiando usuarios de prueba...");

        if (user1Id) {
            const { error } =
                await admin.auth.admin.deleteUser(
                    user1Id
                );

            if (error) {
                console.error(
                    "No se pudo eliminar el usuario 1:",
                    error
                );
            }
        }

        if (user2Id) {
            const { error } =
                await admin.auth.admin.deleteUser(
                    user2Id
                );

            if (error) {
                console.error(
                    "No se pudo eliminar el usuario 2:",
                    error
                );
            }
        }

        console.log("Limpieza terminada.");
    }
}

run().catch((error) => {
    console.error("");
    console.error("==========================================");
    console.error(" ❌ TEST FALLIDO");
    console.error("==========================================");
    console.error("");
    console.error(error);
    process.exit(1);
});