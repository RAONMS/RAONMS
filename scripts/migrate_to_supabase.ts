
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new Database(path.join(process.cwd(), 'data', 'raon.db'));

async function migrate() {
    console.log('Starting migration to Supabase...');

    // 0. Clear existing data
    console.log('Clearing existing data for a fresh start...');
    const tables = ['interactions', 'meeting_notes', 'customers', 'backlog_orders', 'revenue_data', 'backlog_excel_data'];
    for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', 0);
        if (error) console.error(`Error clearing table ${table}:`, error);
    }

    // 1. Migrate Customers (Local 'clients' -> Supabase 'customers')
    console.log('Migrating customers...');
    const localClients = db.prepare('SELECT * FROM clients').all();
    for (const client of localClients as any[]) {
        const { id, ...data } = client;
        // Map is_key_customer from 0/1 to boolean
        const formattedData = {
            ...data,
            is_key_customer: !!data.is_key_customer
        };
        const { data: inserted, error } = await supabase
            .from('customers')
            .insert(formattedData)
            .select()
            .single();

        if (error) {
            console.error(`Error migrating customer ${client.company_name}:`, error);
        } else {
            // Update interactions and meetings that refer to this client
            // We need to keep track of the ID mapping because Supabase uses IDENTITY (serial)
            // But actually, if we want to preserve IDs, we could try to insert with ID if Supabase allows
            // or just use the mapping.
            // Let's try to preserve IDs by temporarily disabling IDENTITY or just inserting with ID.
            // Actually, better to just map them.
            
            console.log(`Migrated customer: ${client.company_name} (Old ID: ${id}, New ID: ${inserted.id})`);
            
            function sanitizeDate(dateStr: string) {
                if (!dateStr) return null;
                // Fix common artifacts: "20//5/23" -> "2020-05-23", "2019.09.30" -> "2019-09-30"
                // This is a rough heuristic for the specific data patterns seen.
                let clean = dateStr.replace(/\/\//g, '0').replace(/\./g, '-');
                // If it's YY/MM/DD, let's try to make it YYYY-MM-DD
                if (/^\d{2}-\d{2}-\d{2}$/.test(clean)) {
                    clean = '20' + clean;
                }
                // If it's YYYYMMDD
                if (/^\d{8}$/.test(clean)) {
                    clean = `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`;
                }
                
                try {
                    const d = new Date(clean);
                    if (isNaN(d.getTime())) return null;
                    return d.toISOString().split('T')[0];
                } catch {
                    return null;
                }
            }

            // Migrate Interactions for this specific customer
            const ix = db.prepare('SELECT * FROM interactions WHERE client_id = ?').all(id);
            for (const item of ix as any[]) {
                const { id: oldIxId, client_id, ...ixData } = item;
                const date = sanitizeDate(ixData.date) || '2024-01-01'; // Fallback for really broken dates
                const { error: ixErr } = await supabase
                    .from('interactions')
                    .insert({ ...ixData, date, customer_id: inserted.id });
                if (ixErr) console.error(`Error migrating interaction (Customer: ${client.company_name}):`, ixErr, ixData);
            }

            // Migrate Meetings for this specific customer
            const meets = db.prepare('SELECT * FROM meeting_notes WHERE client_id = ?').all(id);
            for (const item of meets as any[]) {
                const { id: oldMId, client_id, ...mData } = item;
                const date = sanitizeDate(mData.date) || '2024-01-01';
                const { error: mErr } = await supabase
                    .from('meeting_notes')
                    .insert({ ...mData, date, customer_id: inserted.id });
                if (mErr) console.error(`Error migrating meeting note (Customer: ${client.company_name}):`, mErr, mData);
            }
        }
    }

    // 2. Migrate Backlog Orders (Preserve UUIDs as they are strings)
    console.log('Migrating backlog orders...');
    const backlog = db.prepare('SELECT * FROM backlog_orders').all();
    for (const order of backlog as any[]) {
        const { created_at, updated_at, ...orderData } = order;
        const { error } = await supabase
            .from('backlog_orders')
            .insert(orderData);
        if (error) console.error(`Error migrating order ${order.id}:`, error);
    }

    console.log('Migration complete!');
}

migrate();
