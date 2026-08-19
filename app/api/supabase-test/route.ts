import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Ruta de prueba para verificar que la conexión a Supabase funciona correctamente
 * GET /api/supabase-test
 *
 * Respuestas:
 * - 200: Conexión exitosa
 * - 401: No autenticado
 * - 500: Error en la conexión
 */
export async function GET() {
  try {
    // Paso 1: Crear cliente
    const supabase = await createClient();
    console.log("✓ Cliente Supabase creado exitosamente");

    // Paso 2: Intentar obtener el usuario actual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("✗ Error al obtener usuario:", userError);
      return NextResponse.json(
        {
          status: "error",
          message: "Error al conectar con Supabase",
          details: userError.message,
        },
        { status: 401 }
      );
    }

    // Paso 3: Retornar información de éxito
    const response = {
      status: "success",
      message: "✓ Conexión a Supabase configurada correctamente",
      authenticated: !!user,
      user: user
        ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
          }
        : null,
      config: {
        supabaseUrl:
          process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
        hasPublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
    };

    console.log("✓ Prueba exitosa:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("✗ Error en la prueba de Supabase:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
