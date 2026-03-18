import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const { company_name, website, region, contact_name, email, phone, status, notes, is_key_customer } = body;

  const { data, error } = await supabase
    .from('customers')
    .update({
      company_name,
      website,
      region,
      contact_name,
      email,
      phone,
      status,
      notes,
      is_key_customer,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
