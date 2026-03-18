import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('client_id');

    let query = supabase
        .from('meeting_notes')
        .select('*, customers (company_name, region)');

    if (customerId) { 
        query = query.eq('customer_id', customerId); 
    }
    
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const flattened = data.map((m: any) => ({
        ...m,
        company_name: m.customers?.company_name,
        region: m.customers?.region
    }));

    return NextResponse.json(flattened);
}

export async function POST(request: Request) {
    const body = await request.json();
    const { client_id, date, attendees, agenda, notes, follow_up } = body;

    if (!client_id || !date) {
        return NextResponse.json({ error: 'client_id and date are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('meeting_notes')
        .insert({
            customer_id: client_id,
            date,
            attendees: attendees || null,
            agenda: agenda || null,
            notes: notes || null,
            follow_up: follow_up || null
        })
        .select('*, customers (company_name)')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const flattened = {
        ...data,
        company_name: data.customers?.company_name
    };

    return NextResponse.json(flattened, { status: 201 });
}
