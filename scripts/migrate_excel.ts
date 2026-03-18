import Database from 'better-sqlite3';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { initSchema } from '../lib/schema';

const dbPath = path.join(process.cwd(), 'data', 'raon.db');
const db = new Database(dbPath);

const excelPath = path.join(process.cwd(), 'data', 'RAON_FULL.xlsx');
console.log('Loading Excel file...');

try {
    const buf = fs.readFileSync(excelPath);
    const wb = xlsx.read(buf, { cellDates: true, type: 'buffer' });

    console.log(`Found ${wb.SheetNames.length} sheets.`);

    console.log('Initializing schema...');
    initSchema(db);

    console.log('Clearing existing data...');
    db.exec('DELETE FROM interactions');
    db.exec('DELETE FROM meeting_notes');
    db.exec('DELETE FROM clients');

    const insertClient = db.prepare('INSERT INTO clients (company_name, status) VALUES (?, ?)');
    const insertInteraction = db.prepare('INSERT INTO interactions (client_id, date, attendee, sales_topic, fae_topic) VALUES (?, ?, ?, ?, ?)');

    let totalInteractions = 0;
    let totalClients = 0;

    db.transaction(() => {
        // Skip the first 2 summary sheets
        for (let i = 2; i < wb.SheetNames.length; i++) {
            const sheetName = wb.SheetNames[i];
            const ws = wb.Sheets[sheetName];
            if (!ws) continue;

            const data = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
            if (data.length === 0) continue;

            try {
                const info = insertClient.run(sheetName, 'Active');
                const clientId = info.lastInsertRowid;
                totalClients++;

                // Find the header row that contains "Date"
                let headerRowIdx = -1;
                for (let r = 0; r < Math.min(30, data.length); r++) {
                    if (data[r] && typeof data[r][0] === 'string' && data[r][0].includes('Date')) {
                        headerRowIdx = r;
                        break;
                    }
                }

                if (headerRowIdx !== -1) {
                    for (let r = headerRowIdx + 1; r < data.length; r++) {
                        const row = data[r];
                        if (!row || !row[0]) continue; // Empty date

                        let dateStr: string | null = null;
                        if (row[0] instanceof Date) {
                            dateStr = row[0].toISOString().slice(0, 10);
                        } else if (typeof row[0] === 'string') {
                            dateStr = row[0].trim();
                        } else if (typeof row[0] === 'number') {
                            // Excel date number
                            const d = new Date(Math.round((row[0] - 25569) * 86400 * 1000));
                            if (!isNaN(d.getTime())) {
                                dateStr = d.toISOString().slice(0, 10);
                            }
                        }

                        if (!dateStr || dateStr.length < 5) continue;

                        const attendee = row[1] ? String(row[1]) : '';
                        const salesTopic = row[2] ? String(row[2]) : '';
                        const faeTopic = row[3] ? String(row[3]) : '';

                        // Only insert if there's actually a topic discussed
                        if (salesTopic.trim() || faeTopic.trim()) {
                            insertInteraction.run(clientId, dateStr, attendee, salesTopic, faeTopic);
                            totalInteractions++;
                        }
                    }
                }
            } catch (e) {
                console.error(`Error processing sheet ${sheetName}:`, e);
            }
        }
    })();

    console.log(`\nMigration complete!`);
    console.log(`Imported ${totalClients} customers and ${totalInteractions} interactions.`);

} catch (e) {
    console.error("Migration failed:", e);
} finally {
    db.close();
}
