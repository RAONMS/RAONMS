'use client';

import { useState } from 'react';
import Papa from 'papaparse';

export default function SettingsPage() {
    const [revFile, setRevFile] = useState<File | null>(null);
    const [bklgFile, setBklgFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [promptLoading, setPromptLoading] = useState(true);

    async function fetchPrompt() {
        try {
            const res = await fetch('/api/settings/prompt');
            const data = await res.json();
            setPrompt(data.value || '');
        } catch (e) {
            console.error('Failed to fetch prompt');
        } finally {
            setPromptLoading(false);
        }
    }

    useState(() => { fetchPrompt(); });

    async function savePrompt() {
        setLoading('prompt');
        try {
            const res = await fetch('/api/settings/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: prompt })
            });
            if (res.ok) {
                setMessage({ text: 'AI Prompt updated successfully.', type: 'success' });
            } else {
                throw new Error('Save failed');
            }
        } catch (e) {
            setMessage({ text: 'Failed to save prompt.', type: 'error' });
        } finally {
            setLoading(null);
        }
    }

    async function handleUpload(type: 'revenue' | 'backlog') {
        const file = type === 'revenue' ? revFile : bklgFile;
        if (!file) return;

        setLoading(type);
        setMessage(null);

        try {
            const csvText = await file.text();
            const parsed = Papa.parse<Record<string, unknown>>(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            if (parsed.errors.length > 0) {
                throw new Error(parsed.errors[0]?.message || 'CSV parsing failed');
            }

            const rows = parsed.data;

            const res = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, rows })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: `Successfully ingested ${data.count} ${type} rows.`, type: 'success' });
            } else {
                setMessage({ text: data.error || 'Upload failed', type: 'error' });
            }
        } catch (e) {
            setMessage({ text: 'An error occurred during upload', type: 'error' });
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Settings & Data Management</h1>
                    <p className="page-subtitle">Configure AI services and manage cloud data ingestion.</p>
                </div>
            </header>

            <div className="settings-grid">
                {/* AI Configuration Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <IconBedrock />
                        <h2>Amazon Bedrock (AI)</h2>
                    </div>
                    <div className="settings-card-content">
                        <p className="settings-help-text">
                            The meeting summarizer uses <strong>Llama 3.1 8b</strong> via Amazon Bedrock. 
                            To enable this, ensure your AWS credentials are set in the environment.
                        </p>
                        <div className="info-box">
                            <strong>Required Env Vars:</strong>
                            <ul>
                                <li><code>APP_AWS_ACCESS_KEY_ID</code></li>
                                <li><code>APP_AWS_SECRET_ACCESS_KEY</code></li>
                                <li><code>APP_AWS_REGION</code> (e.g. us-east-1)</li>
                            </ul>
                        </div>
                        <p className="settings-status-text">
                            <span className="status-dot active"></span>
                            Bedrock Ready (Once keys are provided)
                        </p>
                    </div>
                </section>

                {/* Data Ingestion Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <IconCloud />
                        <h2>Cloud Data Sync</h2>
                    </div>
                    <div className="settings-card-content">
                        <p className="settings-help-text">
                            Sync your local CSV data with the cloud database. Uploading a new file will 
                            <strong> replace</strong> all existing cloud data for that category.
                        </p>

                        <div className="upload-stack">
                            <div className="upload-item">
                                <label>Revenue Data (.CSV)</label>
                                <div className="file-input-group">
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        onChange={(e) => setRevFile(e.target.files?.[0] || null)} 
                                    />
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => handleUpload('revenue')}
                                        disabled={!revFile || loading === 'revenue'}
                                    >
                                        {loading === 'revenue' ? 'Ingesting...' : 'Sync Revenue'}
                                    </button>
                                </div>
                            </div>

                            <div className="upload-item">
                                <label>Backlog Data (.CSV)</label>
                                <div className="file-input-group">
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        onChange={(e) => setBklgFile(e.target.files?.[0] || null)} 
                                    />
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => handleUpload('backlog')}
                                        disabled={!bklgFile || loading === 'backlog'}
                                    >
                                        {loading === 'backlog' ? 'Ingesting...' : 'Sync Backlog'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className={`notification ${message.type}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </section>

                {/* AI Prompt Management */}
                <section className="settings-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="settings-card-header">
                        <IconEdit />
                        <h2>AI Summarizer Configuration</h2>
                    </div>
                    <div className="settings-card-content">
                        <p className="settings-help-text">
                            Customize the system prompt used for the Business Summarizer. This defines the role, guidelines, and output format for the AI.
                        </p>
                        
                        {promptLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading prompt...</div>
                        ) : (
                            <div className="upload-stack">
                                <div className="upload-item">
                                    <label>Business Summary System Prompt</label>
                                    <textarea 
                                        className="form-input" 
                                        style={{ width: '100%', minHeight: 300, resize: 'vertical', fontFamily: 'monospace', fontSize: '13px', padding: '12px' }}
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        placeholder="Enter the AI system prompt here..."
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={savePrompt}
                                        disabled={loading === 'prompt'}
                                    >
                                        {loading === 'prompt' ? 'Saving...' : 'Save AI Prompt'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <style jsx>{`
                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 24px;
                    margin-top: 24px;
                }
                .settings-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .settings-card-header {
                    padding: 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .settings-card-header h2 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0;
                    color: #1e293b;
                }
                .settings-card-content {
                    padding: 24px;
                }
                .settings-help-text {
                    font-size: 0.95rem;
                    color: #64748b;
                    line-height: 1.5;
                    margin-bottom: 20px;
                }
                .info-box {
                    background: #f1f5f9;
                    padding: 16px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                }
                .info-box ul {
                    margin: 8px 0 0 20px;
                    padding: 0;
                }
                .status-dot {
                    height: 10px;
                    width: 10px;
                    background-color: #cbd5e1;
                    border-radius: 50%;
                    display: inline-block;
                    margin-right: 8px;
                }
                .status-dot.active {
                    background-color: #22c55e;
                }
                .settings-status-text {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #1e293b;
                }
                .upload-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .upload-item label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #475569;
                }
                .file-input-group {
                    display: flex;
                    gap: 12px;
                }
                .file-input-group input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.9rem;
                }
                .notification {
                    margin-top: 20px;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .notification.success {
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #bbf7d0;
                }
                .notification.error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }
                .btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-primary {
                    background: #1e293b;
                    color: white;
                    border: none;
                }
                .btn-primary:hover {
                    background: #334155;
                }
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

function IconEdit() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function IconBedrock() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
    );
}

function IconCloud() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
            <path d="M17.5 19c2.321 0 4.2-1.68 4.2-3.75a3.52 3.52 0 0 0-2.45-3.321A5.251 5.251 0 0 0 9.75 8.25c0 .245.018.486.052.722A3.75 3.75 0 0 0 7.5 12c0 2.07 1.879 3.75 4.2 3.75" />
            <path d="M12 21v-8m3 3-3-3-3 3" />
        </svg>
    );
}
