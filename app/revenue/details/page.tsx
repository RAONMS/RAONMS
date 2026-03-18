'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface YearlyData {
    customer: string;
    total: number;
    [year: string]: any; // string year -> number amount
}

interface RevenueResponse {
    years: string[];
    data: YearlyData[];
}

export default function RevenueDetailsPage() {
    const [stats, setStats] = useState<RevenueResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/revenue?view=yearly_by_customer')
            .then(r => r.json())
            .then(setStats)
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    const filteredData = stats?.data.filter(row =>
        row.customer.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Revenue Details</div>
                    <div className="page-header-sub">Yearly breakdown for all customers based on shipment data</div>
                </div>
                <Link href="/revenue" className="btn btn-ghost">← Back to Overview</Link>
            </div>

            <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 300 }}>
                    <div style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-text-muted)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <input
                        type="search"
                        className="form-input"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 36, width: '100%' }}
                    />
                </div>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {loading ? '…' : `${filteredData.length} customer(s)`}
                </span>
            </div>

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ padding: 40, color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading table...</div>
                ) : !stats || stats.data.length === 0 ? (
                    <div style={{ padding: 40, color: 'var(--color-text-muted)', textAlign: 'center' }}>No revenue data found.</div>
                ) : (
                    <table className="table" style={{ width: '100%', minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, minWidth: 200 }}>Customer</th>
                                {stats.years.map(y => (
                                    <th key={y} style={{ textAlign: 'right' }}>{y}</th>
                                ))}
                                <th style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(row => (
                                <tr key={row.customer}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, fontWeight: 500 }}>
                                        {row.customer}
                                    </td>
                                    {stats.years.map(y => (
                                        <td key={y} style={{ textAlign: 'right', color: row[y] ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                            {row[y] ? `$${row[y].toLocaleString()}` : '-'}
                                        </td>
                                    ))}
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                                        ${row.total.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={stats.years.length + 2} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                        No customers match your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredData.length > 0 && (
                            <tfoot>
                                <tr style={{ background: 'var(--color-bg-subtle)' }}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--color-bg-subtle)', zIndex: 1, fontWeight: 600 }}>Total (Filtered)</td>
                                    {stats.years.map(y => {
                                        const yearTotal = filteredData.reduce((sum, row) => sum + (row[y] || 0), 0);
                                        return (
                                            <td key={y} style={{ textAlign: 'right', fontWeight: 600 }}>
                                                ${yearTotal.toLocaleString()}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                                        ${filteredData.reduce((sum, row) => sum + row.total, 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
            </div>
        </>
    );
}
