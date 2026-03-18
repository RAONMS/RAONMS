'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Interaction {
    id: number; client_id: number; company_name: string; region: string;
    date: string; attendee: string; sales_topic: string; fae_topic: string; notes: string;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function InteractionsPage() {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    function load() {
        setLoading(true);
        fetch(`/api/interactions`)
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setInteractions(Array.isArray(data) ? data : []);
                setError(null);
            })
            .catch(err => {
                console.error('Interactions load error:', err);
                setError(err.message || 'Failed to load interactions');
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function deleteIx(id: number) {
        if (!confirm('Delete this interaction?')) return;
        await fetch(`/api/interactions/${id}`, { method: 'DELETE' });
        load();
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Interactions</div>
                    <div className="page-header-sub">All client interactions, most recent first</div>
                </div>
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
                    {loading ? '…' : `${interactions.filter(ix => ix.company_name.toLowerCase().includes(searchQuery.toLowerCase())).length} interaction(s)`}
                </span>
            </div>

            {loading ? (
                <div style={{ padding: 40, color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading…</div>
            ) : error ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ color: '#EF4444', marginBottom: 12 }}>{error}</div>
                    <button className="btn btn-secondary" onClick={() => load()}>Retry</button>
                </div>
            ) : interactions.length === 0 ? (
                <div className="empty-state card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    <p>No interactions recorded yet. <Link href="/customers" style={{ color: 'var(--color-primary)' }}>Go to a customer</Link> to add one.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="interaction-list" style={{ padding: '0 24px' }}>
                        {interactions.filter(ix => ix.company_name.toLowerCase().includes(searchQuery.toLowerCase())).map(ix => (
                            <div key={ix.id} className="interaction-item">
                                <Link href={`/customers/${ix.client_id}`} style={{ textDecoration: 'none' }}>
                                    <div className="interaction-avatar">{getInitials(ix.company_name)}</div>
                                </Link>
                                <div className="interaction-body">
                                    <div className="interaction-header">
                                        <Link href={`/customers/${ix.client_id}`} className="interaction-company">{ix.company_name}</Link>
                                        {ix.region && <span className="badge badge-region">{ix.region}</span>}
                                        <span className="interaction-date">{formatDate(ix.date)}</span>
                                        <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => deleteIx(ix.id)}>Delete</button>
                                    </div>
                                    {ix.attendee && <div className="interaction-meta">👤 {ix.attendee}</div>}
                                    <div className="interaction-topics">
                                        {ix.sales_topic && (
                                            <span className="topic-tag topic-sales">💼 {ix.sales_topic.length > 80 ? ix.sales_topic.slice(0, 80) + '…' : ix.sales_topic}</span>
                                        )}
                                        {ix.fae_topic && (
                                            <span className="topic-tag topic-fae">⚙️ {ix.fae_topic.length > 80 ? ix.fae_topic.slice(0, 80) + '…' : ix.fae_topic}</span>
                                        )}
                                    </div>
                                    {ix.notes && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{ix.notes}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
