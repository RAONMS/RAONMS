'use client';

import Link from 'next/link';
import { useHeaderActions } from '@/lib/HeaderActionsContext';

interface TopbarProps {
    collapsed: boolean;
    title: string;
}

export default function Topbar({ collapsed, title }: TopbarProps) {
    const { actions } = useHeaderActions();

    return (
        <header className={`topbar${collapsed ? ' collapsed' : ''}`}>
            <h1 className="topbar-title">{title}</h1>
            <div className="topbar-actions">
                {actions ? actions : (
                    <Link href="/customers/new" className="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Customer
                    </Link>
                )}
            </div>
        </header>
    );
}
