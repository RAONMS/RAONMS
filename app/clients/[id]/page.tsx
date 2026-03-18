'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const REGIONS = ['APAC', 'EMEA', 'NA', 'LATAM', 'MEA', 'Other'];
const STATUSES = ['Prospect', 'Active', 'Inactive'];

interface Client {
    id: number; company_name: string; website: string; region: string;
    contact_name: string; email: string; phone: string; status: string; notes: string;
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

// ───── Interaction Form ─────
function InteractionForm({ clientId, onSave, initial, onCancel }: {
    clientId: number; onSave: () => void; initial?: Interaction; onCancel: () => void;
}) {
    const [form, setForm] = useState({
        date: initial?.date || new Date().toISOString().slice(0, 10),
        attendee: initial?.attendee || '',
        sales_topic: initial?.sales_topic || '',
        fae_topic: initial?.fae_topic || '',
        notes: initial?.notes || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        const url = initial ? `/api/interactions/${initial.id}` : '/api/interactions';
        const method = initial ? 'PUT' : 'POST';
        await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, client_id: clientId }),
        });
        setSaving(false);
        onSave();
    }

    return (
        <form onSubmit={submit} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid var(--color-border)', marginBottom: 16 }}>
            <div className="form-row">
                <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Attendee</label><input className="form-input" value={form.attendee} onChange={e => set('attendee', e.target.value)} placeholder="Name(s) of attendees" /></div>
            </div>
            <div className="form-group"><label className="form-label">Sales Topic</label><textarea className="form-textarea" value={form.sales_topic} onChange={e => set('sales_topic', e.target.value)} placeholder="Sales discussion, deal stage, proposals…" style={{ minHeight: 70 }} /></div>
            <div className="form-group"><label className="form-label">FAE Topic</label><textarea className="form-textarea" value={form.fae_topic} onChange={e => set('fae_topic', e.target.value)} placeholder="Technical / FAE discussion…" style={{ minHeight: 70 }} /></div>
            <div className="form-group"><label className="form-label">Additional Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 60 }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Interaction'}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
}

// ───── Meeting Form ─────
function MeetingForm({ clientId, onSave, initial, onCancel }: {
    clientId: number; onSave: () => void; initial?: Meeting; onCancel: () => void;
}) {
    const [form, setForm] = useState({
        date: initial?.date || new Date().toISOString().slice(0, 10),
        attendees: initial?.attendees || '',
        agenda: initial?.agenda || '',
        notes: initial?.notes || '',
        follow_up: initial?.follow_up || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        const url = initial ? `/api/meetings/${initial.id}` : '/api/meetings';
        await fetch(url, {
            method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, client_id: clientId }),
        });
        setSaving(false);
        onSave();
    }

    return (
        <form onSubmit={submit} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid var(--color-border)', marginBottom: 16 }}>
            <div className="form-row">
                <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Attendees</label><input className="form-input" value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names, comma-separated" /></div>
            </div>
            <div className="form-group"><label className="form-label">Agenda</label><textarea className="form-textarea" value={form.agenda} onChange={e => set('agenda', e.target.value)} placeholder="Meeting agenda…" style={{ minHeight: 60 }} /></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Key discussion points…" style={{ minHeight: 80 }} /></div>
            <div className="form-group"><label className="form-label">Follow-up / Action Items</label><textarea className="form-textarea" value={form.follow_up} onChange={e => set('follow_up', e.target.value)} placeholder="Action items, next steps…" style={{ minHeight: 60 }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Meeting Note'}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
}

// ───── Main Page ─────
export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [tab, setTab] = useState<'info' | 'interactions' | 'meetings'>('info');

    const [editClient, setEditClient] = useState(false);
    const [clientForm, setClientForm] = useState<Partial<Client>>({});
    const [showIxForm, setShowIxForm] = useState(false);
    const [editIx, setEditIx] = useState<Interaction | null>(null);
    const [showMeetForm, setShowMeetForm] = useState(false);
    const [editMeet, setEditMeet] = useState<Meeting | null>(null);
    const [saving, setSaving] = useState(false);

    function loadClient() { fetch(`/api/clients/${id}`).then(r => r.json()).then(c => { setClient(c); setClientForm(c); }); }
    function loadInteractions() { fetch(`/api/interactions?client_id=${id}`).then(r => r.json()).then(setInteractions); }
    function loadMeetings() { fetch(`/api/meetings?client_id=${id}`).then(r => r.json()).then(setMeetings); }

    useEffect(() => {
        loadClient(); loadInteractions(); loadMeetings();
    }, [id]);

    async function saveClient(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        await fetch(`/api/clients/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientForm),
        });
        setSaving(false);
        setEditClient(false);
        loadClient();
    }

    async function deleteIx(ixId: number) {
        if (!confirm('Delete this interaction?')) return;
        await fetch(`/api/interactions/${ixId}`, { method: 'DELETE' });
        loadInteractions();
    }
    async function deleteMeet(mId: number) {
        if (!confirm('Delete this meeting note?')) return;
        await fetch(`/api/meetings/${mId}`, { method: 'DELETE' });
        loadMeetings();
    }

    if (!client) return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading…</div>;

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div className="page-header-title">{client.company_name}</div>
                        {client.region && <span className="badge badge-region">{client.region}</span>}
                        {statusBadge(client.status)}
                    </div>
                    <div className="page-header-sub">
                        {client.website && (
                            <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                target="_blank" rel="noopener" style={{ color: 'var(--color-primary)', marginRight: 16 }}>
                                🌐 {client.website}
                            </a>
                        )}
                        {client.contact_name && <span>👤 {client.contact_name}</span>}
                    </div>
                </div>
                <Link href="/clients" className="btn btn-ghost">← Back</Link>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab-btn${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}>Info</button>
                <button className={`tab-btn${tab === 'interactions' ? ' active' : ''}`} onClick={() => setTab('interactions')}>
                    Interactions {interactions.length > 0 && <span className="badge badge-primary" style={{ marginLeft: 6 }}>{interactions.length}</span>}
                </button>
                <button className={`tab-btn${tab === 'meetings' ? ' active' : ''}`} onClick={() => setTab('meetings')}>
                    Meeting Notes {meetings.length > 0 && <span className="badge badge-primary" style={{ marginLeft: 6 }}>{meetings.length}</span>}
                </button>
            </div>

            {/* Info Tab */}
            {tab === 'info' && (
                <div style={{ maxWidth: 680 }}>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Company Details</div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditClient(!editClient)}>
                                {editClient ? 'Cancel' : '✏️ Edit'}
                            </button>
                        </div>
                        {editClient ? (
                            <form onSubmit={saveClient}>
                                <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" value={clientForm.company_name || ''} onChange={e => setClientForm(f => ({ ...f, company_name: e.target.value }))} required /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={clientForm.website || ''} onChange={e => setClientForm(f => ({ ...f, website: e.target.value }))} /></div>
                                    <div className="form-group"><label className="form-label">Region</label>
                                        <select className="form-select" value={clientForm.region || ''} onChange={e => setClientForm(f => ({ ...f, region: e.target.value }))}>
                                            <option value="">Select…</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Contact Name</label><input className="form-input" value={clientForm.contact_name || ''} onChange={e => setClientForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
                                    <div className="form-group"><label className="form-label">Status</label>
                                        <select className="form-select" value={clientForm.status || ''} onChange={e => setClientForm(f => ({ ...f, status: e.target.value }))}>
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={clientForm.email || ''} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} /></div>
                                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={clientForm.phone || ''} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={clientForm.notes || ''} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} /></div>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                            </form>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                                {[
                                    ['Website', client.website || '—'],
                                    ['Region', client.region || '—'],
                                    ['Contact', client.contact_name || '—'],
                                    ['Email', client.email || '—'],
                                    ['Phone', client.phone || '—'],
                                    ['Status', client.status],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 3 }}>{label}</div>
                                        <div style={{ fontSize: 14, color: 'var(--color-text)' }}>{value}</div>
                                    </div>
                                ))}
                                {client.notes && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Notes</div>
                                        <div style={{ fontSize: 14, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{client.notes}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Interactions Tab */}
            {tab === 'interactions' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{interactions.length} interaction{interactions.length !== 1 ? 's' : ''}</div>
                        <button className="btn btn-primary btn-sm" onClick={() => { setShowIxForm(true); setEditIx(null); }}>+ Add Interaction</button>
                    </div>

                    {showIxForm && !editIx && (
                        <InteractionForm clientId={Number(id)} onSave={() => { setShowIxForm(false); loadInteractions(); }} onCancel={() => setShowIxForm(false)} />
                    )}

                    {interactions.length === 0 && !showIxForm ? (
                        <div className="empty-state card">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            <p>No interactions yet. Click <strong>+ Add Interaction</strong> to get started.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {interactions.map(ix => (
                                <div key={ix.id}>
                                    {editIx?.id === ix.id && (
                                        <InteractionForm clientId={Number(id)} initial={ix} onSave={() => { setEditIx(null); loadInteractions(); }} onCancel={() => setEditIx(null)} />
                                    )}
                                    {editIx?.id !== ix.id && (
                                        <div className="card card-sm">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div>
                                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(ix.date)}</span>
                                                    {ix.attendee && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 10 }}>👤 {ix.attendee}</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditIx(ix)}>Edit</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => deleteIx(ix.id)}>Delete</button>
                                                </div>
                                            </div>
                                            {ix.sales_topic && (
                                                <div style={{ marginBottom: 6 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: 3 }}>💼 Sales Topic</div>
                                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{ix.sales_topic}</div>
                                                </div>
                                            )}
                                            {ix.fae_topic && (
                                                <div style={{ marginBottom: 6 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669', marginBottom: 3 }}>⚙️ FAE Topic</div>
                                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{ix.fae_topic}</div>
                                                </div>
                                            )}
                                            {ix.notes && (
                                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-light)', paddingTop: 6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{ix.notes}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Meetings Tab */}
            {tab === 'meetings' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{meetings.length} meeting note{meetings.length !== 1 ? 's' : ''}</div>
                        <button className="btn btn-primary btn-sm" onClick={() => { setShowMeetForm(true); setEditMeet(null); }}>+ Add Meeting Note</button>
                    </div>

                    {showMeetForm && !editMeet && (
                        <MeetingForm clientId={Number(id)} onSave={() => { setShowMeetForm(false); loadMeetings(); }} onCancel={() => setShowMeetForm(false)} />
                    )}

                    {meetings.length === 0 && !showMeetForm ? (
                        <div className="empty-state card">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            <p>No meeting notes yet. Click <strong>+ Add Meeting Note</strong> to get started.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {meetings.map(m => (
                                <div key={m.id}>
                                    {editMeet?.id === m.id && (
                                        <MeetingForm clientId={Number(id)} initial={m} onSave={() => { setEditMeet(null); loadMeetings(); }} onCancel={() => setEditMeet(null)} />
                                    )}
                                    {editMeet?.id !== m.id && (
                                        <div className="card card-sm">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div>
                                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(m.date)}</span>
                                                    {m.attendees && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 10 }}>👥 {m.attendees}</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMeet(m)}>Edit</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => deleteMeet(m.id)}>Delete</button>
                                                </div>
                                            </div>
                                            {m.agenda && (
                                                <div style={{ marginBottom: 6 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Agenda</div>
                                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{m.agenda}</div>
                                                </div>
                                            )}
                                            {m.notes && (
                                                <div style={{ marginBottom: 6 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Notes</div>
                                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{m.notes}</div>
                                                </div>
                                            )}
                                            {m.follow_up && (
                                                <div style={{ background: 'var(--color-warning-soft)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', marginTop: 8 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#D97706', marginBottom: 3 }}>⚡ Follow-up</div>
                                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{m.follow_up}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
