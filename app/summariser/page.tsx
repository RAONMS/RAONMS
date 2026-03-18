'use client';

import { useState, useRef } from 'react';

interface FileAttachment {
    name: string;
    type: string;
    text: string;
}

export default function SummariserPage() {
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    }

    async function generateSummary() {
        setLoading(true);
        try {
            const attachedFiles: FileAttachment[] = [];
            for (const f of files) {
                attachedFiles.push({
                    name: f.name,
                    type: f.type,
                    text: await f.text(),
                });
            }

            const res = await fetch('/api/ai/business-summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, files: attachedFiles }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setResult(data.summary);
            setShowModal(true);
        } catch (err: any) {
            alert('Generation failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function downloadDocx() {
        if (!result) return;
        try {
            const res = await fetch('/api/export/docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: result, title: 'Raon Sales Portal — Business Summary' }),
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Summary_${new Date().toISOString().slice(0, 10)}.doc`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            alert('Download failed: ' + err.message);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-header-title">AI Summariser</div>
                    <div className="page-header-sub">Generate professional business summaries from text and documents</div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ marginBottom: 20 }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Source Text</label>
                    <textarea 
                        className="form-input" 
                        style={{ width: '100%', minHeight: 200, resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Paste text, meeting transcripts, or key notes here..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Attachments (Text files only)</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '30px 20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: 'var(--color-bg)',
                            transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Click or drag files to upload</div>
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                            accept=".txt,.md,.csv"
                        />
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Cloudflare free-plan deployment uses lightweight text attachments to keep the worker bundle within size limits.
                    </div>
                    {files.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {files.map((f, i) => (
                                <div key={i} className="badge badge-region" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
                                    {f.name}
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        setFiles(prev => prev.filter((_, idx) => idx !== i));
                                    }} style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', fontSize: 14 }}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, height: 48, fontWeight: 600, fontSize: 15 }}
                        disabled={loading || (!text.trim() && files.length === 0)}
                        onClick={generateSummary}
                    >
                        {loading ? 'Generating Summary...' : '✨ Generate Executive Summary'}
                    </button>
                </div>
            </div>

            {/* Result Modal / Popup */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 20
                }}>
                    <div className="card" style={{ 
                        width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
                        position: 'relative', background: '#fff', padding: '30px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 18 }}>AI Generated Summary</h2>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>&times; Close</button>
                        </div>
                        
                        <div style={{ 
                            padding: '20px', background: '#f9fafb', borderRadius: '8px', 
                            fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid #e5e7eb',
                            marginBottom: 20
                        }}>
                            {result}
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-success" onClick={downloadDocx} style={{ flex: 1 }}>
                                📄 Download as Word (.doc)
                            </button>
                            <button className="btn btn-secondary" onClick={() => {
                                navigator.clipboard.writeText(result || '');
                                alert('Copied to clipboard!');
                            }}>
                                📋 Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
