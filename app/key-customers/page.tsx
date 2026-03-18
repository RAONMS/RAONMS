'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Client {
    id: number;
    company_name: string;
    website: string;
    region: string;
    contact_name: string;
    email: string;
    phone: string;
    status: string;
    notes: string;
    is_key_customer: number;
}
interface Interaction {
    id: number; client_id: number; date: string; attendee: string;
    sales_topic: string; fae_topic: string; notes: string;
}
interface Meeting {
    id: number; client_id: number; date: string; attendees: string;
    agenda: string; notes: string; follow_up: string;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function statusBadge(s: string) {
    const cls = s === 'Active' ? 'badge-active' : s === 'Prospect' ? 'badge-prospect' : 'badge-inactive';
    return <span className={`badge ${cls}`}>{s}</span>;
}
function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

interface CustomerCardProps {
    client: Client;
    interactions: Interaction[];
    meetings: Meeting[];
    onRemoveKey: () => void;
}

function CustomerCard({ client, interactions, meetings, onRemoveKey }: CustomerCardProps) {
    const recentInteractions = interactions.slice(0, 3);
    const latestMeeting = meetings[0] || null;

    return (
        <div className="card" style={{
            border: '1px solid #FDE68A',
            boxShadow: '0 2px 8px rgba(245,158,11,0.08)',
        }}>
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                        color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 16, flexShrink: 0, border: '2px solid #FDE68A',
                    }}>{getInitials(client.company_name)}</div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <Link href={`/customers/${client.id}`} style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text)', textDecoration: 'none' }}>
                                {client.company_name}
                            </Link>
                            <span style={{ fontSize: 14, color: '#F59E0B' }}>★</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {client.region && <span className="badge badge-region">{client.region}</span>}
                            {statusBadge(client.status)}
                            {client.website && (
                                <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                    target="_blank" rel="noopener"
                                    style={{ fontSize: 12, color: 'var(--color-primary)' }}>🌐 {client.website}</a>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/customers/${client.id}`} className="btn btn-ghost btn-sm">View →</Link>
                    <button
                        onClick={onRemoveKey}
                        className="btn btn-sm"
                        style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}
                        title="Remove from Key Customers"
                    >☆ Unstar</button>
                </div>
            </div>

            {/* Contact & Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 20px', marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--color-border-light)' }}>
                {[
                    ['Primary Contact', client.contact_name || '—'],
                    ['Email', client.email || '—'],
                    ['Phone', client.phone || '—'],
                ].map(([label, value]) => (
                    <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>{interactions.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-primary-text)', fontWeight: 500 }}>Interactions</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--color-success-soft)', borderRadius: 'var(--radius-md)', flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>{meetings.length}</div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>Meeting Notes</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--color-warning-soft)', borderRadius: 'var(--radius-md)', flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>
                        {interactions.length > 0 ? formatDate(interactions[0].date) : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>Last Interaction</div>
                </div>
            </div>

            {/* Recent Interactions */}
            {recentInteractions.length > 0 && (
                <div style={{ marginBottom: latestMeeting ? 18 : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                        Recent Interactions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentInteractions.map(ix => (
                            <div key={ix.id} style={{ padding: '10px 12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(ix.date)}</span>
                                    {ix.attendee && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>👤 {ix.attendee}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {ix.sales_topic && (
                                        <span className="topic-tag topic-sales" style={{ fontSize: 11 }}>
                                            💼 {ix.sales_topic.length > 60 ? ix.sales_topic.slice(0, 60) + '…' : ix.sales_topic}
                                        </span>
                                    )}
                                    {ix.fae_topic && (
                                        <span className="topic-tag topic-fae" style={{ fontSize: 11 }}>
                                            ⚙️ {ix.fae_topic.length > 60 ? ix.fae_topic.slice(0, 60) + '…' : ix.fae_topic}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Latest Meeting Note */}
            {latestMeeting && (
                <div style={{ paddingTop: recentInteractions.length > 0 ? 0 : undefined }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 10, marginTop: recentInteractions.length > 0 ? 18 : 0, borderTop: recentInteractions.length > 0 ? '1px solid var(--color-border-light)' : undefined, paddingTop: recentInteractions.length > 0 ? 18 : 0 }}>
                        Latest Meeting Note
                    </div>
                    <div style={{ padding: '10px 12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                            📅 {formatDate(latestMeeting.date)}
                            {latestMeeting.attendees && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>👥 {latestMeeting.attendees}</span>}
                        </div>
                        {latestMeeting.notes && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: latestMeeting.follow_up ? 6 : 0, whiteSpace: 'pre-wrap' }}>{latestMeeting.notes.length > 150 ? latestMeeting.notes.slice(0, 150) + '…' : latestMeeting.notes}</div>}
                        {latestMeeting.follow_up && (
                            <div style={{ background: 'var(--color-warning-soft)', borderRadius: 6, padding: '6px 10px', marginTop: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706' }}>⚡ Follow-up: </span>
                                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{latestMeeting.follow_up}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {client.notes && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border-light)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Notes</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{client.notes}</div>
                </div>
            )}
        </div>
    );
}

export default function KeyCustomersPage() {
    const [customers, setCustomers] = useState<Client[]>([]);
    const [interactionsMap, setInteractionsMap] = useState<Record<number, Interaction[]>>({});
    const [meetingsMap, setMeetingsMap] = useState<Record<number, Meeting[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function loadAll() {
        setLoading(true);
        try {
            const [ks, allIx, allMeet] = await Promise.all([
                fetch('/api/clients?key_only=1').then(r => r.json()),
                fetch('/api/interactions').then(r => r.json()),
                fetch('/api/meetings').then(r => r.json()),
            ]);

            if (ks.error || allIx.error || allMeet.error) {
                throw new Error(ks.error || allIx.error || allMeet.error);
            }

            const safeKs = Array.isArray(ks) ? ks : [];
            const safeIx = Array.isArray(allIx) ? allIx : [];
            const safeMeet = Array.isArray(allMeet) ? allMeet : [];

            setCustomers(safeKs);

            const ixMap: Record<number, Interaction[]> = {};
            for (const ix of safeIx) {
                if (!ixMap[ix.client_id]) ixMap[ix.client_id] = [];
                ixMap[ix.client_id].push(ix);
            }
            const mMap: Record<number, Meeting[]> = {};
            for (const m of safeMeet) {
                if (!mMap[m.client_id]) mMap[m.client_id] = [];
                mMap[m.client_id].push(m);
            }
            setInteractionsMap(ixMap);
            setMeetingsMap(mMap);
            setError(null);
        } catch (err: any) {
            console.error('Key Customers load error:', err);
            setError(err.message || 'Failed to load key customer data');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadAll(); }, []);

    async function removeKey(id: number) {
        await fetch(`/api/clients/${id}/toggle-key`, { method: 'PATCH' });
        loadAll();
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#F59E0B' }}>★</span> Key Customers
                    </div>
                    <div className="page-header-sub">
                        {loading ? '…' : `${customers.length} key customer${customers.length !== 1 ? 's' : ''}`} — star any customer to add them here
                    </div>
                </div>
                <Link href="/customers" className="btn btn-ghost">View All Customers →</Link>
            </div>

            {loading ? (
                <div style={{ padding: 40, color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading…</div>
            ) : error ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ color: '#EF4444', marginBottom: 12 }}>{error}</div>
                    <button className="btn btn-secondary" onClick={() => loadAll()}>Retry</button>
                    <Link href="/customers" className="btn btn-ghost" style={{ marginLeft: 8 }}>View All Customers</Link>
                </div>
            ) : customers.length === 0 ? (
                <div className="empty-state card" style={{ border: '2px dashed #FDE68A', background: '#FFFEF7' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>No Key Customers yet</div>
                    <p>Click the <strong>★</strong> star button on any customer to mark them as a Key Customer and they'll appear here with detailed insights.</p>
                    <Link href="/customers" className="btn btn-primary" style={{ marginTop: 16 }}>Go to Customers →</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {customers.map(c => (
                        <CustomerCard
                            key={c.id}
                            client={c}
                            interactions={interactionsMap[c.id] || []}
                            meetings={meetingsMap[c.id] || []}
                            onRemoveKey={() => removeKey(c.id)}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
