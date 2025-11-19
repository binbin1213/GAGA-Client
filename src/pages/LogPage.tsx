import type { CSSProperties } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { LogViewer } from '../components/LogViewer';
import { navigate } from '../utils/navigation';

export default function LogPage() {
  const handleNavigate = (target: 'tasks' | 'history' | 'settings' | 'logs') => {
    if (target === 'logs') return;
    const routeMap: Record<'tasks' | 'history' | 'settings' | 'logs', '/' | '/history' | '/settings' | '/logs'> = {
      tasks: '/',
      history: '/history',
      settings: '/settings',
      logs: '/logs',
    };
    navigate(routeMap[target]);
  };

  const pageContainerStyle: CSSProperties = {
    maxWidth: 960, // 给予更宽敞的布局
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px 24px 36px',
    margin: '0 auto',
  };

  return (
    <AppLayout active="logs" onNavigate={handleNavigate}>
      <div style={pageContainerStyle}>
        <LogViewer />
      </div>
    </AppLayout>
  );
}