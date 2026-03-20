import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from '@/lib/supabasePublicConfig';
import { parseLegacyForecastCsv, parseLegacyForecastRecords, type LegacyForecastRecord } from '@/lib/forecastLegacy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const { url, anonKey } = getSupabasePublicConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to import forecast data.' }, { status: 401 });
    }

    let forecastId = 'default';
    let rows;
    let productCharacteristics = {};

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      forecastId = String(formData.get('forecastId') || 'default');
      const csvFile = formData.get('file');
      const characteristicsFile = formData.get('characteristicsFile');

      if (!(csvFile instanceof File)) {
        return NextResponse.json({ error: 'CSV file is required.' }, { status: 400 });
      }

      rows = parseLegacyForecastCsv(await csvFile.text(), forecastId);

      if (characteristicsFile instanceof File) {
        productCharacteristics = JSON.parse(await characteristicsFile.text());
      }
    } else {
      const body = await req.json().catch(() => ({}));
      forecastId = body.forecastId || 'default';
      if (Array.isArray(body.rows) && body.rows.length > 0) {
        rows = parseLegacyForecastRecords(body.rows as LegacyForecastRecord[], forecastId);
      } else if (typeof body.csvText === 'string' && body.csvText.trim()) {
        rows = parseLegacyForecastCsv(body.csvText, forecastId);
      } else {
        return NextResponse.json({ error: 'CSV content or normalized workbook rows are required.' }, { status: 400 });
      }
      productCharacteristics = body.productCharacteristics || {};
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No legacy forecast rows were found.' }, { status: 404 });
    }

    const uniqueImportedEntries = Array.from(
      new Map(
        rows.map((row) => {
          const key = `${row.model}|${row.customer}|${row.standard}|${row.application}|${row.location}`;
          return [
            key,
            {
              forecast_id: forecastId,
              model: row.model,
              customer: row.customer,
              standard: row.standard,
              application: row.application,
              location: row.location,
              created_by: user.id,
              updated_by: user.id,
            },
          ];
        })
      ).entries()
    );

    const { data: existingEntries, error: existingEntriesError } = await supabase
      .from('forecast_entries')
      .select('id, model, customer, standard, application, location')
      .eq('forecast_id', forecastId);
    if (existingEntriesError) throw existingEntriesError;

    const existingEntryIdByKey = new Map(
      (existingEntries || []).map((entry) => [
        `${entry.model}|${entry.customer}|${entry.standard}|${entry.application}|${entry.location}`,
        entry.id,
      ])
    );

    const newEntryPayload = uniqueImportedEntries
      .filter(([key]) => !existingEntryIdByKey.has(key))
      .map(([, payload]) => payload);

    let insertedEntries: Array<{
      id: string;
      model: string;
      customer: string;
      standard: string;
      application: string;
      location: string;
    }> = [];

    if (newEntryPayload.length > 0) {
      const { data, error: insertEntriesError } = await supabase
        .from('forecast_entries')
        .insert(newEntryPayload)
        .select('id, model, customer, standard, application, location');
      if (insertEntriesError) throw insertEntriesError;
      insertedEntries = data || [];
    }

    const entryIdByKey = new Map(existingEntryIdByKey);
    insertedEntries.forEach((entry) => {
      entryIdByKey.set(
        `${entry.model}|${entry.customer}|${entry.standard}|${entry.application}|${entry.location}`,
        entry.id
      );
    });

    const importedEntryIds = Array.from(new Set(Array.from(entryIdByKey.entries())
      .filter(([key]) => uniqueImportedEntries.some(([importedKey]) => importedKey === key))
      .map(([, id]) => id)));

    if (importedEntryIds.length > 0) {
      const { error: deleteValuesError } = await supabase
        .from('forecast_month_values')
        .delete()
        .eq('forecast_id', forecastId)
        .in('entry_id', importedEntryIds);
      if (deleteValuesError) throw deleteValuesError;
    }

    const monthValuePayload = rows.flatMap((row) => {
      const entryKey = `${row.model}|${row.customer}|${row.standard}|${row.application}|${row.location}`;
      const entryId = entryIdByKey.get(entryKey);
      if (!entryId) return [];

      return Object.entries(row.data).map(([monthKey, metrics]) => ({
        forecast_id: forecastId,
        entry_id: entryId,
        month_key: monthKey,
        fcst_qty: Number(metrics.fcstQty || 0),
        fcst_asp: Number(metrics.fcstAsp || 0),
        fcst_amt: Number(metrics.fcstAmt || 0),
        plan_qty: Number(metrics.planQty || 0),
        plan_asp: Number(metrics.planAsp || 0),
        plan_amt: Number(metrics.planAmt || 0),
        updated_by: user.id,
      }));
    });

    if (monthValuePayload.length > 0) {
      const { error: insertValuesError } = await supabase
        .from('forecast_month_values')
        .insert(monthValuePayload);
      if (insertValuesError) throw insertValuesError;
    }

    await supabase
      .from('app_settings')
      .upsert({
        key: `forecast_product_characteristics:${forecastId}`,
        value: JSON.stringify(productCharacteristics),
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      importedEntries: rows.length,
      insertedEntries: insertedEntries.length,
      updatedEntries: importedEntryIds.length - insertedEntries.length,
      importedMonthValues: monthValuePayload.length,
    });
  } catch (error: any) {
    console.error('Forecast import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
