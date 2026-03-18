import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface BacklogRow {
    id: string;
    cust_name: string;
    fg_code: string;
    generic: string;
    order_no: string;
    price: number;
    qty: number;
    amt: number;
    req_date: string;
    category_name: string;
    remark: string;
    is_custom?: boolean;
}

async function getMergedBacklog(view?: string): Promise<BacklogRow[]> {
    // Optimization: Select only necessary columns based on view
    let selectExcel = '*';
    let selectOrders = '*';
    
    if (view === 'summary' || view === 'by_category') {
        selectExcel = 'id, cust_name, qty, amt, category_name, generic';
        selectOrders = 'id, customer, qty, amount, category, product';
    }

    const { data: excelData, error: excelError } = await supabase
        .from('backlog_excel_data')
        .select(selectExcel);
    
    if (excelError) console.error('Error fetching backlog excel data:', excelError);

    const { data: customData, error: customError } = await supabase
        .from('backlog_orders')
        .select(selectOrders);

    if (customError) console.error('Error fetching custom backlog orders:', customError);

    const rows: BacklogRow[] = (excelData || []).map((r: any) => ({
        id: `excel_${r.id}`,
        cust_name: r.cust_name,
        fg_code: r.fg_code || '',
        generic: r.generic || '',
        order_no: r.order_no || '',
        price: r.price || 0,
        qty: r.qty || 0,
        amt: r.amt || 0,
        req_date: String(r.req_date || ''),
        category_name: r.category_name || 'Other',
        remark: r.remark || '',
        is_custom: false
    }));

    const mappedCustom = (customData || []).map((r: any) => ({
        id: r.id,
        cust_name: r.customer,
        generic: r.product || '',
        fg_code: r.fg_code || '',
        order_no: r.order_no || '',
        price: r.price || 0,
        qty: r.qty || 0,
        amt: r.amount || 0,
        req_date: String(r.req_date || ''),
        category_name: r.category || 'Other',
        remark: r.remark || '',
        is_custom: true
    }));

    const finalMap = new Map<string, BacklogRow>();
    rows.forEach(r => finalMap.set(r.id, r));
    mappedCustom.forEach(r => finalMap.set(r.id, r));

    return Array.from(finalMap.values());
}

function getYM(dateStr: string): string {
    if (!dateStr) return 'Unknown';
    if (dateStr.length >= 6) {
        return dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6);
    }
    return dateStr;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary';

    const rows = await getMergedBacklog(view);

    if (view === 'by_category') {
        const map: Record<string, { total: number; qty: number; items: number }> = {};
        for (const r of rows) {
            const cat = r.category_name || 'Other';
            if (!map[cat]) map[cat] = { total: 0, qty: 0, items: 0 };
            map[cat].total += r.amt || 0;
            map[cat].qty += r.qty || 0;
            map[cat].items++;
        }
        return NextResponse.json(
            Object.entries(map).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total)
        );
    }

    if (view === 'by_customer') {
        const map: Record<string, { total: number; qty: number; items: number }> = {};
        for (const r of rows) {
            const c = r.cust_name || 'Unknown';
            if (!map[c]) map[c] = { total: 0, qty: 0, items: 0 };
            map[c].total += r.amt || 0;
            map[c].qty += r.qty || 0;
            map[c].items++;
        }
        return NextResponse.json(
            Object.entries(map).map(([customer, v]) => ({ customer, ...v })).sort((a, b) => b.total - a.total)
        );
    }

    if (view === 'by_product') {
        const map: Record<string, { total: number; qty: number; category: string }> = {};
        for (const r of rows) {
            const p = r.generic || 'Unknown';
            if (!map[p]) map[p] = { total: 0, qty: 0, category: r.category_name || 'Other' };
            map[p].total += r.amt || 0;
            map[p].qty += r.qty || 0;
        }
        return NextResponse.json(
            Object.entries(map).map(([product, v]) => ({ product, ...v })).sort((a, b) => b.total - a.total)
        );
    }

    if (view === 'by_month') {
        const map: Record<string, { total: number; items: number }> = {};
        for (const r of rows) {
            const ym = getYM(r.req_date);
            if (!map[ym]) map[ym] = { total: 0, items: 0 };
            map[ym].total += r.amt || 0;
            map[ym].items++;
        }
        return NextResponse.json(
            Object.entries(map).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month))
        );
    }

    if (view === 'orders') {
        const orders = rows.map(r => ({
            id: r.id,
            customer: r.cust_name,
            product: r.generic,
            fg_code: r.fg_code,
            order_no: r.order_no,
            price: r.price,
            qty: r.qty,
            amount: r.amt,
            req_date: getYM(r.req_date),
            category: r.category_name,
            remark: r.remark,
            is_custom: r.is_custom,
        })).sort((a, b) => a.req_date.localeCompare(b.req_date));
        return NextResponse.json(orders);
    }

    if (view === 'single') {
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const r = rows.find(x => x.id === id);
        if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({
            id: r.id,
            customer: r.cust_name,
            product: r.generic,
            fg_code: r.fg_code,
            order_no: r.order_no,
            price: r.price,
            qty: r.qty,
            amount: r.amt,
            req_date: r.req_date, // Keep original for editing
            category: r.category_name,
            remark: r.remark,
        });
    }

    // Summary
    const total = rows.reduce((s, r) => s + (r.amt || 0), 0);
    const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);
    const uniqueCustomers = new Set(rows.map(r => r.cust_name)).size;
    const uniqueProducts = new Set(rows.map(r => r.generic)).size;
    return NextResponse.json({ total, totalQty, uniqueCustomers, uniqueProducts, orderCount: rows.length });
}

export async function POST(request: Request) {
    const body = await request.json();
    const id = crypto.randomUUID();
    const amt = body.amount ?? ((body.price || 0) * (body.qty || 0));

    const { error } = await supabase
        .from('backlog_orders')
        .insert({
            id,
            customer: body.customer,
            product: body.product,
            fg_code: body.fg_code,
            order_no: body.order_no,
            price: body.price,
            qty: body.qty,
            amount: amt,
            req_date: body.req_date,
            category: body.category,
            remark: body.remark
        });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id });
}

export async function PUT(request: Request) {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const amt = body.amount ?? ((body.price || 0) * (body.qty || 0));

    // For simplicity, we use upsert logic or update if exists in backlog_orders
    const { data: existing } = await supabase.from('backlog_orders').select('id').eq('id', body.id).single();

    const payload = {
        customer: body.customer,
        product: body.product,
        fg_code: body.fg_code,
        order_no: body.order_no,
        price: body.price,
        qty: body.qty,
        amount: amt,
        req_date: body.req_date,
        category: body.category,
        remark: body.remark,
        updated_at: new Date().toISOString()
    };

    if (existing) {
        const { error } = await supabase.from('backlog_orders').update(payload).eq('id', body.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
        const { error } = await supabase.from('backlog_orders').insert({ id: body.id, ...payload });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: body.id });
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await supabase.from('backlog_orders').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
