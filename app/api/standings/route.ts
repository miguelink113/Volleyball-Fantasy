import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from "@/lib/supabase/admin.server";
import {getStandings} from "@/lib/repositories/standings.repository";

export async function GET(req: NextRequest) {
    const seasonId = req.nextUrl.searchParams.get('seasonId');
    if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 });

    const supabase = createAdminClient();
    try {
        const data = await getStandings(supabase, seasonId);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}