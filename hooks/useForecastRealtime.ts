'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useForecastRealtime(forecastId: string, onDataChanged: () => void) {
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    const channel = useMemo(() => {
        const realtimeChannel = supabase.channel(`forecast:${forecastId}`, {
            config: {
                broadcast: { self: true },
            },
        });

        realtimeChannel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'forecast_entries',
                    filter: `forecast_id=eq.${forecastId}`,
                },
                () => onDataChanged()
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'forecast_month_values',
                    filter: `forecast_id=eq.${forecastId}`,
                },
                () => onDataChanged()
            );

        return realtimeChannel;
    }, [forecastId, onDataChanged]);

    useEffect(() => {
        const subscription = channel.subscribe((status) => {
            setConnectionStatus(status);
        });

        return () => {
            void subscription.unsubscribe();
            void supabase.removeChannel(channel);
        };
    }, [channel]);

    return {
        channel,
        connectionStatus,
    };
}
