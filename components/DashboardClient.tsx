'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { loadSettings, DashboardSettings, DEFAULT_SETTINGS } from '@/lib/settings';

interface Interaction {
  id: number;
  client_id: number;
  company_name: string;
  region: string;
  date: string;
  attendee: string;
  sales_topic: string;
  fae_topic: string;
}

interface CategoryData {
  category: string;
  total: number;
}

const REGION_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];
const PRODUCT_COLORS: Record<string, string> = {
  'Mobile TV': '#4F46E5',
  'Micro Display': '#10B981',
  'Materials': '#F59E0B',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function buildWeeklyTrend(interactions: Interaction[], weeks: number) {
  const weekData: Record<string, number> = {};
  const now = new Date();
  for (let i = weeks; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const label = `W${weeks - i + 1}`;
    weekData[label] = 0;
  }
  interactions.forEach(ix => {
    const d = new Date(ix.date);
    const msAgo = now.getTime() - d.getTime();
    const weeksAgo = Math.floor(msAgo / (7 * 24 * 60 * 60 * 1000));
    if (weeksAgo <= weeks) {
      const label = `W${weeks - weeksAgo + 1}`;
      if (weekData[label] !== undefined) weekData[label]++;
    }
  });
  return Object.entries(weekData).map(([week, count]) => ({ week, count }));
}

export default function DashboardClient() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [revCategory, setRevCategory] = useState<CategoryData[]>([]);
  const [backlogCategory, setBacklogCategory] = useState<CategoryData[]>([]);
  const [backlogTotal, setBacklogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const load = () => {
    setLoading(true);
    const s = loadSettings();
    setSettings(s);

    fetch('/api/dashboard/summary')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setDashboardData(data);
        setInteractions(data.interactions || []);
        setRevCategory(data.revenueByCategory || []);
        setBacklogCategory(data.backlogByCategory || []);
        setBacklogTotal(data.backlogTotal || 0);
        setError(null);
      })
      .catch(err => {
        console.error('Dashboard load error:', err);
        setError(err.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

  if (error) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ color: '#EF4444', marginBottom: 12 }}>{error}</div>
      <button className="btn btn-secondary" onClick={() => load()}>Retry</button>
    </div>
  );

  const kpi = dashboardData?.kpi || {
    totalCustomers: 0,
    activeCustomers: 0,
    interactionsThisMonth: 0,
    totalInteractions: 0,
    avgInteractions: '0'
  };

  const safeInteractions = Array.isArray(interactions) ? interactions : [];
  const weeklyTrend = buildWeeklyTrend(safeInteractions, settings.interactionTrendWeeks);
  const regionData = dashboardData?.customersByRegion || [];

  const recentInteractions = safeInteractions.slice(0, settings.recentInteractionsCount);

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--color-primary-soft)' }}>🏢</div>
          <div className="kpi-label">Total Customers</div>
          <div className="kpi-value">{kpi.totalCustomers}</div>
          <div className="kpi-change">All registered</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--color-success-soft)' }}>✅</div>
          <div className="kpi-label">Active Customers</div>
          <div className="kpi-value">{kpi.activeCustomers}</div>
          <div className="kpi-change">{kpi.totalCustomers > 0 ? Math.round((kpi.activeCustomers / kpi.totalCustomers) * 100) : 0}% of total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--color-warning-soft)' }}>💬</div>
          <div className="kpi-label">Interactions This Month</div>
          <div className="kpi-value">{kpi.interactionsThisMonth}</div>
          <div className="kpi-change">{kpi.totalInteractions} monitored</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--color-info-soft)' }}>📊</div>
          <div className="kpi-label">Avg Interactions / Customer</div>
          <div className="kpi-value">{kpi.avgInteractions}</div>
          <div className="kpi-change">Dashboard benchmark</div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24
      }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ padding: '16px 16px 0' }}>
            <div>
              <div className="card-title" style={{ fontSize: 13 }}>Interaction Trend</div>
              <div className="card-subtitle" style={{ fontSize: 11 }}>Last {settings.interactionTrendWeeks} weeks</div>
            </div>
          </div>
          <div className="chart-container" style={{ padding: 10 }}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weeklyTrend} margin={{ top: 4, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11, padding: 6 }} />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ padding: '16px 16px 0' }}>
            <div>
              <div className="card-title" style={{ fontSize: 13 }}>Customers by Region</div>
            </div>
          </div>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
            {regionData.length === 0 ? (
              <div className="empty-state" style={{ fontSize: 12 }}><p>No region data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={regionData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {regionData.map((_: any, index: number) => (
                      <Cell key={index} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11, padding: 6 }} />
                  <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, bottom: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ padding: '16px 16px 0' }}>
            <div>
              <div className="card-title" style={{ fontSize: 13 }}>Revenue by Category</div>
            </div>
          </div>
          <div className="chart-container" style={{ padding: 10 }}>
            {revCategory.length === 0 ? (
              <div className="empty-state" style={{ fontSize: 12 }}><p>No revenue data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={revCategory.slice(0, 5)} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11, padding: 6 }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {revCategory.slice(0, 5).map((entry, index) => (
                      <Cell key={index} fill={PRODUCT_COLORS[entry.category] || '#4F46E5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ padding: '16px 16px 0' }}>
            <div>
              <div className="card-title" style={{ fontSize: 13 }}>Backlog by Category</div>
              <div className="card-subtitle" style={{ fontSize: 11 }}>Total {backlogTotal.toLocaleString()}</div>
            </div>
          </div>
          <div className="chart-container" style={{ padding: 10 }}>
            {backlogCategory.length === 0 ? (
              <div className="empty-state" style={{ fontSize: 12 }}><p>No backlog data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={backlogCategory.slice(0, 5)} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11, padding: 6 }} />
                  <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Interactions</div>
            <div className="card-subtitle">Latest customer touchpoints</div>
          </div>
          <Link href="/interactions" className="btn btn-secondary">View All</Link>
        </div>
        {recentInteractions.length === 0 ? (
          <div className="empty-state"><p>No interactions yet.</p></div>
        ) : (
          <div className="activity-list">
            {recentInteractions.map((ix) => (
              <article key={ix.id} className="activity-item">
                <div className="activity-avatar">{getInitials(ix.company_name || 'NA')}</div>
                <div className="activity-body">
                  <div className="activity-title-row">
                    <h3 className="activity-title">{ix.company_name || 'Unknown customer'}</h3>
                    <span className="badge badge-region">{ix.region || 'Unknown region'}</span>
                  </div>
                  <div className="activity-meta">
                    <span>{formatDate(ix.date)}</span>
                    <span>{ix.attendee || 'No attendee listed'}</span>
                  </div>
                  <div className="activity-summary-list">
                  {ix.sales_topic && (
                    <section className="activity-summary-block activity-summary-sales">
                      <div className="activity-summary-label">Sales Summary</div>
                      <p>{truncate(ix.sales_topic, 160)}</p>
                    </section>
                  )}
                  {ix.fae_topic && (
                    <section className="activity-summary-block activity-summary-fae">
                      <div className="activity-summary-label">FAE Summary</div>
                      <p>{truncate(ix.fae_topic, 160)}</p>
                    </section>
                  )}
                  {!ix.sales_topic && !ix.fae_topic && (
                    <section className="activity-summary-block">
                      <div className="activity-summary-label">Summary</div>
                      <p>No summary provided.</p>
                    </section>
                  )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
