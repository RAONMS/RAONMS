'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`/api/backlog?view=single&id=${encodeURIComponent(id)}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setFormData(data);
            })
            .catch(err => {
                console.error(err);
                alert('Could not find order.');
                router.push('/backlog');
            })
            .finally(() => setLoading(false));
    }, [id, router]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch('/api/backlog', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            router.push('/backlog');
        } catch (err) {
            console.error(err);
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this custom order?')) return;
        setSaving(true);
        try {
            await fetch(`/api/backlog?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            router.push('/backlog');
        } catch (err) {
            console.error(err);
            setSaving(false);
        }
    }

    if (loading) return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>;
    if (!formData) return null;

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">Edit Order</div>
                    <div className="page-header-sub">{formData.customer} - {formData.product}</div>
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
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" className="btn btn-danger btn-ghost" onClick={handleDelete} disabled={saving}>
                            Delete Order
                        </button>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <Link href="/backlog" className="btn btn-ghost">Cancel</Link>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
