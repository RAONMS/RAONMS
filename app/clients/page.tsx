'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Client {
    id: number;
    company_name: string;
    website: string;
    region: string;
    contact_name: string;
    email: string;
    phone: string;
    status: string;
    created_at: string;
}

const REGIONS = ['APAC', 'EMEA', 'NA', 'LATAM', 'MEA', 'Other'];
const STATUSES = ['Active', 'Prospect', 'Inactive'];

function statusBadge(status: string) {
    const cls = status === 'Active' ? 'badge-active' : status === 'Prospect' ? 'badge-prospect' : 'badge-inactive';
    return <span className={`badge ${cls}`}>{status}</span>;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const router = useRouter();

    function fetchClients() {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (regionFilter) params.set('region', regionFilter);
        if (statusFilter) params.set('status', statusFilter);
        fetch(`/api/clients?${params}`).then(r => r.json()).then(setClients).finally(() => setLoading(false));
    }

    useEffect(() => { fetchClients(); }, [search, regionFilter, statusFilter]);

    async function deleteClient(id: number, name: string) {
        if (!confirm(`Delete "${name}"? This will also delete all their interactions and meeting notes.`)) return;
        await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        fetchClients();
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Clients</div>
                    <div className="page-header-sub">{clients.length} client{clients.length !== 1 ? 's' : ''} registered</div>
                </div>
                <Link href="/clients/new" className="btn btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Client
                </Link>
            </div>

            <div className="filter-bar">
                <div className="search-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search company, contact, email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        id="client-search"
                    />
                </div>
                <select className="form-select" style={{ width: 140 }} value={regionFilter} onChange={e => setRegionFilter(e.target.value)} id="region-filter">
                    <option value="">All Regions</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} id="status-filter">
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Website</th>
                            <th>Region</th>
                            <th>Contact</th>
                            <th>Status</th>
                            <th>Added</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Loading…</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan={7}>
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                    <p>No clients found. <Link href="/clients/new" style={{ color: 'var(--color-primary)' }}>Add your first client.</Link></p>
                                </div>
                            </td></tr>
                        ) : clients.map(c => (
                            <tr key={c.id}>
                                <td className="col-company">
                                    <Link href={`/clients/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="col-company">{c.company_name}</Link>
                                </td>
                                <td>
                                    {c.website ? (
                                        <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontSize: 13 }}>
                                            {c.website}
                                        </a>
                                    ) : <span style={{ color: 'var(--color-text-light)' }}>—</span>}
                                </td>
                                <td>{c.region ? <span className="badge badge-region">{c.region}</span> : <span style={{ color: 'var(--color-text-light)' }}>—</span>}</td>
                                <td style={{ fontSize: 13 }}>{c.contact_name || <span style={{ color: 'var(--color-text-light)' }}>—</span>}</td>
                                <td>{statusBadge(c.status)}</td>
                                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <Link href={`/clients/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                                        <button
                                            onClick={() => deleteClient(c.id, c.company_name)}
                                            className="btn btn-danger btn-sm"
                                        >Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
