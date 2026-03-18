import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchLegacyProductCharacteristics, parseLegacyForecastCsv } from '@/lib/forecastLegacy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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
      if (typeof body.csvText !== 'string' || !body.csvText.trim()) {
        return NextResponse.json({ error: 'CSV content is required.' }, { status: 400 });
      }
      rows = parseLegacyForecastCsv(body.csvText, forecastId);
      productCharacteristics = body.productCharacteristics || {};
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No legacy forecast rows were found.' }, { status: 404 });
    }

    const entryPayload = rows.map((row) => ({
      forecast_id: forecastId,
      model: row.model,
      customer: row.customer,
      standard: row.standard,
      application: row.application,
      location: row.location,
    }));

    const { error: deleteValuesError } = await supabase
      .from('forecast_month_values')
      .delete()
      .eq('forecast_id', forecastId);
    if (deleteValuesError) throw deleteValuesError;

    const { error: deleteEntriesError } = await supabase
      .from('forecast_entries')
      .delete()
      .eq('forecast_id', forecastId);
    if (deleteEntriesError) throw deleteEntriesError;

    const { data: insertedEntries, error: insertEntriesError } = await supabase
      .from('forecast_entries')
      .insert(entryPayload)
      .select('id, model, customer, standard, application, location');
    if (insertEntriesError) throw insertEntriesError;

    const entryIdByKey = new Map(
      (insertedEntries || []).map((entry) => [
        `${entry.model}|${entry.customer}|${entry.standard}|${entry.application}|${entry.location}`,
        entry.id,
      ])
    );

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
      importedMonthValues: monthValuePayload.length,
    });
  } catch (error: any) {
    console.error('Forecast import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
