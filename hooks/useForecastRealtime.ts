'use client';

import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useForecastRealtime(forecastId: string, onDataChanged: () => void) {
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);

    useEffect(() => {
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

        setChannel(realtimeChannel);

        const subscription = realtimeChannel.subscribe((status) => {
            setConnectionStatus(status);
        });

        return () => {
            void subscription.unsubscribe();
            void supabase.removeChannel(realtimeChannel);
            setChannel(null);
        };
    }, [forecastId, onDataChanged]);

    return {
        channel,
        connectionStatus,
    };
}
