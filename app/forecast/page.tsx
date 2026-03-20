'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ForecastGrid from '@/components/ForecastGrid';
import NewForecastEntry from '@/components/NewForecastEntry';
import ModelGrouping from '@/components/ModelGrouping';
import ProductSettings from '@/components/ProductSettings';
import { useHeaderActions } from '@/lib/HeaderActionsContext';
import { useForecastDatabase } from '@/hooks/useForecastDatabase';
import { useForecastRealtime } from '@/hooks/useForecastRealtime';
import {
    DEFAULT_FORECAST_ID,
    getForecastTimeline,
} from '@/lib/forecast';
import { isForecastEditor } from '@/lib/forecastPermissions';
import { convertForecastWorkbookSheetToLegacyRecords, isForecastWorkbookSheet } from '@/lib/forecastWorkbook';

interface GroupNode {
    id: string;
    name: string;
    type: 'group' | 'model';
    children?: GroupNode[];
}

const STORAGE_KEYS = {
    VISIBLE_COLS: 'rsp_forecast_visible_cols_v1',
    HIDDEN_MONTHS: 'rsp_forecast_hidden_months_v1',
    LOCKED_MONTHS: 'rsp_forecast_locked_months_v1',
    GLOBAL_PV: 'rsp_forecast_global_pv_v1',
};

function mergeHierarchyWithModels(hierarchy: GroupNode[], models: string[]): GroupNode[] {
    const clonedHierarchy: GroupNode[] = JSON.parse(JSON.stringify(hierarchy || []));
    const existingModels = new Set<string>();

    const collectModels = (nodes: GroupNode[]) => {
        nodes.forEach((node) => {
            if (node.type === 'model') existingModels.add(node.name);
            if (node.children) collectModels(node.children);
        });
    };

    collectModels(clonedHierarchy);

    const missingModels = models.filter((model) => !existingModels.has(model));
    if (missingModels.length === 0) return clonedHierarchy;

    const missingNodes = missingModels.map((model) => ({
        id: `model-${model}`,
        name: model,
        type: 'model' as const,
    }));

    const ungrouped = clonedHierarchy.find((node) => node.id === 'group-ungrouped');
    if (ungrouped) {
        ungrouped.children = [...(ungrouped.children || []), ...missingNodes];
        return clonedHierarchy;
    }

    return [
        ...clonedHierarchy,
        {
            id: 'group-ungrouped',
            name: 'Ungrouped',
            type: 'group',
            children: missingNodes,
        },
    ];
}

export default function ForecastPage() {
    const [forecastId, setForecastId] = useState(DEFAULT_FORECAST_ID);
    const [clientId] = useState(() => globalThis.crypto?.randomUUID?.() || `forecast-client-${Date.now()}`);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'grid' | 'groups' | 'settings'>('grid');
    const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
    const [isImportingLegacy, setIsImportingLegacy] = useState(false);
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);
    const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
    const { setActions } = useHeaderActions();
    const {
        forecastData,
        setForecastData,
        loading,
        saving: isSaving,
        error,
        currentUser,
        refresh,
        saveForecastData,
        addForecastEntry,
    } = useForecastDatabase(forecastId);
    
    // Grid States
    const [visibleColumns, setVisibleColumns] = useState({
        standard: true, application: true, location: true
    });
    const [globalPlanVarVisible, setGlobalPlanVarVisible] = useState(true);
    const [lockedMonths, setLockedMonths] = useState<Set<string>>(new Set());
    const [hiddenMonths, setHiddenMonths] = useState<Set<string>>(new Set());
    const [monthSpecificPlanVar, setMonthSpecificPlanVar] = useState<Record<string, boolean>>({});
    const [hierarchyCloudHydrated, setHierarchyCloudHydrated] = useState(false);
    const forecastDataRef = useRef<any[]>([]);

    // Dynamic Timeline: Current Year + Next Year (24 months)
    const timeline = useMemo(() => getForecastTimeline(), []);

    // Load from LocalStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setForecastId(params.get('forecastId') || DEFAULT_FORECAST_ID);

        try {
            const savedCols = localStorage.getItem(STORAGE_KEYS.VISIBLE_COLS);
            if (savedCols) setVisibleColumns(JSON.parse(savedCols));
            const savedGlobalPV = localStorage.getItem(STORAGE_KEYS.GLOBAL_PV);
            if (savedGlobalPV !== null) setGlobalPlanVarVisible(savedGlobalPV === 'true');
            const savedHidden = localStorage.getItem(STORAGE_KEYS.HIDDEN_MONTHS);
            if (savedHidden) setHiddenMonths(new Set(JSON.parse(savedHidden)));
            const savedLocked = localStorage.getItem(STORAGE_KEYS.LOCKED_MONTHS);
            if (savedLocked) setLockedMonths(new Set(JSON.parse(savedLocked)));
        } catch (e) {
            console.error('Persistence load error:', e);
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.VISIBLE_COLS, JSON.stringify(visibleColumns));
        localStorage.setItem(STORAGE_KEYS.GLOBAL_PV, String(globalPlanVarVisible));
        localStorage.setItem(STORAGE_KEYS.HIDDEN_MONTHS, JSON.stringify(Array.from(hiddenMonths)));
        localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify(Array.from(lockedMonths)));
    }, [visibleColumns, globalPlanVarVisible, hiddenMonths, lockedMonths]);

    const handleRealtimeRefresh = useCallback(() => {
        void refresh();
    }, [refresh]);

    const { channel, connectionStatus } = useForecastRealtime(forecastId, clientId, handleRealtimeRefresh);
    const canEditForecast = useMemo(
        () => isForecastEditor(currentUser?.email),
        [currentUser?.email]
    );

    const handleSave = async () => {
        if (!canEditForecast) return;
        try {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            await saveForecastData(forecastDataRef.current as any);
            setHasPendingChanges(false);
            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving changes.');
        }
    };

    const handleCellEdit = (rowId: string, rowIndex: number, month: string, field: string, value: number) => {
        if (!canEditForecast) return;
        setForecastData(prev => {
            const next = [...prev];
            const row = { ...next[rowIndex] };
            row.data = { ...row.data };
            row.data[month] = { ...row.data[month], [field]: value };
            next[rowIndex] = row;
            forecastDataRef.current = next;
            return next;
        });
        setHasPendingChanges(true);
    };

    useEffect(() => {
        forecastDataRef.current = forecastData;
    }, [forecastData]);

    const handleCellFocus = useCallback(async () => {}, []);

    const handleCellBlur = useCallback(async () => {}, []);

    const handleCellEditStart = useCallback(async () => canEditForecast, [canEditForecast]);

    const handleCellEditEnd = useCallback(async () => {}, []);

    const handleToggleColumn = useCallback((col: 'standard' | 'application' | 'location') => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    }, []);

    const showAllColumns = useCallback(() => {
        setVisibleColumns({ standard: true, application: true, location: true });
    }, []);

    const revealAllMonths = useCallback(() => {
        setHiddenMonths(new Set());
    }, []);

    const handleGlobalPlanVarToggle = useCallback(() => {
        const nextState = !globalPlanVarVisible;
        setGlobalPlanVarVisible(nextState);
        setMonthSpecificPlanVar({});
    }, [globalPlanVarVisible]);

    const handleImportLegacyForecast = useCallback(async (file: File) => {
        setIsImportingLegacy(true);
        try {
            const lowerName = file.name.toLowerCase();
            let response: Response;

            if (lowerName.endsWith('.csv')) {
                const formData = new FormData();
                formData.append('forecastId', forecastId);
                formData.append('file', file);

                response = await fetch('/api/forecast/import', {
                    method: 'POST',
                    body: formData,
                });
            } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });

                const matchedSheetName = workbook.SheetNames.find((sheetName) => {
                    const sheet = workbook.Sheets[sheetName];
                    const sheetRows = XLSX.utils.sheet_to_json(sheet, {
                        header: 1,
                        raw: true,
                        defval: null,
                    }) as unknown[][];

                    return isForecastWorkbookSheet(sheetRows);
                });

                if (!matchedSheetName) {
                    throw new Error('Could not find a forecast detail sheet in this workbook.');
                }

                const matchedSheet = workbook.Sheets[matchedSheetName];
                const sheetRows = XLSX.utils.sheet_to_json(matchedSheet, {
                    header: 1,
                    raw: true,
                    defval: null,
                }) as unknown[][];

                const normalizedRows = convertForecastWorkbookSheetToLegacyRecords(sheetRows);

                response = await fetch('/api/forecast/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        forecastId,
                        rows: normalizedRows,
                    }),
                });
            } else {
                throw new Error('Unsupported file type. Upload a .csv, .xlsx, or .xls forecast file.');
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Forecast import failed');
            }

            await refresh();
            setHasPendingChanges(false);
            alert(`Imported ${data.importedEntries} forecast entries from ${file.name}.`);
        } catch (error: any) {
            console.error('Forecast import failed', error);
            alert(error.message || 'Forecast import failed');
        } finally {
            setIsImportingLegacy(false);
        }
    }, [forecastId, refresh]);

    const handleImportFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void handleImportLegacyForecast(file);
        event.target.value = '';
    }, [handleImportLegacyForecast]);

    // Set Header Actions
    useEffect(() => {
        if (activeTab === 'grid') {
            setActions(
                <div style={{ display: 'flex', gap: '8px' }}>
                    {canEditForecast && hasPendingChanges && (
                        <button className="btn btn-primary save-btn" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={revealAllMonths}>
                        Reveal All Months
                    </button>
                    <button className="btn btn-secondary" onClick={handleGlobalPlanVarToggle}>
                        Toggle PLAN/VAR
                    </button>
                    <button className="btn btn-secondary" onClick={showAllColumns}>
                        Show All Columns
                    </button>
                    {canEditForecast && (
                        <button className="btn btn-secondary" onClick={() => importFileInputRef.current?.click()} disabled={isImportingLegacy}>
                            {isImportingLegacy ? 'Importing...' : 'Upload Forecast File'}
                        </button>
                    )}
                    {canEditForecast && (
                        <button className="btn btn-primary" onClick={() => setIsNewEntryOpen(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Entry
                        </button>
                    )}
                </div>
            );
        } else {
            setActions(null);
        }
        return () => setActions(null);
    }, [activeTab, canEditForecast, setActions, showAllColumns, revealAllMonths, globalPlanVarVisible, handleGlobalPlanVarToggle, hasPendingChanges, isSaving, forecastData, handleImportLegacyForecast, isImportingLegacy]);

    const uniqueModels = useMemo(() => {
        const models = Array.from(new Set(forecastData.map(d => d.model))).sort();
        return models;
    }, [forecastData]);

    const toggleMonthLock = (month: string) => {
        setLockedMonths(prev => {
            const next = new Set(prev);
            if (next.has(month)) next.delete(month);
            else next.add(month);
            return next;
        });
    };

    const toggleMonthVisibility = (month: string) => {
        setHiddenMonths(prev => {
            const next = new Set(prev);
            if (next.has(month)) next.delete(month);
            else next.add(month);
            return next;
        });
    };

    const toggleMonthPlanVar = (month: string) => {
        setMonthSpecificPlanVar(prev => ({
            ...prev,
            [month]: !(prev[month] ?? globalPlanVarVisible)
        }));
    };

    const [hierarchy, setHierarchy] = useState<GroupNode[]>([]);

    const effectiveHierarchy = useMemo(
        () => mergeHierarchyWithModels(hierarchy, uniqueModels),
        [hierarchy, uniqueModels]
    );

    // Load hierarchy from localStorage for grid consumption
    useEffect(() => {
        const saved = localStorage.getItem('rsp_model_hierarchy_v1');
        if (saved) {
            try {
                setHierarchy(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse hierarchy', e);
            }
        }
    }, [activeTab]); // Refresh when switching back to grid

    useEffect(() => {
        let active = true;

        void (async () => {
            try {
                const res = await fetch(`/api/forecast/hierarchy?forecastId=${encodeURIComponent(forecastId)}`, {
                    cache: 'no-store',
                });
                const data = await res.json();
                if (!active || !res.ok || !data.hierarchy) return;
                setHierarchy(data.hierarchy);
                localStorage.setItem('rsp_model_hierarchy_v1', JSON.stringify(data.hierarchy));
            } catch (error) {
                console.error('Failed to load cloud hierarchy', error);
            } finally {
                if (active) {
                    setHierarchyCloudHydrated(true);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [forecastId]);

    useEffect(() => {
        if (!hierarchyCloudHydrated) return;

        const timeoutId = window.setTimeout(() => {
            void fetch('/api/forecast/hierarchy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forecastId, hierarchy }),
            }).catch((error) => {
                console.error('Failed to save cloud hierarchy', error);
            });
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [forecastId, hierarchy, hierarchyCloudHydrated]);

    return (
        <div className="page-container">
            <div className={`tabs-container${activeTab === 'grid' ? ' sticky-tabs' : ''}`}>
                <div className="live-strip">
                    <div className="viewer-cluster">
                        <span className="live-pill">Live Forecast {forecastId}</span>
                        <span className="viewer-count">{canEditForecast ? 'Editor' : 'Viewer'}</span>
                    </div>
                    <div className={`realtime-status status-${connectionStatus.toLowerCase()}`}>
                        {connectionStatus === 'SUBSCRIBED' ? 'Updates appear after save' : `Realtime ${connectionStatus.toLowerCase()}`}
                    </div>
                </div>
                <div className="tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
                        onClick={() => setActiveTab('grid')}
                    >
                        Data Grid
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                        onClick={() => setActiveTab('groups')}
                    >
                        Groups
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </div>
            </div>

            <main>
                {activeTab === 'grid' ? (
                    <div className="grid-view">
                        {loading && forecastData.length === 0 ? (
                            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                                <p className="text-secondary">Loading forecast data...</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <ForecastGrid 
                                    data={forecastData} 
                                    timeline={timeline}
                                    hierarchy={effectiveHierarchy}
                                    visibleColumns={visibleColumns} 
                                    onToggleColumn={handleToggleColumn}
                                    globalPlanVarVisible={globalPlanVarVisible}
                                    lockedMonths={lockedMonths}
                                    hiddenMonths={hiddenMonths}
                                    monthSpecificPlanVar={monthSpecificPlanVar}
                                    onToggleLock={toggleMonthLock}
                                    onToggleMonthVisibility={toggleMonthVisibility}
                                    onToggleMonthPlanVar={toggleMonthPlanVar}
                                    canEditForecast={canEditForecast}
                                    onCellEdit={handleCellEdit}
                                    focusedCellsByUser={{}}
                                    locksByCell={{}}
                                    currentClientId={clientId}
                                    isCellLocked={() => false}
                                    getCellLockOwner={() => null}
                                    onCellFocus={handleCellFocus}
                                    onCellBlur={handleCellBlur}
                                    onCellEditStart={handleCellEditStart}
                                    onCellEditEnd={handleCellEditEnd}
                                />
                            </div>
                        )}
                        {error && (
                            <div className="forecast-status-message">
                                {error}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'groups' ? (
                    <div className="settings-view">
                        <ModelGrouping 
                            models={uniqueModels}
                            onGroupsChange={(newHierarchy) => setHierarchy(newHierarchy)}
                        />
                    </div>
                ) : (
                    <div className="settings-view">
                        <ProductSettings 
                            forecastData={forecastData}
                        />
                    </div>
                )}
            </main>

            {canEditForecast && isNewEntryOpen && (
                <NewForecastEntry 
                    onClose={() => setIsNewEntryOpen(false)} 
                    onSuccess={() => {
                        setIsNewEntryOpen(false);
                        void refresh();
                    }}
                    onCreate={addForecastEntry}
                />
            )}

            <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                style={{ display: 'none' }}
                onChange={handleImportFileChange}
            />
            
            <style jsx>{`
                .page-container {
                    display: flex;
                    flex-direction: column;
                    min-height: calc(100vh - var(--topbar-height) - 56px);
                }
                .tabs-container {
                    border-bottom: 2px solid var(--color-border);
                    margin-bottom: 16px;
                    background: var(--color-bg);
                }
                .live-strip {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 0 0 12px;
                    flex-wrap: wrap;
                }
                .viewer-cluster {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .live-pill, .viewer-count, .viewer-badge, .realtime-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 600;
                    background: white;
                    border: 1px solid var(--color-border);
                }
                .live-pill {
                    background: var(--color-primary-soft);
                    color: var(--color-primary-text);
                    border-color: #c7d2fe;
                }
                .viewer-list {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .viewer-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                }
                .status-subscribed {
                    color: #047857;
                    border-color: #a7f3d0;
                    background: #ecfdf5;
                }
                .forecast-status-message {
                    margin-top: 12px;
                    padding: 10px 12px;
                    border-radius: var(--radius-md);
                    background: #fff7ed;
                    border: 1px solid #fdba74;
                    color: #9a3412;
                    font-size: 13px;
                    font-weight: 600;
                }
                .sticky-tabs {
                    position: sticky;
                    top: -1px;
                    z-index: 20;
                }
                .tabs {
                    display: flex;
                    gap: 2px;
                    margin-bottom: -2px;
                }
                .grid-view, .settings-view {
                    animation: fade-in 0.3s ease-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .btn-secondary {
                    background: #ffffff !important;
                    color: #5b21b6 !important;
                    border: 1px solid #8b5cf6 !important;
                    box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.08);
                    font-size: 13px;
                    padding: 8px 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .btn-secondary:hover {
                    background: #faf5ff !important;
                    border-color: #7c3aed !important;
                    color: #4c1d95 !important;
                }
                .btn-primary {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 600;
                }
                .save-btn {
                    background: var(--color-success) !important;
                    border-color: var(--color-success-dark) !important;
                }
                .save-btn:hover { background: var(--color-success-dark) !important; }
            `}</style>
        </div>
    );
}
