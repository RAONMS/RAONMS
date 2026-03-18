import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
    const { id } = await params;
    const { data, error } = await supabase
        .from('interactions')
        .select('*, customers (company_name, region)')
        .eq('id', id)
        .single();
    
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const flattened = {
        ...data,
        company_name: data.customers?.company_name,
        region: data.customers?.region
    };
    
    return NextResponse.json(flattened);
}

export async function PUT(request: Request, { params }: RouteParams) {
    const { id } = await params;
    const body = await request.json();
    const { date, attendee, sales_topic, fae_topic, notes } = body;

    const { data, error } = await supabase
        .from('interactions')
        .update({
            date,
            attendee,
            sales_topic,
            fae_topic,
            notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, customers (company_name)')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const flattened = {
        ...data,
        company_name: data.customers?.company_name
    };
    
    return NextResponse.json(flattened);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    const { id } = await params;
    const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
