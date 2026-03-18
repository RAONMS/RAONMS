'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const REGIONS = ['APAC', 'EMEA', 'NA', 'LATAM', 'MEA', 'Other'];
const STATUSES = ['Prospect', 'Active', 'Inactive'];

export default function NewCustomerPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);

    const [form, setForm] = useState({
        company_name: '', website: '', region: '', contact_name: '',
        email: '', phone: '', status: 'Prospect', notes: '',
    });

    const [ix, setIx] = useState({
        date: new Date().toISOString().slice(0, 10),
        attendee: '', sales_topic: '', fae_topic: '', notes: '',
    });
    const [addInteraction, setAddInteraction] = useState(false);

    function setField(field: string, value: string) {
        setForm(f => ({ ...f, [field]: value }));
    }
    function setIxField(field: string, value: string) {
        setIx(i => ({ ...i, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.company_name) { alert('Company name is required'); return; }
        setSaving(true);
        try {
            const cRes = await fetch('/api/clients', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const client = await cRes.json();
            if (addInteraction && ix.date) {
                await fetch('/api/interactions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client_id: client.id, ...ix }),
                });
            }
            router.push(`/customers/${client.id}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Add New Customer</div>
                    <div className="page-header-sub">Fill in the details to register a new customer.</div>
                </div>
                <Link href="/customers" className="btn btn-ghost">← Back to Customers</Link>
            </div>

            <div style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: s === 2 ? 'pointer' : 'default' }}
                            onClick={() => s === 2 && form.company_name ? setStep(2) : undefined}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: step >= s ? 'var(--color-primary)' : 'var(--color-border)',
                                color: step >= s ? 'white' : 'var(--color-text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 600, flexShrink: 0,
                            }}>{s}</div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: step >= s ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                {s === 1 ? 'Basic Info' : 'First Interaction'}
                            </span>
                            {s < 2 && <div style={{ width: 40, height: 1, background: 'var(--color-border)' }} />}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: 20 }}>Company Information</div>
                            <div className="form-group">
                                <label className="form-label">Company Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                <input id="company-name" className="form-input" value={form.company_name} onChange={e => setField('company_name', e.target.value)} placeholder="e.g. Acme Corporation" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Website</label>
                                    <input id="website" className="form-input" value={form.website} onChange={e => setField('website', e.target.value)} placeholder="e.g. acme.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Region <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                    <select id="region" className="form-select" value={form.region} onChange={e => setField('region', e.target.value)}>
                                        <option value="">Select region…</option>
                                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="divider" />
                            <div className="card-title" style={{ marginBottom: 16, fontSize: 14 }}>Primary Contact</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Contact Name</label>
                                    <input id="contact-name" className="form-input" value={form.contact_name} onChange={e => setField('contact_name', e.target.value)} placeholder="Full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select id="customer-status" className="form-select" value={form.status} onChange={e => setField('status', e.target.value)}>
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input id="email" className="form-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@company.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input id="phone" className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+1 555 000 0000" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea id="customer-notes" className="form-textarea" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Additional notes about this customer…" />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)} disabled={!form.company_name}>
                                    Next: Add Interaction →
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving || !form.company_name} id="save-customer-btn">
                                    {saving ? 'Saving…' : 'Save Customer'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: 4 }}>First Interaction</div>
                            <div className="card-subtitle" style={{ marginBottom: 20 }}>Optional — add interactions later from the customer detail page.</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer', fontSize: 14 }}>
                                <input type="checkbox" checked={addInteraction} onChange={e => setAddInteraction(e.target.checked)} id="add-interaction-check" />
                                Record an initial interaction
                            </label>
                            {addInteraction && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">Date</label><input id="ix-date" className="form-input" type="date" value={ix.date} onChange={e => setIxField('date', e.target.value)} /></div>
                                        <div className="form-group"><label className="form-label">Attendee</label><input id="ix-attendee" className="form-input" value={ix.attendee} onChange={e => setIxField('attendee', e.target.value)} placeholder="Name(s)" /></div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Sales Topic</label><textarea id="ix-sales" className="form-textarea" value={ix.sales_topic} onChange={e => setIxField('sales_topic', e.target.value)} placeholder="Sales discussion points…" /></div>
                                    <div className="form-group"><label className="form-label">FAE Topic</label><textarea id="ix-fae" className="form-textarea" value={ix.fae_topic} onChange={e => setIxField('fae_topic', e.target.value)} placeholder="Technical / FAE topics…" /></div>
                                    <div className="form-group"><label className="form-label">Additional Notes</label><textarea id="ix-notes" className="form-textarea" value={ix.notes} onChange={e => setIxField('notes', e.target.value)} /></div>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                                <button type="submit" className="btn btn-primary" disabled={saving} id="save-customer-final-btn">{saving ? 'Saving…' : 'Save Customer'}</button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </>
    );
}
