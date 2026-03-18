import { NextResponse } from 'next/server';
import { getSupabasePublicConfig, getSupabasePublicConfigStatus } from '@/lib/supabasePublicConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { url, anonKey } = getSupabasePublicConfig();
    const status = getSupabasePublicConfigStatus();

    return NextResponse.json({
        hasUrl: !!url,
        urlPrefix: url ? url.substring(0, 12) + '...' : 'NONE',
        hasKey: !!anonKey,
        keyLength: anonKey ? anonKey.length : 0,
        hasEnvUrl: status.hasEnvUrl,
        hasEnvAnonKey: status.hasEnvAnonKey,
        usingFallbackUrl: status.usingFallbackUrl,
        usingFallbackAnonKey: status.usingFallbackAnonKey,
        nodeVersion: process.version,
        envKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC') || k.startsWith('APP_AWS')),
    });
}
