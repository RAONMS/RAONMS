'use client';

import { useState } from 'react';

interface NewForecastEntryProps {
    onClose: () => void;
    onSuccess: () => void;
    onCreate: (entry: {
        model: string;
        customer: string;
        standard: string;
        application: string;
        location: string;
    }) => Promise<unknown>;
}

export default function NewForecastEntry({ onClose, onSuccess, onCreate }: NewForecastEntryProps) {
    const [formData, setFormData] = useState({
        model: '',
        customer: '',
        standard: '',
        application: '',
        location: '',
        hierarchyType: '' as 'MD' | 'MTV' | 'M-FAB' | '',
        characteristic: '' as 'Panel' | 'Wafer' | 'Optic' | 'Controller' | 'Other' | '',
        netDie: '' as number | ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const entry = {
                model: formData.model.trim(),
                customer: formData.customer.trim(),
                standard: formData.standard.trim(),
                application: formData.application.trim(),
                location: formData.location.trim(),
            };

            await onCreate(entry);

            if (formData.model && (formData.hierarchyType || formData.characteristic)) {
                await fetch('/api/product-characteristics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        [formData.model]: {
                            hierarchyType: formData.hierarchyType,
                            characteristic: formData.characteristic,
                            netDie: formData.netDie
                        }
                    })
                });
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2 className="modal-title">New Forecast Entry</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Model</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                required 
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Customer</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={formData.customer}
                                    onChange={e => setFormData({ ...formData, customer: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Standard</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={formData.standard}
                                    onChange={e => setFormData({ ...formData, standard: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Application</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={formData.application}
                                    onChange={e => setFormData({ ...formData, application: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>
                        
                        <div className="divider"></div>
                        <h3 className="section-title">Product Characteristics</h3>

                        <div className="form-group">
                            <label>Hierarchy Type</label>
                            <div className="type-options">
                                {['MD', 'MTV', 'M-FAB'].map(type => (
                                    <label key={type} className="checkbox-container">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.hierarchyType === type} 
                                            onChange={() => setFormData({ ...formData, hierarchyType: type as any })}
                                        />
                                        <span className="checkmark"></span>
                                        {type}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Characteristic</label>
                            <div className="char-grid">
                                {['Panel', 'Wafer', 'Optic', 'Controller', 'Other'].map(opt => (
                                    <label key={opt} className="checkbox-container">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.characteristic === opt}
                                            onChange={() => setFormData({ ...formData, characteristic: opt as any })}
                                        />
                                        <span className="checkmark"></span>
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {formData.characteristic === 'Wafer' && (
                            <div className="form-group">
                                <label>Net Die</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    placeholder="Enter Net Die"
                                    value={formData.netDie}
                                    onChange={e => setFormData({ ...formData, netDie: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        )}
                    </div>

                    <style jsx>{`
                        .divider {
                            height: 1px;
                            background: var(--color-border-light);
                            margin: 20px 0;
                        }
                        .section-title {
                            font-size: 14px;
                            font-weight: 600;
                            margin-bottom: 12px;
                            color: var(--color-text);
                        }
                        .type-options {
                            display: flex;
                            gap: 20px;
                        }
                        .char-grid {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 10px;
                        }

                        /* Checkbox Styling */
                        .checkbox-container {
                            display: flex;
                            align-items: center;
                            position: relative;
                            padding-left: 28px;
                            cursor: pointer;
                            user-select: none;
                            font-size: 13px;
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
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Add Entry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
