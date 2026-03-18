import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';
    const status = searchParams.get('status') || '';
    const keyOnly = searchParams.get('key_only') === '1';

    let query = supabase
        .from('customers')
        .select('id, company_name, region, status, contact_name, email, is_key_customer, website');

    if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (region) {
        query = query.eq('region', region);
    }
    if (status) {
        query = query.eq('status', status);
    }
    if (keyOnly) {
        query = query.eq('is_key_customer', true);
    }

    const { data, error } = await query
        .order('is_key_customer', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const body = await request.json();
    const { company_name, website, region, contact_name, email, phone, status, notes } = body;

    if (!company_name) {
        return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('customers')
        .insert({
            company_name,
            website: website || null,
            region: region || null,
            contact_name: contact_name || null,
            email: email || null,
            phone: phone || null,
            status: status || 'Prospect',
            notes: notes || null,
            is_key_customer: false
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
