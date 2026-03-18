import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('@/components/DashboardClient'), {
  loading: () => (
    <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>
      Loading dashboard...
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardClient />;
}
