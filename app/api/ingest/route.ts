import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'revenue' or 'backlog'

        if (!file || !type) {
            return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (type === 'revenue') {
            // Mapping for revenue
            const mappedRows = rows.map((r: any) => ({
                generic: r.generic,
                fg_code: r.fg_code,
                cust_name: r.cust_name,
                ship_amt: r.ship_amt,
                ship_qty: r.ship_qty,
                shipdate: r.shipdate,
                shipdate2: r.shipdate2,
                invoice_no: r.invoice_no,
                order_no: r.order_no,
                category_name: r.category_name
            }));

            // Replace data: Delete all and Insert new
            await supabase.from('revenue_data').delete().neq('id', 0);
            const { error } = await supabase.from('revenue_data').insert(mappedRows);
            if (error) throw error;

            return NextResponse.json({ success: true, count: mappedRows.length });
        } else if (type === 'backlog') {
            // Mapping for backlog
            const mappedRows = rows.map((r: any) => ({
                cust_name: r.cust_name,
                fg_code: r.fg_code,
                generic: r.generic,
                order_no: r.order_no,
                price: r.price,
                qty: r.qty,
                req_date: r.req_date,
                category_name: r.category_name,
                remark: r.remark,
                amt: r.amt
            }));

            await supabase.from('backlog_excel_data').delete().neq('id', 0);
            const { error } = await supabase.from('backlog_excel_data').insert(mappedRows);
            if (error) throw error;

            return NextResponse.json({ success: true, count: mappedRows.length });
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Ingestion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
