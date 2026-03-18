// Central settings store — persisted to localStorage
// All dashboard-configurable preferences live here

export interface DashboardSettings {
    // Dashboard — Interaction Trend
    interactionTrendWeeks: number;   // default 8

    // Dashboard — Recent Interactions feed
    recentInteractionsCount: number; // default 12

    // Dashboard — Revenue Category chart
    revenueCategoryYearFrom: number; // default 2024

    // Revenue page — default year range
    revenueDefaultYearFrom: number;  // default 2020

    // Backlog page
    backlogShowPastMonths: boolean;  // default false (hide past delivery months)
}

export const DEFAULT_SETTINGS: DashboardSettings = {
    interactionTrendWeeks: 8,
    recentInteractionsCount: 12,
    revenueCategoryYearFrom: 2024,
    revenueDefaultYearFrom: 2020,
    backlogShowPastMonths: false,
};

const STORAGE_KEY = 'raon_dashboard_settings';

export function loadSettings(): DashboardSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(settings: DashboardSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetSettings(): DashboardSettings {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_SETTINGS;
}
