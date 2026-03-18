'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
    'Micro Display': '#10B981',
    'Mobile TV': '#4F46E5',
    'Other': '#9CA3AF',
};
const TOP_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'];

function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
}
function fmtFull(n: number) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatMonth(ym: string) {
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} '${y.slice(2)}`;
}

interface Order {
    id?: string;
    customer: string; product: string; fg_code: string; order_no: string;
    price: number; qty: number; amount: number; req_date: string; category: string; remark: string;
    is_custom?: boolean;
}

export default function BacklogPage() {
    const [byCategory, setByCategory] = useState<any[]>([]);
    const [byCustomer, setByCustomer] = useState<any[]>([]);
    const [byProduct, setByProduct] = useState<any[]>([]);
    const [byMonth, setByMonth] = useState<any[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchCust, setSearchCust] = useState('');

    function loadData() {
        setLoading(true);
        Promise.all([
            fetch('/api/backlog?view=by_category').then(r => r.json()),
            fetch('/api/backlog?view=by_customer').then(r => r.json()),
            fetch('/api/backlog?view=by_product').then(r => r.json()),
            fetch('/api/backlog?view=by_month').then(r => r.json()),
            fetch('/api/backlog?view=orders').then(r => r.json()),
            fetch('/api/backlog?view=summary').then(r => r.json()),
        ]).then(([cat, cust, prod, mo, ord, sum]) => {
            setByCategory(cat);
            setByCustomer(cust);
            setByProduct(prod.filter((p: any) => p.product !== 'OTHER'));
            setByMonth(mo.filter((m: any) => m.month >= '2026'));
            setOrders(ord);
            setSummary(sum);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    const filteredOrders = searchCust
        ? orders.filter(o => o.customer?.toLowerCase().includes(searchCust.toLowerCase()) || o.product?.toLowerCase().includes(searchCust.toLowerCase()))
        : orders;

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Backlog</div>
                    <div className="page-header-sub">Open orders and delivery schedule</div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading backlog data…</div>
            ) : (
                <>
                    {/* KPI Row */}
                    <div className="kpi-grid" style={{ marginBottom: 24 }}>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-primary-soft)' }}>💼</div>
                            <div className="kpi-label">Total Backlog</div>
                            <div className="kpi-value" style={{ fontSize: 26, color: 'var(--color-primary)' }}>{fmt(summary?.total || 0)}</div>
                            <div className="kpi-change">{fmtFull(summary?.total || 0)}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-success-soft)' }}>📋</div>
                            <div className="kpi-label">Open Orders</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{summary?.orderCount || 0}</div>
                            <div className="kpi-change">order lines</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-warning-soft)' }}>🏢</div>
                            <div className="kpi-label">Customers</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{summary?.uniqueCustomers || 0}</div>
                            <div className="kpi-change">in backlog</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'var(--color-info-soft)' }}>📦</div>
                            <div className="kpi-label">Products</div>
                            <div className="kpi-value" style={{ fontSize: 26 }}>{summary?.uniqueProducts || 0}</div>
                            <div className="kpi-change">unique SKUs</div>
                        </div>
                    </div>

                    {/* Delivery Schedule + Category Donut */}
                    <div className="section-grid" style={{ marginBottom: 20 }}>
                        {/* Monthly Delivery Schedule */}
                        <div className="card" style={{ flex: 2 }}>
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Delivery Schedule</div>
                                    <div className="card-subtitle">Backlog amount by requested delivery month (2026+)</div>
                                </div>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={byMonth} margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                                            tickFormatter={formatMonth} />
                                        <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(v: any) => fmtFull(Number(v))} labelFormatter={(ym: any) => formatMonth(String(ym))}
                                            contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                                        <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} name="Backlog Amount" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Donut */}
                        <div className="card" style={{ flex: 1 }}>
                            <div className="card-header">
                                <div className="card-title">By Category</div>
                                <div className="card-subtitle">Share of backlog value</div>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={byCategory} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="total" nameKey="category">
                                            {byCategory.map((entry: any, i: number) => (
                                                <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || TOP_COLORS[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: any) => fmtFull(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {byCategory.map(c => (
                                <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--color-border-light)', fontSize: 12 }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>{c.category}</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(c.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Customers + Top Products */}
                    <div className="section-grid" style={{ marginBottom: 20 }}>
                        <div className="card">
                            <div className="card-header"><div className="card-title">Backlog by Customer</div></div>
                            {byCustomer.map((c, i) => {
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
                                            <div style={{ height: '100%', width: `${pct}%`, background: TOP_COLORS[i % TOP_COLORS.length], borderRadius: 3 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="card">
                            <div className="card-header"><div className="card-title">Backlog by Product</div><div className="card-subtitle">Excluding OTHER</div></div>
                            {byProduct.map((p, i) => {
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
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.total)}</span>
                                        </div>
                                        <div style={{ height: 5, background: 'var(--color-border-light)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: catColor, borderRadius: 3 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Open Orders</div>
                                <div className="card-subtitle">{filteredOrders.length} of {orders.length} orders</div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="search-input-wrap" style={{ width: 260 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text" placeholder="Filter by customer or product…"
                                        value={searchCust} onChange={e => setSearchCust(e.target.value)}
                                    />
                                </div>
                                <Link href="/backlog/new" className="btn btn-primary">
                                    + Add Order
                                </Link>
                            </div>
                        </div>
                        <div className="table-wrapper" style={{ margin: '0 -24px', padding: '0 24px' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Order No.</th>
                                        <th style={{ textAlign: 'right' }}>Qty</th>
                                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Req. Date</th>
                                        <th>Remark</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((o, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500, fontSize: 13 }}>
                                                {o.customer}
                                                {o.is_custom && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--color-primary-soft)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: 4 }}>Custom</span>}
                                            </td>
                                            <td><span style={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>{o.product}</span></td>
                                            <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: (CATEGORY_COLORS[o.category] || '#9CA3AF') + '22', color: CATEGORY_COLORS[o.category] || '#6B7280', fontWeight: 500 }}>{o.category}</span></td>
                                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{o.order_no}</td>
                                            <td style={{ textAlign: 'right', fontSize: 12 }}>{o.qty?.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', fontSize: 12 }}>{fmtFull(o.price || 0)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--color-primary)' }}>{fmtFull(o.amount || 0)}</td>
                                            <td><span style={{ fontSize: 12, padding: '2px 7px', borderRadius: 6, background: '#FEF3C7', color: '#D97706', fontWeight: 500 }}>{formatMonth(o.req_date)}</span></td>
                                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.4 }}>{o.remark || '—'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                    <Link href={`/backlog/edit/${o.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
