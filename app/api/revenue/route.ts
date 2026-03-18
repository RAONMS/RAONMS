import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const customer = searchParams.get('customer') || '';
    const yearFrom = searchParams.get('year_from');
    const yearTo = searchParams.get('year_to');

    // Optimization: Select only necessary columns based on view
    let selectString = '*';
    if (view === 'summary') selectString = 'ship_amt,ship_qty,cust_name,generic';
    else if (view === 'yearly') selectString = 'shipdate,ship_amt,category_name';
    else if (view === 'monthly') selectString = 'shipdate,ship_amt';
    else if (view === 'by_customer') selectString = 'cust_name,ship_amt';
    else if (view === 'by_product') selectString = 'generic,ship_amt,category_name';
    else if (view === 'by_category') selectString = 'category_name,ship_amt,ship_qty';
    else if (view === 'yearly_by_customer') selectString = 'cust_name,shipdate,ship_amt';

    let query = supabase.from('revenue_data').select(selectString);
    
    if (customer) {
        query = query.ilike('cust_name', `%${customer}%`);
    }
    if (yearFrom) {
        query = query.gte('shipdate', `${yearFrom}-01-01`);
    }
    if (yearTo) {
        query = query.lte('shipdate', `${yearTo}-12-31`);
    }

    // Default limit for raw data
    if (!view || view === 'raw') {
        query = query.order('shipdate', { ascending: false }).limit(500);
    }

    const { data: rawRows, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rawRows) return NextResponse.json([]);

    const rows = rawRows as any[];

    if (view === 'summary') {
        const totalRevenue = rows.reduce((acc, r) => acc + (r.ship_amt || 0), 0);
        const totalQty = rows.reduce((acc, r) => acc + (r.ship_qty || 0), 0);
        const uniqueCustomers = new Set(rows.map(r => r.cust_name)).size;
        const uniqueProducts = new Set(rows.map(r => r.generic)).size;
        return NextResponse.json({ 
            totalRevenue, 
            totalQty, 
            uniqueCustomers, 
            uniqueProducts,
            items: rows.length 
        });
    }

    if (view === 'yearly') {
        const years: Record<string, any> = {};
        rows.forEach(r => {
            const y = r.shipdate ? r.shipdate.split('-')[0] : 'Unknown';
            if (!years[y]) years[y] = { year: y, total: 0 };
            const cat = r.category_name || 'Other';
            years[y][cat] = (years[y][cat] || 0) + (r.ship_amt || 0);
            years[y].total += (r.ship_amt || 0);
        });
        return NextResponse.json(Object.values(years).sort((a, b) => a.year.localeCompare(b.year)));
    }

    if (view === 'monthly') {
        const months: Record<string, any> = {};
        rows.forEach(r => {
            const m = r.shipdate ? r.shipdate.substring(0, 7) : 'Unknown';
            if (!months[m]) months[m] = { month: m, total: 0 };
            months[m].total += (r.ship_amt || 0);
        });
        return NextResponse.json(Object.values(months).sort((a, b) => a.month.localeCompare(b.month)));
    }

    if (view === 'by_customer') {
        const map: Record<string, number> = {};
        rows.forEach(r => {
            const c = r.cust_name || 'Unknown';
            map[c] = (map[c] || 0) + (r.ship_amt || 0);
        });
        return NextResponse.json(
            Object.entries(map).map(([customer, total]) => ({ customer, total })).sort((a, b) => b.total - a.total)
        );
    }

    if (view === 'by_product') {
        const map: Record<string, { total: number; category: string }> = {};
        rows.forEach(r => {
            const p = r.generic || 'Unknown';
            if (!map[p]) map[p] = { total: 0, category: r.category_name || 'Other' };
            map[p].total += (r.ship_amt || 0);
        });
        return NextResponse.json(
            Object.entries(map).map(([product, v]) => ({ product, ...v })).sort((a, b) => b.total - a.total)
        );
    }

    if (view === 'yearly_by_customer') {
        const yearsSet = new Set<string>();
        const map: Record<string, any> = {};
        rows.forEach(r => {
            const c = r.cust_name || 'Unknown';
            const y = r.shipdate ? r.shipdate.split('-')[0] : 'Unknown';
            yearsSet.add(y);
            if (!map[c]) map[c] = { customer: c, total: 0 };
            map[c][y] = (map[c][y] || 0) + (r.ship_amt || 0);
            map[c].total += (r.ship_amt || 0);
        });
        const years = Array.from(yearsSet).sort();
        return NextResponse.json({
            years,
            data: Object.values(map).sort((a, b) => b.total - a.total)
        });
    }

    if (view === 'by_category') {
        const map: Record<string, { total: number; qty: number; items: number }> = {};
        for (const r of rows) {
            const cat = r.category_name || 'Other';
            if (!map[cat]) map[cat] = { total: 0, qty: 0, items: 0 };
            map[cat].total += r.ship_amt || 0;
            map[cat].qty += r.ship_qty || 0;
            map[cat].items++;
        }
        return NextResponse.json(
            Object.entries(map).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total)
        );
    }

    return NextResponse.json(rows);
}
