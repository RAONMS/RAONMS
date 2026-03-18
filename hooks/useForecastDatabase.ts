'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    emptyForecastMonthData,
    ForecastEntryInput,
    ForecastMonthData,
    ForecastRow,
} from '@/lib/forecast';

interface ForecastEntryRecord {
    id: string;
    forecast_id: string;
    model: string;
    customer: string;
    standard: string;
    application: string;
    location: string;
}

interface ForecastValueRecord {
    entry_id: string;
    month_key: string;
    fcst_qty: number | null;
    fcst_asp: number | null;
    fcst_amt: number | null;
    plan_qty: number | null;
    plan_asp: number | null;
    plan_amt: number | null;
}

interface ForecastUser {
    id: string;
    email: string;
    displayName: string;
}

function buildForecastRows(entries: ForecastEntryRecord[], values: ForecastValueRecord[]): ForecastRow[] {
    const valueMap = new Map<string, ForecastRow>();

    entries.forEach((entry) => {
        valueMap.set(entry.id, {
            id: entry.id,
            forecastId: entry.forecast_id,
            model: entry.model,
            customer: entry.customer,
            standard: entry.standard,
            application: entry.application,
            location: entry.location,
            data: {},
        });
    });

    values.forEach((value) => {
        const row = valueMap.get(value.entry_id);
        if (!row) return;

        row.data[value.month_key] = {
            fcstQty: Number(value.fcst_qty || 0),
            fcstAsp: Number(value.fcst_asp || 0),
            fcstAmt: Number(value.fcst_amt || 0),
            planQty: Number(value.plan_qty || 0),
            planAsp: Number(value.plan_asp || 0),
            planAmt: Number(value.plan_amt || 0),
        };
    });

    return Array.from(valueMap.values());
}

export function useForecastDatabase(forecastId: string) {
    const [forecastData, setForecastData] = useState<ForecastRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<ForecastUser | null>(null);

    useEffect(() => {
        let active = true;

        supabase.auth.getUser().then(({ data, error: userError }) => {
            if (!active || userError) return;
            const user = data.user;
            if (!user) return;
            const metadataName =
                typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name :
                typeof user.user_metadata?.name === 'string' ? user.user_metadata.name :
                typeof user.email === 'string' ? user.email :
                'Unknown user';

            setCurrentUser({
                id: user.id,
                email: user.email || '',
                displayName: metadataName,
            });
        });

        return () => {
            active = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data: entries, error: entriesError } = await supabase
            .from('forecast_entries')
            .select('id, forecast_id, model, customer, standard, application, location')
            .eq('forecast_id', forecastId)
            .order('model', { ascending: true })
            .order('customer', { ascending: true });

        if (entriesError) {
            setError(entriesError.message);
            setLoading(false);
            return;
        }

        const entryIds = (entries || []).map((entry) => entry.id);
        let values: ForecastValueRecord[] = [];

        if (entryIds.length > 0) {
            const { data: monthValues, error: valuesError } = await supabase
                .from('forecast_month_values')
                .select('entry_id, month_key, fcst_qty, fcst_asp, fcst_amt, plan_qty, plan_asp, plan_amt')
                .eq('forecast_id', forecastId)
                .in('entry_id', entryIds);

            if (valuesError) {
                setError(valuesError.message);
                setLoading(false);
                return;
            }

            values = monthValues || [];
        }

        setForecastData(buildForecastRows(entries || [], values));
        setLoading(false);
    }, [forecastId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const saveForecastData = useCallback(async (rows: ForecastRow[]) => {
        setSaving(true);
        setError(null);

        const payload = rows.flatMap((row) =>
            Object.entries(row.data || {}).map(([monthKey, metrics]) => {
                const safeMetrics = metrics || emptyForecastMonthData();
                return {
                    forecast_id: forecastId,
                    entry_id: row.id,
                    month_key: monthKey,
                    fcst_qty: Number((safeMetrics as ForecastMonthData).fcstQty || 0),
                    fcst_asp: Number((safeMetrics as ForecastMonthData).fcstAsp || 0),
                    fcst_amt: Number((safeMetrics as ForecastMonthData).fcstAmt || 0),
                    plan_qty: Number((safeMetrics as ForecastMonthData).planQty || 0),
                    plan_asp: Number((safeMetrics as ForecastMonthData).planAsp || 0),
                    plan_amt: Number((safeMetrics as ForecastMonthData).planAmt || 0),
                    updated_by: currentUser?.id || null,
                };
            })
        );

        const { error: saveError } = payload.length === 0
            ? { error: null }
            : await supabase
                  .from('forecast_month_values')
                  .upsert(payload, { onConflict: 'entry_id,month_key' });

        if (saveError) {
            setSaving(false);
            setError(saveError.message);
            throw saveError;
        }

        setSaving(false);
    }, [currentUser?.id, forecastId]);

    const addForecastEntry = useCallback(async (entry: ForecastEntryInput) => {
        const payload = {
            forecast_id: forecastId,
            model: entry.model.trim(),
            customer: entry.customer.trim(),
            standard: entry.standard.trim(),
            application: entry.application.trim(),
            location: entry.location.trim(),
            created_by: currentUser?.id || null,
            updated_by: currentUser?.id || null,
        };

        const { data, error: insertError } = await supabase
            .from('forecast_entries')
            .insert(payload)
            .select('id, forecast_id, model, customer, standard, application, location')
            .single();

        if (insertError) {
            setError(insertError.message);
            throw insertError;
        }

        setForecastData((prev) => [
            ...prev,
            {
                id: data.id,
                forecastId: data.forecast_id,
                model: data.model,
                customer: data.customer,
                standard: data.standard,
                application: data.application,
                location: data.location,
                data: {},
            },
        ]);

        return data;
    }, [currentUser?.id, forecastId]);

    return {
        forecastData,
        setForecastData,
        loading,
        saving,
        error,
        currentUser,
        refresh,
        saveForecastData,
        addForecastEntry,
    };
}
