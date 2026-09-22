import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProfileById(
    supabase: SupabaseClient,
    userId: string
) {
    return supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
}

export async function updateProfileById(
    supabase: SupabaseClient,
    userId: string,
    updates: {
        full_name?: string;
        email?: string;
    }
) {
    return supabase
        .from("profiles")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();
}