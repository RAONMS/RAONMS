'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Meeting {
    id: number; client_id: number; company_name: string; region: string;
    date: string; attendees: string; agenda: string; notes: string; follow_up: string;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    function load() {
        setLoading(true);
        fetch(`/api/meetings`)
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setMeetings(Array.isArray(data) ? data : []);
                setError(null);
            })
            .catch(err => {
                console.error('Meetings load error:', err);
                setError(err.message || 'Failed to load meeting notes');
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function deleteMeet(id: number) {
        if (!confirm('Delete this meeting note?')) return;
        await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
        load();
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Meeting Notes</div>
                    <div className="page-header-sub">All meeting records across all clients</div>
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
                    {loading ? '…' : `${meetings.filter(m => m.company_name.toLowerCase().includes(searchQuery.toLowerCase())).length} record(s)`}
                </span>
            </div>

            {loading ? (
                <div style={{ padding: 40, color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading…</div>
            ) : error ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ color: '#EF4444', marginBottom: 12 }}>{error}</div>
                    <button className="btn btn-secondary" onClick={() => load()}>Retry</button>
                </div>
            ) : meetings.length === 0 ? (
                <div className="empty-state card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    <p>No meeting notes yet. <Link href="/customers" style={{ color: 'var(--color-primary)' }}>Go to a customer</Link> to add one.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {meetings.filter(m => m.company_name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                        <div key={m.id} className="card card-sm">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                        <Link href={`/customers/${m.client_id}`} style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)', textDecoration: 'none' }}>
                                            {m.company_name}
                                        </Link>
                                        {m.region && <span className="badge badge-region">{m.region}</span>}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                                        📅 {formatDate(m.date)}
                                        {m.attendees && <span style={{ marginLeft: 12 }}>👥 {m.attendees}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <Link href={`/customers/${m.client_id}`} className="btn btn-ghost btn-sm">View Customer</Link>
                                    <button className="btn btn-danger btn-sm" onClick={() => deleteMeet(m.id)}>Delete</button>
                                </div>
                            </div>

                            {m.agenda && (
                                <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Agenda</div>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{m.agenda}</div>
                                </div>
                            )}
                            {m.notes && (
                                <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Notes</div>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{m.notes}</div>
                                </div>
                            )}
                            {m.follow_up && (
                                <div style={{ background: 'var(--color-warning-soft)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginTop: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#D97706', marginBottom: 3 }}>⚡ Follow-up</div>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{m.follow_up}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
