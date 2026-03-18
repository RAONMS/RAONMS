'use client';

import { useEffect, useMemo, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ForecastPresenceUser } from '@/lib/forecast';

interface PresenceUserInput {
    clientId: string;
    userId: string;
    name: string;
    color: string;
}

interface PresenceHookOptions {
    channel: RealtimeChannel | null;
    currentUser: PresenceUserInput | null;
    connectionStatus: string;
    focusedCellKey: string | null;
    editingCellKey: string | null;
}

function flattenPresenceState(channel: RealtimeChannel): ForecastPresenceUser[] {
    const state = channel.presenceState<Record<string, unknown>>();
    return Object.values(state).flatMap((entries) =>
        entries.map((entry: any) => ({
            clientId: entry.clientId,
            userId: entry.userId,
            name: entry.name,
            color: entry.color,
            focusedCellKey: entry.focusedCellKey || null,
            editingCellKey: entry.editingCellKey || null,
            isEditing: Boolean(entry.editingCellKey),
        }))
    );
}

export function useForecastPresence({
    channel,
    currentUser,
    connectionStatus,
    focusedCellKey,
    editingCellKey,
}: PresenceHookOptions) {
    const [activeUsers, setActiveUsers] = useState<ForecastPresenceUser[]>([]);

    useEffect(() => {
        if (!channel) return;

        const syncPresence = () => {
            setActiveUsers(flattenPresenceState(channel));
        };

        channel
            .on('presence', { event: 'sync' }, syncPresence)
            .on('presence', { event: 'join' }, syncPresence)
            .on('presence', { event: 'leave' }, syncPresence);

        return () => {
            // Channel lifecycle is owned by useForecastRealtime.
        };
    }, [channel]);

    useEffect(() => {
        if (!channel || !currentUser || connectionStatus !== 'SUBSCRIBED') return;

        void channel.track({
            clientId: currentUser.clientId,
            userId: currentUser.userId,
            name: currentUser.name,
            color: currentUser.color,
            focusedCellKey,
            editingCellKey,
            updatedAt: new Date().toISOString(),
        });
    }, [channel, currentUser, connectionStatus, focusedCellKey, editingCellKey]);

    useEffect(() => {
        return () => {
            if (!channel) return;
            void channel.untrack();
        };
    }, [channel]);

    const focusedCellsByUser = useMemo(() => {
        return activeUsers.reduce<Record<string, ForecastPresenceUser>>((acc, user) => {
            acc[user.clientId] = user;
            return acc;
        }, {});
    }, [activeUsers]);

    return {
        activeUsers,
        focusedCellsByUser,
    };
}
