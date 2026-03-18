'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ForecastCellLock, FORECAST_LOCK_TTL_MS } from '@/lib/forecast';

interface BroadcastUserInput {
    clientId: string;
    userId: string;
    name: string;
    color: string;
}

interface BroadcastHookOptions {
    channel: RealtimeChannel | null;
    currentUser: BroadcastUserInput | null;
}

function isExpired(lock: ForecastCellLock) {
    return lock.expiresAt <= Date.now();
}

export function useForecastBroadcast({ channel, currentUser }: BroadcastHookOptions) {
    const [locksByCell, setLocksByCell] = useState<Record<string, ForecastCellLock>>({});
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const clearTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!channel) return;

        channel
            .on('broadcast', { event: 'cell_lock_request' }, ({ payload }) => {
                const lock = payload as ForecastCellLock;
                setLocksByCell((prev) => ({ ...prev, [lock.cellKey]: lock }));
            })
            .on('broadcast', { event: 'cell_lock_release' }, ({ payload }) => {
                const { cellKey, clientId } = payload as { cellKey: string; clientId: string };
                setLocksByCell((prev) => {
                    const existing = prev[cellKey];
                    if (!existing || existing.clientId !== clientId) return prev;
                    const next = { ...prev };
                    delete next[cellKey];
                    return next;
                });
            })
            .on('broadcast', { event: 'cell_focus' }, () => {})
            .on('broadcast', { event: 'cell_blur' }, () => {})
            .on('broadcast', { event: 'cell_edit_start' }, () => {})
            .on('broadcast', { event: 'cell_edit_end' }, () => {});

        return () => {
            // Channel lifecycle is owned by useForecastRealtime.
        };
    }, [channel]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setLocksByCell((prev) => {
                const next: Record<string, ForecastCellLock> = {};
                Object.entries(prev).forEach(([cellKey, lock]) => {
                    if (!isExpired(lock)) {
                        next[cellKey] = lock;
                    }
                });
                return next;
            });
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const broadcastEvent = useCallback(async (event: string, payload: Record<string, unknown>) => {
        if (!channel) return;
        await channel.send({
            type: 'broadcast',
            event,
            payload,
        });
    }, [channel]);

    const requestLock = useCallback(async (cellKey: string) => {
        if (!currentUser) return false;

        const existingLock = locksByCell[cellKey];
        if (existingLock && existingLock.clientId !== currentUser.clientId && !isExpired(existingLock)) {
            setStatusMessage(`${existingLock.userName} is already editing this cell.`);
            if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
            clearTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2500);
            return false;
        }

        const nextLock: ForecastCellLock = {
            cellKey,
            clientId: currentUser.clientId,
            userId: currentUser.userId,
            userName: currentUser.name,
            color: currentUser.color,
            expiresAt: Date.now() + FORECAST_LOCK_TTL_MS,
        };

        setLocksByCell((prev) => ({ ...prev, [cellKey]: nextLock }));
        await broadcastEvent('cell_lock_request', { ...nextLock });
        return true;
    }, [broadcastEvent, currentUser, locksByCell]);

    const releaseLock = useCallback(async (cellKey: string) => {
        if (!currentUser) return;

        setLocksByCell((prev) => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
        });

        await broadcastEvent('cell_lock_release', {
            cellKey,
            clientId: currentUser.clientId,
        });
    }, [broadcastEvent, currentUser]);

    const releaseAllOwnedLocks = useCallback(async () => {
        if (!currentUser) return;
        const ownedLocks = Object.values(locksByCell).filter((lock) => lock.clientId === currentUser.clientId);
        for (const lock of ownedLocks) {
            await releaseLock(lock.cellKey);
        }
    }, [currentUser, locksByCell, releaseLock]);

    const isCellLocked = useCallback((cellKey: string, localClientId?: string) => {
        const lock = locksByCell[cellKey];
        if (!lock || isExpired(lock)) return false;
        if (localClientId && lock.clientId === localClientId) return false;
        return true;
    }, [locksByCell]);

    const getCellLockOwner = useCallback((cellKey: string) => {
        const lock = locksByCell[cellKey];
        if (!lock || isExpired(lock)) return null;
        return lock;
    }, [locksByCell]);

    const api = useMemo(() => ({
        locksByCell,
        statusMessage,
        requestLock,
        releaseLock,
        releaseAllOwnedLocks,
        isCellLocked,
        getCellLockOwner,
        broadcastCellFocus: (cellKey: string) => broadcastEvent('cell_focus', { cellKey, clientId: currentUser?.clientId || null }),
        broadcastCellBlur: (cellKey: string) => broadcastEvent('cell_blur', { cellKey, clientId: currentUser?.clientId || null }),
        broadcastEditStart: (cellKey: string) => broadcastEvent('cell_edit_start', { cellKey, clientId: currentUser?.clientId || null }),
        broadcastEditEnd: (cellKey: string) => broadcastEvent('cell_edit_end', { cellKey, clientId: currentUser?.clientId || null }),
    }), [
        locksByCell,
        statusMessage,
        requestLock,
        releaseLock,
        releaseAllOwnedLocks,
        isCellLocked,
        getCellLockOwner,
        broadcastEvent,
        currentUser?.clientId,
    ]);

    return api;
}
