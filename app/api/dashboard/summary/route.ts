import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedDashboardSummary:
    | {
          expiresAt: number;
          payload: any;
      }
    | null = null;

export async function GET() {
    try {
        const now = Date.now();
        if (cachedDashboardSummary && cachedDashboardSummary.expiresAt > now) {
            return NextResponse.json(cachedDashboardSummary.payload, {
                headers: {
                    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
                },
            });
        }

        const thisMonth = new Date().toISOString().slice(0, 7);
        
        // Parallel fetching of core dashboard metrics
        const [
            customersRes,
            interactionsRes,
            revenueRes,
            backlogCategoryRes,
            backlogSummaryRes
        ] = await Promise.all([
            // 1. Customers (For KPI counts)
            supabase.from('customers').select('id, status, region'),
            
            // 2. Interactions (Recent + This Month check)
            supabase.from('interactions')
                .select('id, customer_id, date, attendee, sales_topic, fae_topic, customers (company_name, region)')
                .order('date', { ascending: false })
                .limit(50),
            
            // 3. Revenue by category (current year+)
            supabase.from('revenue_data').select('category_name, ship_amt').gte('shipdate', '2024-01-01'),
            
            // 4. Backlog by category
            supabase.from('backlog_excel_data').select('category_name, amt'),
            
            // 5. Backlog summary (custom orders)
            supabase.from('backlog_orders').select('category, amount')
        ]);

        if (customersRes.error) throw customersRes.error;
        if (interactionsRes.error) throw interactionsRes.error;
        if (revenueRes.error) throw revenueRes.error;
        if (backlogCategoryRes.error) throw backlogCategoryRes.error;
        if (backlogSummaryRes.error) throw backlogSummaryRes.error;

        // Process Customers
        const customers = customersRes.data || [];
        const activeCustomers = customers.filter(c => c.status === 'Active').length;
        
        const regionMap: Record<string, number> = {};
        customers.forEach(c => {
            const r = c.region || 'Unknown';
            regionMap[r] = (regionMap[r] || 0) + 1;
        });
        const customersByRegion = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

        // Process Interactions (Flatten and map for compatibility)
        const interactions = (interactionsRes.data || []).map((ix: any) => ({
            ...ix,
            client_id: ix.customer_id,
            company_name: ix.customers?.company_name,
            region: ix.customers?.region
        }));
        const interactionsThisMonth = interactions.filter(i => i.date && i.date.startsWith(thisMonth)).length;

        // Process Revenue by Category
        const revMap: Record<string, number> = {};
        (revenueRes.data || []).forEach(r => {
            const cat = r.category_name || 'Other';
            revMap[cat] = (revMap[cat] || 0) + (r.ship_amt || 0);
        });
        const revenueByCategory = Object.entries(revMap).map(([category, total]) => ({ category, total })).sort((a,b) => b.total - a.total);

        // Process Backlog
        const backlogMap: Record<string, number> = {};
        let backlogTotal = 0;
        (backlogCategoryRes.data || []).forEach(r => {
            const cat = r.category_name || 'Other';
            backlogMap[cat] = (backlogMap[cat] || 0) + (r.amt || 0);
            backlogTotal += (r.amt || 0);
        });
        (backlogSummaryRes.data || []).forEach(r => {
            const cat = r.category || 'Other';
            backlogMap[cat] = (backlogMap[cat] || 0) + (r.amount || 0);
            backlogTotal += (r.amount || 0);
        });
        const backlogByCategory = Object.entries(backlogMap).map(([category, total]) => ({ category, total })).sort((a,b) => b.total - a.total);

        const payload = {
            kpi: {
                totalCustomers: customers.length,
                activeCustomers: activeCustomers,
                interactionsThisMonth,
                totalInteractions: interactions.length, 
                avgInteractions: customers.length > 0 ? (interactions.length / customers.length).toFixed(1) : '0'
            },
            clients: [], 
            interactions: interactions.slice(0, 10), 
            customersByRegion,
            revenueByCategory,
            backlogByCategory,
            backlogTotal
        };

        cachedDashboardSummary = {
            expiresAt: now + DASHBOARD_CACHE_TTL_MS,
            payload,
        };

        return NextResponse.json(payload, {
            headers: {
                'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
            },
        });

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
