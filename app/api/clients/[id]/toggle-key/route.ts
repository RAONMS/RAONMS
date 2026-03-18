import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: RouteParams) {
    const { id } = await params;

    // Get current state
    const { data: client, error: fetchError } = await supabase
        .from('customers')
        .select('is_key_customer')
        .eq('id', id)
        .single();
    
    if (fetchError || !client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newState = !client.is_key_customer;

    const { error: updateError } = await supabase
        .from('customers')
        .update({ is_key_customer: newState })
        .eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true, is_key_customer: newState });
}
