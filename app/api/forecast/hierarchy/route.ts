import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forecastId = searchParams.get('forecastId') || 'default';

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', `forecast_hierarchy:${forecastId}`)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ hierarchy: data?.value ? JSON.parse(data.value) : null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { forecastId = 'default', hierarchy } = await req.json();

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: `forecast_hierarchy:${forecastId}`,
        value: JSON.stringify(hierarchy || []),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
