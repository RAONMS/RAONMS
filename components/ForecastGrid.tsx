'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { buildForecastCellKey, buildForecastColumnKey, ForecastCellLock, ForecastPresenceUser } from '@/lib/forecast';

interface GroupNode {
    id: string;
    name: string;
    type: 'group' | 'model';
    children?: GroupNode[];
    isOpen?: boolean;
}

interface ForecastGridProps {
    data: any[];
    timeline: string[];
    hierarchy?: GroupNode[];
    visibleColumns: {
        standard: boolean;
        application: boolean;
        location: boolean;
    };
    onToggleColumn: (col: 'standard' | 'application' | 'location') => void;
    globalPlanVarVisible: boolean;
    lockedMonths: Set<string>;
    hiddenMonths: Set<string>;
    monthSpecificPlanVar: Record<string, boolean>;
    onToggleLock: (month: string) => void;
    onToggleMonthVisibility: (month: string) => void;
    onToggleMonthPlanVar: (month: string) => void;
    onCellEdit: (rowIndex: number, month: string, field: string, value: number) => void;
    focusedCellsByUser: Record<string, ForecastPresenceUser>;
    locksByCell: Record<string, ForecastCellLock>;
    currentClientId: string;
    isCellLocked: (cellKey: string, localClientId?: string) => boolean;
    getCellLockOwner: (cellKey: string) => ForecastCellLock | null;
    onCellFocus: (rowId: string, month: string, field: string) => Promise<void> | void;
    onCellBlur: (rowId: string, month: string, field: string) => Promise<void> | void;
    onCellEditStart: (rowId: string, month: string, field: string) => Promise<boolean>;
    onCellEditEnd: (rowId: string, month: string, field: string) => Promise<void> | void;
}

function formatMonth(ym: string) {
    const [year, month] = ym.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short', year: '2-digit' });
}

export default function ForecastGrid({ 
    data, 
    timeline,
    visibleColumns, 
    onToggleColumn,
    globalPlanVarVisible,
    lockedMonths,
    hiddenMonths,
    monthSpecificPlanVar,
    onToggleLock,
    onToggleMonthVisibility,
    onToggleMonthPlanVar,
    onCellEdit,
    focusedCellsByUser,
    locksByCell,
    currentClientId,
    isCellLocked,
    getCellLockOwner,
    onCellFocus,
    onCellBlur,
    onCellEditStart,
    onCellEditEnd,
    hierarchy = []
}: ForecastGridProps) {
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(['group-ungrouped']));

    const modelGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        data.forEach(row => {
            if (!groups[row.model]) groups[row.model] = [];
            groups[row.model].push(row);
        });
        return groups;
    }, [data]);

    useEffect(() => {
        // Automatically expand root groups on first load if hierarchy changes
        if (hierarchy.length > 0 && expandedGroups.size <= 1) {
            setExpandedGroups(new Set(hierarchy.map(n => n.id)));
        }
    }, [hierarchy]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    
    const visibleMonths = timeline.filter(m => !hiddenMonths.has(m));
    const activeIdCols = 2 + (visibleColumns.standard ? 1 : 0) + (visibleColumns.application ? 1 : 0) + (visibleColumns.location ? 1 : 0);

    // Dynamic border logic for identifiers
    const lastVisibleId = ['location', 'application', 'standard', 'customer', 'model'].find(id => id === 'model' || id === 'customer' || (visibleColumns as any)[id]);

    // Calculate left positions for sticky columns
    const colWidths = {
        model: 140,
        customer: 120,
        standard: 100,
        application: 100,
        location: 90
    };

    let currentLeft = 0;
    const leftModel = 0;
    currentLeft += colWidths.model;
    const leftCustomer = currentLeft;
    currentLeft += colWidths.customer;
    const leftStandard = visibleColumns.standard ? currentLeft : 0;
    if (visibleColumns.standard) currentLeft += colWidths.standard;
    const leftApplication = visibleColumns.application ? currentLeft : 0;
    if (visibleColumns.application) currentLeft += colWidths.application;
    const leftLocation = visibleColumns.location ? currentLeft : 0;
    if (visibleColumns.location) currentLeft += colWidths.location;

    // Calculate Totals per month
    const totals = useMemo(() => {
        const t: Record<string, any> = {};
        visibleMonths.forEach(m => {
            let fcstQty = 0, fcstAmt = 0, planQty = 0, planAmt = 0;
            data.forEach(row => {
                const md = row.data?.[m] || {};
                fcstQty += Number(md.fcstQty || 0);
                fcstAmt += Number(md.fcstAmt || 0);
                planQty += Number(md.planQty || 0);
                planAmt += Number(md.planAmt || 0);
            });
            const fcstAsp = fcstQty > 0 ? fcstAmt / fcstQty : 0;
            const planAsp = planQty > 0 ? planAmt / planQty : 0;
            const varQty = fcstQty - planQty;
            const varAmt = fcstAmt - planAmt;
            const varAsp = fcstAsp - planAsp;

            t[m] = { fcstQty, fcstAsp, fcstAmt, planQty, planAsp, planAmt, varQty, varAsp, varAmt };
        });
        return t;
    }, [data, visibleMonths]);

    const formatQty = (val: number, maxDecimals = 0) => {
        if (val === 0) return '-';
        return val.toLocaleString(undefined, { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: maxDecimals 
        });
    };
    
    const formatAmt = (val: number, maxDecimals = 0) => {
        if (val === 0) return '-';
        return val.toLocaleString(undefined, { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: maxDecimals 
        });
    };

    const formatAsp = (val: number) => {
        if (val === 0) return '-';
        return val.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    const getRemoteFocus = (cellKey: string) => {
        return Object.values(focusedCellsByUser).find(
            (user) => user.clientId !== currentClientId && user.focusedCellKey === cellKey
        );
    };

    return (
        <div className="forecast-grid-container">
            <div className="forecast-table-wrapper">
                <table className="forecast-table">
                    <thead>
                        <tr>
                            <th colSpan={activeIdCols} className={`id-header tier-1 id-border`}>Identifiers</th>
                            {visibleMonths.map(m => {
                                const showPlanVar = monthSpecificPlanVar[m] ?? globalPlanVarVisible;
                                return (
                                    <th key={m} colSpan={showPlanVar ? 9 : 3} className="month-header tier-1">
                                        <div className="month-header-content">
                                            <span className="month-label">{formatMonth(m)}</span>
                                            <div className="month-controls">
                                                <button className="ctrl-btn" onClick={() => onToggleLock(m)}>
                                                    {lockedMonths.has(m) ? 'Unlock' : 'Lock'}
                                                </button>
                                                <button className="ctrl-btn" onClick={() => onToggleMonthPlanVar(m)}>
                                                    {showPlanVar ? 'Hide PV' : 'Show PV'}
                                                </button>
                                                <button className="ctrl-btn hide-month-btn" onClick={() => onToggleMonthVisibility(m)}>
                                                    Hide
                                                </button>
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Row 2: Model, Customer... / Groups (FCST, PLAN, VAR) */}
                        <tr>
                            <th rowSpan={2} className={`id-col sticky-col-1 tier-2 ${lastVisibleId === 'model' ? 'id-border' : ''}`}>Model</th>
                            <th rowSpan={2} className={`id-col sticky-col-2 tier-2 ${lastVisibleId === 'customer' ? 'id-border' : ''}`}>Customer</th>
                            {visibleColumns.standard && <th className={`id-col sticky-col-3 tier-2 ${lastVisibleId === 'standard' ? 'id-border' : ''}`}>Standard</th>}
                            {visibleColumns.application && <th className={`id-col sticky-col-4 tier-2 ${lastVisibleId === 'application' ? 'id-border' : ''}`}>Application</th>}
                            {visibleColumns.location && <th className={`id-col sticky-col-5 tier-2 ${lastVisibleId === 'location' ? 'id-border' : ''}`}>Location</th>}
                            
                            {visibleMonths.map(m => {
                                const showPlanVar = monthSpecificPlanVar[m] ?? globalPlanVarVisible;
                                return (
                                    <React.Fragment key={m}>
                                        <th className={`group-header fcst tier-2 ${!showPlanVar ? 'month-separator' : ''}`} colSpan={3}>FCST</th>
                                        {showPlanVar && (
                                            <>
                                                <th className="group-header plan tier-2" colSpan={3}>PLAN</th>
                                                <th className="group-header var tier-2 month-separator" colSpan={3}>VAR</th>
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                        {/* Row 3: Hide Buttons / Metrics (Qty, ASP, Amt) */}
                        <tr>
                            {/* Model and Customer are merged with rowSpan from Row 2 */}
                            {visibleColumns.standard && (
                                <th className={`id-col sticky-col-3 tier-3 ${lastVisibleId === 'standard' ? 'id-border' : ''}`}>
                                    <button className="hide-btn" onClick={() => onToggleColumn('standard')}>Hide</button>
                                </th>
                            )}
                            {visibleColumns.application && (
                                <th className={`id-col sticky-col-4 tier-3 ${lastVisibleId === 'application' ? 'id-border' : ''}`}>
                                    <button className="hide-btn" onClick={() => onToggleColumn('application')}>Hide</button>
                                </th>
                            )}
                            {visibleColumns.location && (
                                <th className={`id-col sticky-col-5 tier-3 ${lastVisibleId === 'location' ? 'id-border' : ''}`}>
                                    <button className="hide-btn" onClick={() => onToggleColumn('location')}>Hide</button>
                                </th>
                            )}

                            {visibleMonths.map(m => {
                                const showPlanVar = monthSpecificPlanVar[m] ?? globalPlanVarVisible;
                                return (
                                    <React.Fragment key={m}>
                                        <th className="metric-header fcst tier-3">Qty</th>
                                        <th className="metric-header fcst tier-3">ASP</th>
                                        <th className={`metric-header fcst tier-3 ${!showPlanVar ? 'month-separator' : ''}`}>AMT</th>
                                        {showPlanVar && (
                                            <>
                                                <th className="metric-header plan tier-3">Qty</th>
                                                <th className="metric-header plan tier-3">ASP</th>
                                                <th className="metric-header plan tier-3">AMT</th>
                                                <th className="metric-header var tier-3 mid-metric">Qty</th>
                                                <th className="metric-header var tier-3 mid-metric">ASP</th>
                                                <th className="metric-header var tier-3 month-separator">AMT</th>
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const calculateGroupTotals = (node: GroupNode): Record<string, any> => {
                                const nodeTotals: Record<string, any> = {};
                                visibleMonths.forEach(m => {
                                    nodeTotals[m] = { fcstQty: 0, fcstAmt: 0, planQty: 0, planAmt: 0 };
                                });

                                const collectMetrics = (n: GroupNode) => {
                                    if (n.type === 'model') {
                                        const rows = modelGroups[n.name] || [];
                                        rows.forEach(row => {
                                            visibleMonths.forEach(m => {
                                                const md = row.data?.[m] || {};
                                                nodeTotals[m].fcstQty += Number(md.fcstQty || 0);
                                                nodeTotals[m].fcstAmt += Number(md.fcstAmt || 0);
                                                nodeTotals[m].planQty += Number(md.planQty || 0);
                                                nodeTotals[m].planAmt += Number(md.planAmt || 0);
                                            });
                                        });
                                    } else if (n.children) {
                                        n.children.forEach(collectMetrics);
                                    }
                                };

                                collectMetrics(node);
                                
                                // Calculate derived metrics (ASP, VAR)
                                visibleMonths.forEach(m => {
                                    const t = nodeTotals[m];
                                    t.fcstAsp = t.fcstQty > 0 ? t.fcstAmt / t.fcstQty : 0;
                                    t.planAsp = t.planQty > 0 ? t.planAmt / t.planQty : 0;
                                    t.varQty = t.fcstQty - t.planQty;
                                    t.varAmt = t.fcstAmt - t.planAmt;
                                    t.varAsp = t.fcstAsp - t.planAsp;
                                });

                                return nodeTotals;
                            };

                            const renderRows = (nodes: GroupNode[], depth = 0): React.ReactNode[] => {
                                return nodes.flatMap(node => {
                                    const isExpanded = expandedGroups.has(node.id);
                                    const rows: React.ReactNode[] = [];

                                    if (node.type === 'group') {
                                        // Special case: skip 'Ungrouped' folder row but show its children at root level
                                        const isUngrouped = node.id === 'group-ungrouped';
                                        
                                        // For 'Ungrouped', children are shown at root level (depth 0)
                                        // For normal groups, children are shown if expanded
                                        if ((isUngrouped || isExpanded) && node.children) {
                                            rows.push(...renderRows(node.children, isUngrouped ? 0 : depth + 1));
                                        }

                                        if (!isUngrouped) {
                                            const groupTotals = calculateGroupTotals(node);
                                            rows.push(
                                                <tr key={`${node.id}-total`} className={`group-row depth-${depth}`}>
                                                    <td 
                                                        colSpan={activeIdCols} 
                                                        className="group-label-cell" 
                                                        style={{ paddingLeft: `${depth * 20 + 8}px`, background: '#f8fafc' }}
                                                        onClick={() => toggleGroup(node.id)}
                                                    >
                                                        <div className="group-label-content">
                                                            <span className="toggle-icon">{isExpanded ? '[-]' : '[+]'}</span>
                                                            <span className="group-name">{node.name} <strong style={{ marginLeft: '4px' }}>TOTAL</strong></span>
                                                        </div>
                                                    </td>
                                                    {visibleMonths.map(m => {
                                                        const t = groupTotals[m];
                                                        const showPlanVar = monthSpecificPlanVar[m] ?? globalPlanVarVisible;
                                                        return (
                                                            <React.Fragment key={m}>
                                                                <td className="metric-cell fcst group-total">{formatQty(t.fcstQty, 3)}</td>
                                                                <td className="metric-cell fcst group-total">{formatAsp(t.fcstAsp)}</td>
                                                                <td className={`metric-cell fcst group-total ${!showPlanVar ? 'month-separator' : ''}`}>{formatAmt(t.fcstAmt, 2)}</td>
                                                                {showPlanVar && (
                                                                    <>
                                                                        <td className="metric-cell plan group-total">{formatQty(t.planQty, 3)}</td>
                                                                        <td className="metric-cell plan group-total">{formatAsp(t.planAsp)}</td>
                                                                        <td className="metric-cell plan group-total">{formatAmt(t.planAmt, 2)}</td>
                                                                        <td className={`metric-cell var group-total mid-metric ${t.varQty > 0 ? 'pos' : t.varQty < 0 ? 'neg' : ''}`}>{formatQty(t.varQty, 3)}</td>
                                                                        <td className={`metric-cell var group-total mid-metric ${t.varAsp > 0 ? 'pos' : t.varAsp < 0 ? 'neg' : ''}`}>{formatAsp(t.varAsp)}</td>
                                                                        <td className={`metric-cell var group-total month-separator ${t.varAmt > 0 ? 'pos' : t.varAmt < 0 ? 'neg' : ''}`}>{formatAmt(t.varAmt, 2)}</td>
                                                                    </>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        }
                                    } else {
                                        // It's a model leaf
                                        const modelRows = modelGroups[node.name] || [];
                                        modelRows.forEach((row, rowIdx) => {
                                            const originalIdx = data.indexOf(row);
                                            rows.push(
                                                <tr key={`${node.id}-${rowIdx}`}>
                                                    <td className={`id-col sticky-col-1 ${lastVisibleId === 'model' ? 'id-border' : ''}`} style={{ paddingLeft: `${depth * 20 + 8}px` }} title={row.model}>
                                                        {row.model}
                                                    </td>
                                                    <td className={`id-col sticky-col-2 ${lastVisibleId === 'customer' ? 'id-border' : ''}`} title={row.customer}>{row.customer}</td>
                                                    {visibleColumns.standard && <td className={`id-col sticky-col-3 ${lastVisibleId === 'standard' ? 'id-border' : ''}`}>{row.standard}</td>}
                                                    {visibleColumns.application && <td className={`id-col sticky-col-4 ${lastVisibleId === 'application' ? 'id-border' : ''}`}>{row.application || '-'}</td>}
                                                    {visibleColumns.location && <td className={`id-col sticky-col-5 ${lastVisibleId === 'location' ? 'id-border' : ''}`}>{row.location || '-'}</td>}
                                                    
                                                    {visibleMonths.map(m => {
                                                        const mData = row.data[m] || { fcstQty: 0, fcstAsp: 0, fcstAmt: 0, planQty: 0, planAsp: 0, planAmt: 0 };
                                                        const showPlanVar = monthSpecificPlanVar[m] ?? globalPlanVarVisible;
                                                        const isLocked = lockedMonths.has(m);
                                                        const fcstQtyCellKey = buildForecastCellKey(row.id, buildForecastColumnKey(m, 'fcstQty'));
                                                        const fcstAspCellKey = buildForecastCellKey(row.id, buildForecastColumnKey(m, 'fcstAsp'));
                                                        const fcstAmtCellKey = buildForecastCellKey(row.id, buildForecastColumnKey(m, 'fcstAmt'));
                                                        const fcstQtyLockOwner = getCellLockOwner(fcstQtyCellKey);
                                                        const fcstAspLockOwner = getCellLockOwner(fcstAspCellKey);
                                                        const fcstAmtLockOwner = getCellLockOwner(fcstAmtCellKey);
                                                        const fcstQtyFocus = getRemoteFocus(fcstQtyCellKey);
                                                        const fcstAspFocus = getRemoteFocus(fcstAspCellKey);
                                                        const fcstAmtFocus = getRemoteFocus(fcstAmtCellKey);
                                                        
                                                        const fcstQty = mData.fcstQty ?? 0;
                                                        const fcstAsp = mData.fcstAsp ?? 0;
                                                        const fcstAmt = mData.fcstAmt ?? 0;
                                                        const planQty = mData.planQty ?? 0;
                                                        const planAsp = mData.planAsp ?? 0;
                                                        const planAmt = mData.planAmt ?? 0;

                                                        const varQty = fcstQty - planQty;
                                                        const varAsp = fcstAsp - planAsp;
                                                        const varAmt = fcstAmt - planAmt;

                                                        return (
                                                            <React.Fragment key={m}>
                                                                <td
                                                                    className={`metric-cell fcst edit-cell ${isLocked ? 'locked' : ''} ${isCellLocked(fcstQtyCellKey, currentClientId) ? 'locked-remote' : ''}`}
                                                                    style={fcstQtyFocus ? { boxShadow: `inset 0 0 0 2px ${fcstQtyFocus.color}` } : undefined}
                                                                    title={fcstQtyLockOwner && fcstQtyLockOwner.clientId !== currentClientId ? `Locked by ${fcstQtyLockOwner.userName}` : undefined}
                                                                >
                                                                    {isLocked ? formatQty(fcstQty) : (
                                                                        <input 
                                                                            type="number" 
                                                                            step="any"
                                                                            value={fcstQty === 0 ? '' : fcstQty} 
                                                                            disabled={isCellLocked(fcstQtyCellKey, currentClientId)}
                                                                            onFocus={() => { void onCellFocus(row.id, m, 'fcstQty'); }}
                                                                            onBlur={() => { void onCellBlur(row.id, m, 'fcstQty'); }}
                                                                            onChange={(e) => {
                                                                                void (async () => {
                                                                                    const allowed = await onCellEditStart(row.id, m, 'fcstQty');
                                                                                    if (!allowed) return;
                                                                                    onCellEdit(originalIdx, m, 'fcstQty', parseFloat(e.target.value) || 0);
                                                                                })();
                                                                            }}
                                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={`metric-cell fcst edit-cell ${isLocked ? 'locked' : ''} ${isCellLocked(fcstAspCellKey, currentClientId) ? 'locked-remote' : ''}`}
                                                                    style={fcstAspFocus ? { boxShadow: `inset 0 0 0 2px ${fcstAspFocus.color}` } : undefined}
                                                                    title={fcstAspLockOwner && fcstAspLockOwner.clientId !== currentClientId ? `Locked by ${fcstAspLockOwner.userName}` : undefined}
                                                                >
                                                                    {isLocked ? formatAsp(fcstAsp) : (
                                                                        <input 
                                                                            type="number" 
                                                                            step="0.01"
                                                                            value={fcstAsp === 0 ? '' : fcstAsp} 
                                                                            disabled={isCellLocked(fcstAspCellKey, currentClientId)}
                                                                            onFocus={() => { void onCellFocus(row.id, m, 'fcstAsp'); }}
                                                                            onBlur={() => { void onCellBlur(row.id, m, 'fcstAsp'); }}
                                                                            onChange={(e) => {
                                                                                void (async () => {
                                                                                    const allowed = await onCellEditStart(row.id, m, 'fcstAsp');
                                                                                    if (!allowed) return;
                                                                                    onCellEdit(originalIdx, m, 'fcstAsp', parseFloat(e.target.value) || 0);
                                                                                })();
                                                                            }}
                                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={`metric-cell fcst edit-cell ${isLocked ? 'locked' : ''} ${!showPlanVar ? 'month-separator' : ''} ${isCellLocked(fcstAmtCellKey, currentClientId) ? 'locked-remote' : ''}`}
                                                                    style={fcstAmtFocus ? { boxShadow: `inset 0 0 0 2px ${fcstAmtFocus.color}` } : undefined}
                                                                    title={fcstAmtLockOwner && fcstAmtLockOwner.clientId !== currentClientId ? `Locked by ${fcstAmtLockOwner.userName}` : undefined}
                                                                >
                                                                    {isLocked ? formatAmt(fcstAmt) : (
                                                                        <input 
                                                                            type="number" 
                                                                            step="0.01"
                                                                            value={fcstAmt === 0 ? '' : fcstAmt} 
                                                                            disabled={isCellLocked(fcstAmtCellKey, currentClientId)}
                                                                            onFocus={() => { void onCellFocus(row.id, m, 'fcstAmt'); }}
                                                                            onBlur={() => { void onCellBlur(row.id, m, 'fcstAmt'); }}
                                                                            onChange={(e) => {
                                                                                void (async () => {
                                                                                    const allowed = await onCellEditStart(row.id, m, 'fcstAmt');
                                                                                    if (!allowed) return;
                                                                                    onCellEdit(originalIdx, m, 'fcstAmt', parseFloat(e.target.value) || 0);
                                                                                })();
                                                                            }}
                                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                                        />
                                                                    )}
                                                                </td>
                                                                
                                                                {showPlanVar && (
                                                                    <>
                                                                        <td className={`metric-cell plan ${isLocked ? 'locked' : ''}`}>{formatQty(planQty)}</td>
                                                                        <td className={`metric-cell plan ${isLocked ? 'locked' : ''}`}>{formatAsp(planAsp)}</td>
                                                                        <td className={`metric-cell plan ${isLocked ? 'locked' : ''}`}>{formatAmt(planAmt, 2)}</td>
                                                                        
                                                                        <td className={`metric-cell var mid-metric ${varQty > 0 ? 'pos' : varQty < 0 ? 'neg' : ''} ${isLocked ? 'locked' : ''}`}>{formatQty(varQty, 3)}</td>
                                                                        <td className={`metric-cell var mid-metric ${varAsp > 0 ? 'pos' : varAsp < 0 ? 'neg' : ''} ${isLocked ? 'locked' : ''}`}>{formatAsp(varAsp)}</td>
                                                                        <td className={`metric-cell var month-separator ${varAmt > 0 ? 'pos' : varAmt < 0 ? 'neg' : ''} ${isLocked ? 'locked' : ''}`}>{formatAmt(varAmt, 2)}</td>
                                                                    </>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        });
                                    }
                                    return rows;
                                });
                            };

                            return renderRows(hierarchy);
                        })()}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row">
                            <td colSpan={activeIdCols} className="totals-label">TOTALS</td>
                            {visibleMonths.map(m => {
                                const t = totals[m];
                                const showPlanVar = monthSpecificPlanVar[m] ?? globalPlanVarVisible;
                                return (
                                    <React.Fragment key={m}>
                                        <td className="metric-cell fcst total">{formatQty(t.fcstQty, 3)}</td>
                                        <td className="metric-cell fcst total">{formatAsp(t.fcstAsp)}</td>
                                        <td className={`metric-cell fcst total ${!showPlanVar ? 'month-separator' : ''}`}>{formatAmt(t.fcstAmt, 2)}</td>
                                        {showPlanVar && (
                                            <>
                                                <td className="metric-cell plan total">{formatQty(t.planQty, 3)}</td>
                                                <td className="metric-cell plan total">{formatAsp(t.planAsp)}</td>
                                                <td className="metric-cell plan total">{formatAmt(t.planAmt, 2)}</td>
                                                <td className={`metric-cell var total mid-metric ${t.varQty > 0 ? 'pos' : t.varQty < 0 ? 'neg' : ''}`}>{formatQty(t.varQty, 3)}</td>
                                                <td className={`metric-cell var total mid-metric ${t.varAsp > 0 ? 'pos' : t.varAsp < 0 ? 'neg' : ''}`}>{formatAsp(t.varAsp)}</td>
                                                <td className={`metric-cell var total month-separator ${t.varAmt > 0 ? 'pos' : t.varAmt < 0 ? 'neg' : ''}`}>{formatAmt(t.varAmt, 2)}</td>
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <style jsx>{`
                .forecast-grid-container {
                    width: 100%;
                    overflow: hidden;
                    border-radius: var(--radius-lg);
                    background: white;
                    border: 1px solid var(--color-border);
                }
                .forecast-table-wrapper {
                    overflow-x: auto;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .forecast-table {
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 11px;
                    width: max-content;
                    table-layout: fixed; /* Forced fixed layout to respect widths */
                }
                .forecast-table th, .forecast-table td {
                    padding: 4px 6px;
                    border-right: 1px solid var(--color-border-light);
                    border-bottom: 1px solid var(--color-border-light);
                    white-space: nowrap;
                    height: 32px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Groups row styling */
                .group-row {
                    background: #f8fafc;
                    cursor: pointer;
                }
                .group-row:hover { background: #f1f5f9; }
                .group-label-cell {
                    font-weight: 700;
                    color: #1e293b;
                    background: inherit !important;
                    z-index: 10 !important; /* Above other rows but below headers */
                }
                .group-label-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .group-name { font-size: 12px; }
                .group-total {
                    font-weight: 700;
                    background: #fdfdfd;
                }

                .toggle-icon { width: 12px; font-size: 9px; color: #94a3b8; }

                /* Separator Logic */
                .month-separator {
                    border-right: 1.5px solid #94a3b8 !important;
                }
                
                .id-border {
                    border-right: 1.5px solid #64748b !important;
                }

                .id-col, .id-header {
                    background: white;
                }
                .id-header {
                    background: #f1f5f9;
                    font-weight: 700;
                    color: var(--color-text);
                    text-align: center;
                }
                
                .tier-1 { height: 48px; }
                .tier-2 { height: 28px; }
                .tier-3 { height: 28px; }

                /* Explicit Widths for Identifiers */
                .sticky-col-1 { width: 140px; min-width: 140px; font-weight: 600; color: var(--color-text); }
                .sticky-col-2 { width: 120px; min-width: 120px; }
                .sticky-col-3 { width: 100px; min-width: 100px; }
                .sticky-col-4 { width: 100px; min-width: 100px; }
                .sticky-col-5 { width: 90px; min-width: 90px; }
                
                tr:hover td.id-col {
                    background: var(--color-surface-hover) !important;
                }

                .month-header {
                    background: #f3f4f6;
                    font-weight: 600;
                    text-align: center;
                    color: var(--color-text);
                    font-size: 10px;
                    border-right: 1.5px solid #94a3b8 !important;
                }
                .month-header-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    padding: 2px 0;
                }
                .month-label {
                    font-weight: 700;
                    font-size: 11px;
                    color: var(--color-text);
                }
                .month-controls {
                    display: flex;
                    gap: 4px;
                }
                .ctrl-btn {
                    font-size: 8px;
                    padding: 1px 4px;
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: 3px;
                    cursor: pointer;
                    color: var(--color-text-secondary);
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .ctrl-btn:hover {
                    background: var(--color-surface-hover);
                    border-color: var(--color-primary-light);
                }
                .hide-month-btn {
                    color: var(--color-danger);
                    border-color: #fca5a5;
                }
                .hide-month-btn:hover {
                    background: #fee2e2;
                }

                .group-header {
                    font-size: 9px;
                    font-weight: 700;
                    text-align: center;
                    background: #f8fafc;
                }
                .group-header.fcst { color: var(--color-primary); background: #f5f3ff; }
                .group-header.plan { color: var(--color-text-muted); background: #f8fafc; }
                .group-header.var { color: var(--color-text-secondary); background: #f1f5f9; }

                /* Explicit Width for Metrics (Excel size 8 ~70px) */
                .metric-header {
                    font-size: 8px;
                    font-weight: 700;
                    text-align: right;
                    background: #ffffff;
                    color: var(--color-text-light);
                    width: 70px;
                    min-width: 70px;
                }
                .metric-header.mid-metric { border-right: 1px solid var(--color-border-light); }

                .metric-cell {
                    text-align: right;
                    font-family: 'Inter', monospace;
                    font-size: 10px;
                    width: 70px;
                    min-width: 70px;
                }
                .metric-cell.fcst { color: var(--color-primary); }
                .metric-cell.plan { color: var(--color-text-muted); }
                .metric-cell.var { font-weight: 500; background: #fafafa; }
                .metric-cell.var.pos { color: var(--color-success); }
                .metric-cell.var.neg { color: var(--color-danger); }
                .metric-cell.mid-metric { border-right: 1px solid var(--color-border-light); }

                .metric-cell.edit-cell {
                    padding: 0;
                }
                .metric-cell.edit-cell input {
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    text-align: right;
                    padding: 2px 4px;
                    font-family: inherit;
                    font-size: inherit;
                    color: inherit;
                    border: 1px solid transparent;
                    outline: none;
                    transition: all 0.1s;
                }
                .metric-cell.edit-cell input:hover {
                    background: #f8fafc;
                    border-color: #e2e8f0;
                }
                .metric-cell.edit-cell input:focus {
                    background: white;
                    border-color: var(--color-primary);
                    box-shadow: inset 0 0 0 1px var(--color-primary);
                }
                /* Hide arrows on number inputs */
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }

                .metric-cell.locked {
                    background-color: #f9fafb !important;
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .hide-btn {
                    font-size: 8px;
                    padding: 0px 4px;
                    background: #fee2e2;
                    color: #b91c1c;
                    border: 1px solid #fca5a5;
                    border-radius: 3px;
                    cursor: pointer;
                }
                .hide-btn:hover { background: #fecaca; }

                /* Totals Row Styles */
                .totals-row { font-weight: 700; }
                .totals-row td {
                    background: #eef2f7;
                    border-top: 2px solid #cbd5e1;
                }
                .totals-label {
                    background: #eef2f7 !important;
                    color: var(--color-text);
                    text-align: center;
                    font-size: 10px;
                    letter-spacing: 0.5px;
                }
                .metric-cell.total {
                    background: #eef2f7 !important;
                    font-weight: 700;
                    color: var(--color-text);
                }
            `}</style>
        </div>
    );
}
