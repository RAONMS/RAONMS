import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('client_id'); // Keep client_id as query param for frontend compatibility
    const limit = searchParams.get('limit');

    let query = supabase
        .from('interactions')
        .select('id, date, attendee, sales_topic, fae_topic, notes, customer_id, customers (company_name, region)');

    if (customerId) { 
        query = query.eq('customer_id', customerId); 
    }
    
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
    
    if (limit) { 
        query = query.limit(Number(limit)); 
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the result to match existing frontend expectations
    const flattened = data.map((ix: any) => ({
        ...ix,
        company_name: ix.customers?.company_name,
        region: ix.customers?.region
    }));

    return NextResponse.json(flattened);
}

export async function POST(request: Request) {
    const body = await request.json();
    const { client_id, date, attendee, sales_topic, fae_topic, notes } = body;

    if (!client_id || !date) {
        return NextResponse.json({ error: 'client_id and date are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('interactions')
        .insert({
            customer_id: client_id,
            date,
            attendee: attendee || null,
            sales_topic: sales_topic || null,
            fae_topic: fae_topic || null,
            notes: notes || null
        })
        .select('*, customers (company_name, region)')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const flattened = {
        ...data,
        company_name: data.customers?.company_name,
        region: data.customers?.region
    };

    return NextResponse.json(flattened, { status: 201 });
}
