import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 12) + '...' : 'NONE',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 0,
        nodeVersion: process.version,
        envKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC') || k.startsWith('APP_AWS')),
    });
}
