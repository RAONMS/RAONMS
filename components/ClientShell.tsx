'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { HeaderActionsProvider } from '@/lib/HeaderActionsContext';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/customers/new': 'Add Customer',
  '/key-customers': 'Key Customers',
  '/revenue': 'Revenue',
  '/backlog': 'Backlog',
  '/interactions': 'Interactions',
  '/meetings': 'Meeting Notes',
  '/summariser': 'AI Summariser',
  '/settings': 'Settings',
  '/forecast': 'Forecast Management',
};

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const title = (() => {
    if (pathname.match(/^\/customers\/\d+/)) return 'Customer Detail';
    if (pathname.match(/^\/clients\/\d+/)) return 'Client Detail';
    return pageTitles[pathname] || 'Dashboard';
  })();

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <HeaderActionsProvider>
      <div className="app-shell">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className={`main-content${collapsed ? ' collapsed' : ''}`}>
          <Topbar collapsed={collapsed} title={title} />
          <div className={`page-content${pathname === '/forecast' ? ' full-width' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </HeaderActionsProvider>
  );
}
