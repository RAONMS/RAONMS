import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { ForecastRow } from '@/lib/forecast';

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

function normalizeMonth(monthValue: string): string | null {
  if (!monthValue) return null;
  const clean = monthValue.toLowerCase().replace('.', '').trim();
  const match = clean.match(/([a-z]{3}).*?(\d{2})/);
  if (!match) return null;

  const month = MONTH_MAP[match[1]];
  if (!month) return null;

  return `20${match[2]}-${month}`;
}

export function readLegacyForecastRows(forecastId = 'default'): ForecastRow[] {
  const filePath = path.join(process.cwd(), 'forecast', 'forecast_master_database.csv');
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows: ForecastRow[] = [];
  const seenKeys = new Map<string, number>();

  (parsed.data as Record<string, string | number | null | undefined>[]).forEach((row) => {
    const model = String(row.Model || '').trim();
    const customer = String(row.Customer || '').trim();
    const standard = String(row.Standard || '').trim();
    const application = String(row.Application || '').trim();
    const location = String(row.Location || '').trim();
    const normalizedMonth = normalizeMonth(String(row.Month || ''));

    if (!model || !customer || !standard || !normalizedMonth) return;

    const key = `${model}|${customer}|${standard}|${application}|${location}`;

    if (!seenKeys.has(key)) {
      seenKeys.set(key, rows.length);
      rows.push({
        id: key,
        forecastId,
        model,
        customer,
        standard,
        application,
        location,
        data: {},
      });
    }

    const rowIndex = seenKeys.get(key)!;
    rows[rowIndex].data[normalizedMonth] = {
      fcstQty: Number(row["FCST_Q'ty"] || 0),
      fcstAsp: Number(row.FCST_ASP || 0),
      fcstAmt: Number(row.FCST_AMT || 0),
      planQty: Number(row["PLAN_Q'ty"] || 0),
      planAsp: Number(row.PLAN_ASP || 0),
      planAmt: Number(row.PLAN_AMT || 0),
    };
  });

  return rows;
}

export function readLegacyProductCharacteristics() {
  const filePath = path.join(process.cwd(), 'forecast', 'product_characteristics.json');
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export async function fetchLegacyForecastRows(assetBaseUrl: string, forecastId = 'default') {
  const response = await fetch(`${assetBaseUrl}/forecast/forecast_master_database.csv`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch legacy forecast CSV: ${response.status}`);
  }

  const csvContent = await response.text();
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows: ForecastRow[] = [];
  const seenKeys = new Map<string, number>();

  (parsed.data as Record<string, string | number | null | undefined>[]).forEach((row) => {
    const model = String(row.Model || '').trim();
    const customer = String(row.Customer || '').trim();
    const standard = String(row.Standard || '').trim();
    const application = String(row.Application || '').trim();
    const location = String(row.Location || '').trim();
    const normalizedMonth = normalizeMonth(String(row.Month || ''));

    if (!model || !customer || !standard || !normalizedMonth) return;

    const key = `${model}|${customer}|${standard}|${application}|${location}`;

    if (!seenKeys.has(key)) {
      seenKeys.set(key, rows.length);
      rows.push({
        id: key,
        forecastId,
        model,
        customer,
        standard,
        application,
        location,
        data: {},
      });
    }

    const rowIndex = seenKeys.get(key)!;
    rows[rowIndex].data[normalizedMonth] = {
      fcstQty: Number(row["FCST_Q'ty"] || 0),
      fcstAsp: Number(row.FCST_ASP || 0),
      fcstAmt: Number(row.FCST_AMT || 0),
      planQty: Number(row["PLAN_Q'ty"] || 0),
      planAsp: Number(row.PLAN_ASP || 0),
      planAmt: Number(row.PLAN_AMT || 0),
    };
  });

  return rows;
}

export async function fetchLegacyProductCharacteristics(assetBaseUrl: string) {
  const response = await fetch(`${assetBaseUrl}/forecast/product_characteristics.json`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return {};
  }

  return response.json();
}
