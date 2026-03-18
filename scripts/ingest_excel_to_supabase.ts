
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function ingest() {
    console.log('Ingesting Excel data to Supabase...');

    // 1. Ingest Revenue.XLSX
    const revPath = path.join(process.cwd(), 'data', 'Revenue.XLSX');
    if (fs.existsSync(revPath)) {
        console.log('Ingesting Revenue.XLSX...');
        const buf = fs.readFileSync(revPath);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        
        // Clear existing revenue data
        await supabase.from('revenue_data').delete().neq('id', 0);
        
        // Batch insert
        const { error } = await supabase.from('revenue_data').insert(rows.map((r: any) => ({
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
        })));
        if (error) console.error('Error ingesting revenue:', error);
        else console.log(`Ingested ${rows.length} revenue rows.`);
    }

    // 2. Ingest Backlog.XLSX
    const bklgPath = path.join(process.cwd(), 'data', 'Backlog.XLSX');
    if (fs.existsSync(bklgPath)) {
        console.log('Ingesting Backlog.XLSX...');
        const buf = fs.readFileSync(bklgPath);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        
        // Clear existing backlog data
        await supabase.from('backlog_excel_data').delete().neq('id', 0);
        
        const { error } = await supabase.from('backlog_excel_data').insert(rows.map((r: any) => ({
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
        })));
        if (error) console.error('Error ingesting backlog:', error);
        else console.log(`Ingested ${rows.length} backlog rows.`);
    }

    console.log('Ingestion complete!');
}

ingest();
