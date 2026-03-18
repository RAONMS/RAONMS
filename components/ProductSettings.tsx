'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ProductCharacteristics {
    hierarchyType: 'MD' | 'MTV' | 'M-FAB' | '';
    characteristic: 'Panel' | 'Wafer' | 'Optic' | 'Controller' | 'Other' | '';
    netDie: number | '';
}

interface ProductSettingsProps {
    forecastData: any[];
}

export default function ProductSettings({ forecastData }: ProductSettingsProps) {
    const [characteristics, setCharacteristics] = useState<Record<string, ProductCharacteristics>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Extract unique models
    const uniqueModels = useMemo(() => {
        const models = new Set<string>();
        forecastData.forEach(row => {
            if (row.model) models.add(row.model);
        });
        return Array.from(models).sort();
    }, [forecastData]);

    // Load characteristics
    useEffect(() => {
        fetch('/api/product-characteristics')
            .then(res => res.json())
            .then(data => {
                setCharacteristics(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading characteristics:', err);
                setLoading(false);
            });
    }, []);

    const handleUpdate = async (model: string, updates: Partial<ProductCharacteristics>) => {
        const current = characteristics[model] || { hierarchyType: '', characteristic: '', netDie: '' };
        const updated = { ...current, ...updates };
        
        // Optimistic update
        setCharacteristics(prev => ({ ...prev, [model]: updated }));

        setSaving(true);
        try {
            await fetch('/api/product-characteristics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [model]: updated })
            });
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading characteristics...</div>;

    return (
        <div className="product-settings">
            <div className="settings-header">
                <h2>Product Characteristics</h2>
                {saving && <span className="saving-indicator">Saving...</span>}
            </div>
            
            <div className="settings-table-wrapper">
                <table className="settings-table">
                    <thead>
                        <tr>
                            <th>Model</th>
                            <th>Hierarchy Type</th>
                            <th>Characteristic</th>
                            <th>Net Die (Wafer only)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueModels.map(model => {
                            const char = characteristics[model] || { hierarchyType: '', characteristic: '', netDie: '' };
                            return (
                                <tr key={model}>
                                    <td className="model-name-cell">{model}</td>
                                    <td>
                                        <div className="radio-group">
                                            <label className="checkbox-container">
                                                <input 
                                                    type="checkbox" 
                                                    checked={char.hierarchyType === 'MD'} 
                                                    onChange={() => handleUpdate(model, { hierarchyType: 'MD' })}
                                                />
                                                <span className="checkmark"></span>
                                                MD
                                            </label>
                                            <label className="checkbox-container">
                                                <input 
                                                    type="checkbox" 
                                                    checked={char.hierarchyType === 'MTV'} 
                                                    onChange={() => handleUpdate(model, { hierarchyType: 'MTV' })}
                                                />
                                                <span className="checkmark"></span>
                                                MTV
                                            </label>
                                            <label className="checkbox-container">
                                                <input 
                                                    type="checkbox" 
                                                    checked={char.hierarchyType === 'M-FAB'} 
                                                    onChange={() => handleUpdate(model, { hierarchyType: 'M-FAB' })}
                                                />
                                                <span className="checkmark"></span>
                                                M-FAB
                                            </label>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="characteristic-grid">
                                            {['Panel', 'Wafer', 'Optic', 'Controller', 'Other'].map(opt => (
                                                <label key={opt} className="checkbox-container">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={char.characteristic === opt}
                                                        onChange={() => handleUpdate(model, { characteristic: opt as any })}
                                                    />
                                                    <span className="checkmark"></span>
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        {char.characteristic === 'Wafer' && (
                                            <input 
                                                type="number"
                                                className="net-die-input"
                                                placeholder="Enter Net Die"
                                                value={char.netDie}
                                                onChange={(e) => handleUpdate(model, { netDie: parseFloat(e.target.value) || 0 })}
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .product-settings {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid var(--color-border);
                    padding: 24px;
                    box-shadow: var(--shadow-sm);
                }
                .settings-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .settings-header h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--color-text);
                    margin: 0;
                }
                .saving-indicator {
                    font-size: 12px;
                    color: var(--color-primary);
                    font-weight: 500;
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                .settings-table-wrapper {
                    overflow-x: auto;
                    border: 1px solid var(--color-border-light);
                    border-radius: 8px;
                }
                .settings-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                .settings-table th {
                    background: #f8fafc;
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    border-bottom: 2px solid var(--color-border);
                }
                .settings-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--color-border-light);
                    vertical-align: middle;
                }
                .model-name-cell {
                    font-weight: 600;
                    color: var(--color-primary);
                }
                .radio-group {
                    display: flex;
                    gap: 16px;
                }
                .characteristic-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }
                .net-die-input {
                    width: 100px;
                    padding: 6px 10px;
                    border: 1px solid var(--color-border);
                    border-radius: 4px;
                    font-size: 13px;
                }
                .net-die-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
                }

                /* Premium Checkbox/Radio Styling */
                .checkbox-container {
                    display: flex;
                    align-items: center;
                    position: relative;
                    padding-left: 28px;
                    cursor: pointer;
                    user-select: none;
                    font-weight: 500;
                    color: var(--color-text-secondary);
                    min-height: 20px;
                }
                .checkbox-container input {
                    position: absolute;
                    opacity: 0;
                    cursor: pointer;
                    height: 0;
                    width: 0;
                }
                .checkmark {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    transform: translateY(-50%);
                    height: 18px;
                    width: 18px;
                    background-color: #eee;
                    border-radius: 4px;
                    transition: all 0.2s;
                    border: 1px solid #ddd;
                }
                .checkbox-container:hover input ~ .checkmark {
                    background-color: #e2e8f0;
                }
                .checkbox-container input:checked ~ .checkmark {
                    background-color: var(--color-primary);
                    border-color: var(--color-primary);
                }
                .checkmark:after {
                    content: "";
                    position: absolute;
                    display: none;
                }
                .checkbox-container input:checked ~ .checkmark:after {
                    display: block;
                }
                .checkbox-container .checkmark:after {
                    left: 6px;
                    top: 2px;
                    width: 5px;
                    height: 10px;
                    border: solid white;
                    border-width: 0 2px 2px 0;
                    transform: rotate(45deg);
                }
            `}</style>
        </div>
    );
}
