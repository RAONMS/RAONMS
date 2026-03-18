import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

const MONTH_MAP: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

const INV_MONTH_MAP: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
};

function normalizeMonth(m: string): string | null {
    if (!m) return null;
    const clean = m.toLowerCase().replace('.', '').trim();
    const match = clean.match(/([a-z]{3}).*?(\d{2})/);
    if (!match) return null;
    const month = MONTH_MAP[match[1]];
    const year = '20' + match[2];
    if (!month) return null;
    return `${year}-${month}`;
}

function denormalizeMonth(ym: string): string {
    const [year, month] = ym.split('-');
    const mLabel = INV_MONTH_MAP[month];
    const yShort = year.slice(2);
    return `${mLabel}-${yShort}`;
}

function getDefaultTimelineMonths(): string[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months: string[] = [];

    for (let y = currentYear; y <= currentYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
            months.push(`${y}-${m.toString().padStart(2, '0')}`);
        }
    }

    return months;
}

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'forecast', 'forecast_master_database.csv');
        const csvContent = fs.readFileSync(filePath, 'utf8');

        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        const rows: any[] = [];
        const seenKeys = new Map<string, number>();

        parsed.data.forEach((row: any) => {
            const key = `${row.Model}|${row.Customer}|${row.Standard}|${row.Application}|${row.Location}`;
            const normalizedMonth = normalizeMonth(row.Month);
            
            if (!normalizedMonth) return;

            if (!seenKeys.has(key)) {
                seenKeys.set(key, rows.length);
                rows.push({
                    model: row.Model,
                    customer: row.Customer,
                    standard: row.Standard,
                    application: row.Application,
                    location: row.Location,
                    data: {}
                });
            }

            const rowIndex = seenKeys.get(key)!;
            rows[rowIndex].data[normalizedMonth] = {
                fcstQty: row["FCST_Q'ty"] || 0,
                fcstAsp: row["FCST_ASP"] || 0,
                fcstAmt: row["FCST_AMT"] || 0,
                planQty: row["PLAN_Q'ty"] || 0,
                planAsp: row["PLAN_ASP"] || 0,
                planAmt: row["PLAN_AMT"] || 0
            };
        });

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('Forecast API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const filePath = path.join(process.cwd(), 'forecast', 'forecast_master_database.csv');

        if (body.action === 'add_entry') {
            const entry = body.entry || {};
            const model = String(entry.model || '').trim();
            const customer = String(entry.customer || '').trim();
            const standard = String(entry.standard || '').trim();
            const application = String(entry.application || '').trim();
            const location = String(entry.location || '').trim();

            if (!model || !customer || !standard || !application || !location) {
                return NextResponse.json({ error: 'All entry fields are required.' }, { status: 400 });
            }

            const existingCsv = fs.readFileSync(filePath, 'utf8');
            const parsed = Papa.parse(existingCsv, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });

            const existingRows = parsed.data as any[];
            const duplicateExists = existingRows.some((row) =>
                row.Model === model &&
                row.Customer === customer &&
                row.Standard === standard &&
                row.Application === application &&
                row.Location === location
            );

            if (duplicateExists) {
                return NextResponse.json({ error: 'This forecast entry already exists.' }, { status: 409 });
            }

            const newRows = getDefaultTimelineMonths().map((month) => ({
                Model: model,
                Customer: customer,
                Standard: standard,
                Application: application,
                Location: location,
                Month: denormalizeMonth(month),
                "FCST_Q'ty": 0,
                FCST_ASP: 0,
                FCST_AMT: 0,
                "PLAN_Q'ty": 0,
                PLAN_ASP: 0,
                PLAN_AMT: 0
            }));

            const csv = Papa.unparse([...existingRows, ...newRows]);
            fs.writeFileSync(filePath, csv, 'utf8');

            return NextResponse.json({ success: true });
        }

        const { data } = body;
        
        // Flatten the data back to CSV rows
        const csvRows: any[] = [];
        
        data.forEach((row: any) => {
            Object.entries(row.data).forEach(([month, metrics]: [string, any]) => {
                csvRows.push({
                    'Model': row.model,
                    'Customer': row.customer,
                    'Standard': row.standard,
                    'Application': row.application,
                    'Location': row.location,
                    'Month': denormalizeMonth(month),
                    "FCST_Q'ty": metrics.fcstQty || 0,
                    'FCST_ASP': metrics.fcstAsp || 0,
                    'FCST_AMT': metrics.fcstAmt || 0,
                    "PLAN_Q'ty": metrics.planQty || 0,
                    'PLAN_ASP': metrics.planAsp || 0,
                    'PLAN_AMT': metrics.planAmt || 0
                });
            });
        });

        const csv = Papa.unparse(csvRows);
        fs.writeFileSync(filePath, csv, 'utf8');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Forecast API Save error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
