import type { CSSProperties, ReactNode } from 'react';
import { downieTheme } from '../../styles/downie-theme';

type AppRouteKey = 'tasks' | 'history' | 'settings' | 'logs';

export interface AppLayoutProps {
  active: AppRouteKey;
  onNavigate?: (target: AppRouteKey) => void;
  children: ReactNode;
}

const itemMeta: Record<AppRouteKey, { label: string; icon: string }> = {
  tasks: {
    label: '下载任务',
    icon: '📥',
  },
  history: {
    label: '下载历史',
    icon: '🗂️',
  },
  settings: {
    label: '应用设置',
    icon: '⚙️',
  },
  logs: {
    label: '日志管理',
    icon: '📄',
  },
};

export function AppLayout({ active, onNavigate, children }: AppLayoutProps) {
  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    background: 'transparent',
    fontFamily: "'SF Pro Display', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: downieTheme.colors.text.primary,
  };

  const sidebarStyle: CSSProperties = {
    width: 168,
    padding: '28px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
    background: 'transparent',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderRight: '1px solid rgba(0,0,0,0.08)',
    boxSizing: 'border-box',
  };

  const brandContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '2px 0',
  };

  const brandBadgeStyle: CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #ff92a0, #8f7bff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: '#ffffff',
  };

  const brandTextBlockStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    lineHeight: 1,
  };

  const brandTitleStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1d1d1f',
    letterSpacing: '0.25px',
  };

  const brandSubtitleStyle: CSSProperties = {
    fontSize: '10px',
    letterSpacing: '1.4px',
    color: 'rgba(60,60,67,0.5)',
    textTransform: 'uppercase' as const,
  };

  const navListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
  };

  const navItemStyle = (isActive: boolean): CSSProperties => ({
    width: '100%',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 14px',
    borderRadius: 10,
    background: isActive ? '#2f74ff' : 'rgba(247,247,248,0.85)',
    color: isActive ? '#ffffff' : 'rgba(60,60,67,0.75)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
    whiteSpace: 'nowrap',
    border: 'none',
  });

  const iconWrapStyle = (isActive: boolean): CSSProperties => ({
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    opacity: isActive ? 1 : 0.92,
  });

  const mainStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(60px) saturate(200%)',
    WebkitBackdropFilter: 'blur(60px) saturate(200%)',
    padding: '28px 40px 28px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
  };

  const contentWrapperStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
  };

  return (
    <div style={containerStyle}>
      <aside style={sidebarStyle}>
        <div style={brandContainerStyle}>
          <div style={brandBadgeStyle}>GC</div>
          <div style={brandTextBlockStyle}>
            <span style={brandTitleStyle}>GAGA Client</span>
            <span style={brandSubtitleStyle}>MEDIA UTILITY</span>
          </div>
        </div>
        <nav style={navListStyle}>
          {(Object.keys(itemMeta) as AppRouteKey[]).map((key) => {
            const { label, icon } = itemMeta[key];
            const isActive = key === active;
            return (
              <button
                type="button"
                key={key}
                style={navItemStyle(isActive)}
                onClick={() => onNavigate?.(key)}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.background = 'rgba(47,116,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.background = 'rgba(247,247,248,0.85)';
                }}
              >
                <span style={iconWrapStyle(isActive)}>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={mainStyle}>
        <div style={contentWrapperStyle}>{children}</div>
      </main>
    </div>
  );
}

