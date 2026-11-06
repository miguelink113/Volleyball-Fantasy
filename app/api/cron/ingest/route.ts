import { NextRequest, NextResponse } from 'next/server';
import 'server-only';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // TODO: aquí irán las funciones fetch* de scraping
        return NextResponse.json({
            success: true,
            message: 'Endpoint de ingesta OK (placeholder)',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error en ingesta:', error);
        return NextResponse.json(
            { success: false, error: 'Fallo en la ingesta' },
            { status: 500 }
        );
    }
}