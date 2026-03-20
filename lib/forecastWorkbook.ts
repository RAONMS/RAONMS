import type { LegacyForecastRecord } from '@/lib/forecastLegacy';

const MONTH_INDEX: Record<string, string> = {
  jan: 'Jan',
  feb: 'Feb',
  mar: 'Mar',
  apr: 'Apr',
  may: 'May',
  jun: 'Jun',
  jul: 'Jul',
  aug: 'Aug',
  sep: 'Sep',
  oct: 'Oct',
  nov: 'Nov',
  dec: 'Dec',
};

const STANDARD_BY_APPLICATION: Record<string, string> = {
  'AR/HMD': 'LCoS (Amplitude)',
  Automotive: 'LCoS (Phase)',
  'M-FAB': 'M-FAB',
  MTV: 'MTV',
  TELECOM: 'LCoS (Phase)',
};

function cleanText(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function toNumber(value: unknown) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeWorkbookMonth(label: unknown) {
  const value = cleanText(label).replace(/\./g, '');
  if (!value) return null;
  if (/total/i.test(value) || /\bq[1-4]\b/i.test(value) || /^cy/i.test(value)) {
    return null;
  }

  const match = value.match(/^([A-Za-z]{3})\s+'?(\d{2})$/);
  if (!match) return null;

  const month = MONTH_INDEX[match[1].toLowerCase()];
  if (!month) return null;

  return `${month}-${match[2]}`;
}

function inferStandard(application: string, rememberedStandard: string) {
  if (rememberedStandard) return rememberedStandard;
  return STANDARD_BY_APPLICATION[application] || application;
}

export function isForecastWorkbookSheet(sheetData: unknown[][]) {
  return (
    cleanText(sheetData?.[3]?.[1]) === 'Model' &&
    cleanText(sheetData?.[3]?.[2]) === 'Customer' &&
    cleanText(sheetData?.[3]?.[4]) === 'Application' &&
    cleanText(sheetData?.[3]?.[5]) === 'Location'
  );
}

export function convertForecastWorkbookSheetToLegacyRecords(sheetData: unknown[][]) {
  if (!isForecastWorkbookSheet(sheetData)) {
    throw new Error('Unsupported workbook format. Expected a forecast detail sheet like "2025 FCST".');
  }

  const monthBlocks: Array<{ start: number; month: string }> = [];
  const headerRow = sheetData[3] || [];

  for (let columnIndex = 6; columnIndex < headerRow.length; columnIndex += 9) {
    const month = normalizeWorkbookMonth(headerRow[columnIndex]);
    if (!month) continue;
    monthBlocks.push({ start: columnIndex, month });
  }

  if (monthBlocks.length === 0) {
    throw new Error('Could not find any monthly forecast columns in the workbook.');
  }

  const records: LegacyForecastRecord[] = [];
  let rememberedStandard = '';
  let rememberedApplication = '';

  for (let rowIndex = 7; rowIndex < sheetData.length; rowIndex += 1) {
    const row = sheetData[rowIndex] || [];
    const model = cleanText(row[1]);
    const customer = cleanText(row[2]);
    const rowStandard = cleanText(row[3]);
    const rowApplication = cleanText(row[4]);
    const location = cleanText(row[5]);

    if (rowStandard) rememberedStandard = rowStandard;
    if (rowApplication) rememberedApplication = rowApplication;

    if (!model || /total/i.test(model)) {
      continue;
    }

    const application = rowApplication || rememberedApplication;
    const standard = inferStandard(application, rowStandard || rememberedStandard);

    if (!application || !standard) {
      continue;
    }

    let hasImportedValue = false;

    for (const { start, month } of monthBlocks) {
      const fcstSection = cleanText(sheetData[4]?.[start]);
      const planSection = cleanText(sheetData[4]?.[start + 3]);

      const fcstQty = fcstSection === 'FCST' ? toNumber(row[start]) : 0;
      const fcstAsp = fcstSection === 'FCST' ? toNumber(row[start + 1]) : 0;
      const fcstAmt = fcstSection === 'FCST' ? toNumber(row[start + 2]) : 0;
      const planQty = planSection === 'PLAN' ? toNumber(row[start + 3]) : 0;
      const planAsp = planSection === 'PLAN' ? toNumber(row[start + 4]) : 0;
      const planAmt = planSection === 'PLAN' ? toNumber(row[start + 5]) : 0;

      if (
        fcstQty === 0 &&
        fcstAsp === 0 &&
        fcstAmt === 0 &&
        planQty === 0 &&
        planAsp === 0 &&
        planAmt === 0
      ) {
        continue;
      }

      hasImportedValue = true;
      records.push({
        Model: model,
        Customer: customer,
        Standard: standard,
        Application: application,
        Location: location,
        Month: month,
        "FCST_Q'ty": fcstQty,
        FCST_ASP: fcstAsp,
        FCST_AMT: fcstAmt,
        "PLAN_Q'ty": planQty,
        PLAN_ASP: planAsp,
        PLAN_AMT: planAmt,
      });
    }

    if (!hasImportedValue) {
      continue;
    }
  }

  if (records.length === 0) {
    throw new Error('The workbook did not contain any importable forecast rows.');
  }

  return records;
}
