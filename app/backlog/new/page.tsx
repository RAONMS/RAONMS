'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<any>({ category: 'Micro Display' });
    const [saving, setSaving] = useState(false);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch('/api/backlog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            router.push('/backlog');
        } catch (err) {
            console.error(err);
            setSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Add Open Order</div>
                    <div className="page-header-sub">Create a new manual order to track in the backlog</div>
                </div>
                <Link href="/backlog" className="btn btn-ghost">← Back</Link>
            </div>

            <div className="card" style={{ maxWidth: 800 }}>
                <form onSubmit={handleSave}>
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group">
                            <label className="form-label">Customer Name</label>
                            <input required className="form-input" value={formData.customer || ''} onChange={e => setFormData({ ...formData, customer: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option>Micro Display</option>
                                <option>Mobile TV</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Product (SKU)</label>
                            <input required className="form-input" value={formData.product || ''} onChange={e => setFormData({ ...formData, product: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Order No.</label>
                            <input className="form-input" value={formData.order_no || ''} onChange={e => setFormData({ ...formData, order_no: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input required type="number" className="form-input" value={formData.qty || ''} onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Unit Price ($)</label>
                            <input required type="number" step="0.01" className="form-input" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Req Date (YYYY-MM)</label>
                            <input required type="text" className="form-input" placeholder="e.g. 2026-05" value={formData.req_date || ''} onChange={e => setFormData({ ...formData, req_date: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Remark</label>
                            <input className="form-input" value={formData.remark || ''} onChange={e => setFormData({ ...formData, remark: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <Link href="/backlog" className="btn btn-ghost">Cancel</Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Order'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
