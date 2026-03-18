'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderActionsContextType {
    actions: ReactNode | null;
    setActions: (actions: ReactNode | null) => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextType | undefined>(undefined);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
    const [actions, setActions] = useState<ReactNode | null>(null);

    return (
        <HeaderActionsContext.Provider value={{ actions, setActions }}>
            {children}
        </HeaderActionsContext.Provider>
    );
}

export function useHeaderActions() {
    const context = useContext(HeaderActionsContext);
    if (context === undefined) {
        throw new Error('useHeaderActions must be used within a HeaderActionsProvider');
    }
    return context;
}
