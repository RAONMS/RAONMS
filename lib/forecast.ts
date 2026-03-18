export const DEFAULT_FORECAST_ID = 'default';
export const FORECAST_LOCK_TTL_MS = 15_000;

export type ForecastMetricField =
    | 'fcstQty'
    | 'fcstAsp'
    | 'fcstAmt'
    | 'planQty'
    | 'planAsp'
    | 'planAmt';

export interface ForecastMonthData {
    fcstQty: number;
    fcstAsp: number;
    fcstAmt: number;
    planQty: number;
    planAsp: number;
    planAmt: number;
}

export interface ForecastRow {
    id: string;
    forecastId: string;
    model: string;
    customer: string;
    standard: string;
    application: string;
    location: string;
    data: Record<string, ForecastMonthData>;
}

export interface ForecastEntryInput {
    model: string;
    customer: string;
    standard: string;
    application: string;
    location: string;
}

export interface ForecastPresenceUser {
    clientId: string;
    userId: string;
    name: string;
    color: string;
    focusedCellKey: string | null;
    editingCellKey: string | null;
    isEditing: boolean;
}

export interface ForecastCellLock {
    cellKey: string;
    clientId: string;
    userId: string;
    userName: string;
    color: string;
    expiresAt: number;
}

export const FORECAST_USER_COLORS = [
    '#2563EB',
    '#7C3AED',
    '#059669',
    '#DC2626',
    '#EA580C',
    '#0891B2',
];

export function getForecastTimeline(now = new Date()): string[] {
    const currentYear = now.getFullYear();
    const months: string[] = [];

    for (let year = currentYear; year <= currentYear + 1; year += 1) {
        for (let month = 1; month <= 12; month += 1) {
            months.push(`${year}-${month.toString().padStart(2, '0')}`);
        }
    }

    return months;
}

export function emptyForecastMonthData(): ForecastMonthData {
    return {
        fcstQty: 0,
        fcstAsp: 0,
        fcstAmt: 0,
        planQty: 0,
        planAsp: 0,
        planAmt: 0,
    };
}

export function buildForecastColumnKey(month: string, field: ForecastMetricField): string {
    return `${month}:${field}`;
}

export function buildForecastCellKey(rowId: string, columnKey: string): string {
    return `${rowId}::${columnKey}`;
}

export function getForecastUserColor(seed: string): string {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return FORECAST_USER_COLORS[hash % FORECAST_USER_COLORS.length];
}
