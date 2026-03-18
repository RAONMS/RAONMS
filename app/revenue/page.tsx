'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
    'Mobile TV': '#4F46E5',
    'Micro Display': '#10B981',
    'Materials': '#F59E0B',
    'Other': '#9CA3AF',
};
const TOP_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
}
function fmtFull(n: number) {
    if (typeof n !== 'number' || isNaN(n)) return '$0';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const CURRENT_YEAR = new Date().getFullYear().toString();
const YEARS = Array.from({ length: 7 }, (_, i) => String(2026 - i));

export default function RevenuePage() {
    const [yearFrom, setYearFrom] = useState('2020');
    const [yearTo, setYearTo] = useState('2026');

    const [yearly, setYearly] = useState<any[]>([]);
    const [monthly, setMonthly] = useState<any[]>([]);
    const [byCustomer, setByCustomer] = useState<any[]>([]);
    const [byProduct, setByProduct] = useState<any[]>([]);
    const [byCategory, setByCategory] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        const p = `year_from=${yearFrom}&year_to=${yearTo}`;
        Promise.all([
            fetch(`/api/revenue?view=yearly&${p}`).then(r => r.json()),
            fetch(`/api/revenue?view=monthly&${p}`).then(r => r.json()),
            fetch(`/api/revenue?view=by_customer&${p}`).then(r => r.json()),
            fetch(`/api/revenue?view=by_product&${p}`).then(r => r.json()),
            fetch(`/api/revenue?view=by_category&${p}`).then(r => r.json()),
            fetch(`/api/revenue?view=summary&${p}`).then(r => r.json()),
        ]).then(([yr, mo, cust, prod, cat, sum]) => {
            if (yr.error || mo.error || cust.error || prod.error || cat.error || sum.error) {
                throw new Error(yr.error || mo.error || cust.error || prod.error || cat.error || sum.error);
            }
            setYearly(Array.isArray(yr) ? yr : []);
            setMonthly(Array.isArray(mo) ? mo.slice(-24) : []);
            setByCustomer(Array.isArray(cust) ? cust.slice(0, 12) : []);
            setByProduct(Array.isArray(prod) ? prod.filter((p: any) => p.product !== 'OTHER').slice(0, 12) : []);
            setByCategory(Array.isArray(cat) ? cat : []);
            setSummary(sum);
            setError(null);
        }).catch(err => {
            console.error('Revenue load error:', err);
            setError(err.message || 'Failed to load revenue data');
        }).finally(() => setLoading(false));
    }, [yearFrom, yearTo]);

    useEffect(() => { load(); }, [load]);

    const categories = [...new Set(yearly.flatMap(y => Object.keys(y).filter(k => !['year', 'total'].includes(k))))];

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Revenue</div>
                    <div className="page-header-sub">Shipment revenue analysis from historical data</div>
                </div>
                {/* Year Range Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select className="form-select" style={{ width: 100 }} value={yearFrom} onChange={e => setYearFrom(e.target.value)} id="year-from">
                        {YEARS.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>to</span>
                    <select className="form-select" style={{ width: 100 }} value={yearTo} onChange={e => setYearTo(e.target.value)} id="year-to">
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading revenue data…</div>
            ) : error ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ color: '#EF4444', marginBottom: 12 }}>{error}</div>
                    <button className="btn btn-secondary" onClick={() => load()}>Retry</button>
                </div>
            ) : (
                <>
                    {/* KPI Row */}
                    <div className="kpi-grid" style={{ marginBottom: 24 }}>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-primary-soft)' }}>💰</div>
                            <div className="kpi-label">Total Revenue</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{fmt(summary?.totalRevenue || 0)}</div>
                            <div className="kpi-change">{fmtFull(summary?.totalRevenue || 0)}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-success-soft)' }}>📦</div>
                            <div className="kpi-label">Units Shipped</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{((summary?.totalQty || 0) / 1_000_000).toFixed(1)}M</div>
                            <div className="kpi-change">{(summary?.totalQty || 0).toLocaleString()} units</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-warning-soft)' }}>🏢</div>
                            <div className="kpi-label">Unique Customers</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{summary?.uniqueCustomers || 0}</div>
                            <div className="kpi-change">in selected period</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-info-soft)' }}>🔧</div>
                            <div className="kpi-label">Products Sold</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{summary?.uniqueProducts || 0}</div>
                            <div className="kpi-change">unique SKUs</div>
                        </div>
                    </div>

                    {/* Yearly Revenue by Category */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <div>
                                <div className="card-title">Annual Revenue by Category</div>
                                <div className="card-subtitle">Year-over-year breakdown, stacked by product category</div>
                            </div>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={yearly} margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v: any, name: any) => [fmtFull(Number(v)), String(name)]}
                                        contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    {categories.map(cat => (
                                        <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || '#6B7280'} radius={cat === categories[categories.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monthly + Top Customers */}
                    <div className="section-grid" style={{ marginBottom: 20 }}>
                        {/* Monthly Trend */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Monthly Revenue (last 24 months)</div>
                                    <div className="card-subtitle">Monthly shipment revenue trend</div>
                                </div>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={monthly} margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                                            tickFormatter={v => v.slice(2)} interval={2} />
                                        <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(v: any) => fmtFull(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                                        <Area type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Donut */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Revenue by Category</div>
                                    <div className="card-subtitle">Share of total revenue per category</div>
                                </div>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={byCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="total" nameKey="category">
                                            {byCategory.map((entry, i) => (
                                                <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || TOP_COLORS[i % TOP_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: any) => fmtFull(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Top Customers & Top Products */}
                    <div className="section-grid" style={{ marginBottom: 0 }}>
                        {/* Top Customers */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Top Customers</div>
                                <div className="card-subtitle">By total revenue in selected period</div>
                            </div>
                            <div>
                                {byCustomer.slice(0, 10).map((c, i) => {
                                    const maxAmt = byCustomer[0]?.total || 1;
                                    const pct = (c.total / maxAmt) * 100;
                                    return (
                                        <div key={c.customer} style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, fontWeight: 500 }}>
                                                    <span style={{ color: 'var(--color-text-muted)', marginRight: 6, fontSize: 11 }}>#{i + 1}</span>
                                                    {c.customer}
                                                </span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{fmt(c.total)}</span>
                                            </div>
                                            <div style={{ height: 5, background: 'var(--color-border-light)', borderRadius: 3 }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: TOP_COLORS[i % TOP_COLORS.length], borderRadius: 3, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Top Products</div>
                                <div className="card-subtitle">By revenue (excluding OTHER), selected period</div>
                            </div>
                            <div>
                                {byProduct.slice(0, 10).map((p, i) => {
                                    const maxAmt = byProduct[0]?.total || 1;
                                    const pct = (p.total / maxAmt) * 100;
                                    const catColor = CATEGORY_COLORS[p.category] || '#9CA3AF';
                                    return (
                                        <div key={p.product} style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>#{i + 1}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.product}</span>
                                                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: catColor + '22', color: catColor, fontWeight: 500 }}>{p.category}</span>
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{fmt(p.total)}</span>
                                            </div>
                                            <div style={{ height: 5, background: 'var(--color-border-light)', borderRadius: 3 }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: catColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
