import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { readHistory, clearHistory } from '../utils/history';
import type { DownloadRecord } from '../types/history';
import { AppLayout } from '../components/layout/AppLayout';
import { navigate } from '../utils/navigation';
import { confirm } from '@tauri-apps/plugin-dialog';

const baseFontFamily = "'SF Pro Display', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const pageContainerStyle: CSSProperties = {
  maxWidth: 720,
  width: '100%',
  margin: '0 auto 40px',
  padding: '24px 0 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  fontFamily: baseFontFamily,
};

const sectionWrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 500,
  color: 'rgba(60,60,67,0.8)',
  margin: 0,
};

const listCardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(0,0,0,0.05)',
  borderRadius: 18,
  padding: 16,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 10px 30px rgba(15,15,15,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const itemRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  padding: '12px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.85)',
  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
};

const itemInfoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
};

const itemTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

const itemTitleStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#1f1f1f',
  lineHeight: 1.4,
};

const timestampStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(60,60,67,0.55)',
  lineHeight: 1.4,
};

const pathStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(60,60,67,0.5)',
  fontFamily: "'SF Mono', ui-monospace, Menlo, Monaco, monospace",
};

const iconStyle = (color: string): CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color,
  display: 'flex',
  alignItems: 'center',
  lineHeight: 1,
});

const actionButtonStyle: CSSProperties = {
  background: '#f5f5f5',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: '14px',
  color: '#333333',
  cursor: 'pointer',
  transition: 'background 0.2s ease, transform 0.1s ease',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const clearButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 8px',
  fontSize: '12px',
  color: 'rgba(60,60,67,0.6)',
  cursor: 'pointer',
  borderRadius: '6px',
  transition: 'background 0.2s ease',
};



function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      style={actionButtonStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#ebebeb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#f5f5f5';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}

const getIcon = (status: DownloadRecord['status']) => {
  if (status === 'completed') {
    return { glyph: '✓', color: '#00c853' };
  }
  if (status === 'failed') {
    return { glyph: 'X', color: '#ff3b30' };
  }
  return { glyph: '…', color: '#ffab00' };
};

export default function HistoryPage() {
  const [history, setHistory] = useState<DownloadRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const historyData = await readHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  const handleNavigate = (target: 'tasks' | 'history' | 'settings' | 'logs') => {
    if (target === 'history') return;
    const routeMap: Record<'tasks' | 'history' | 'settings' | 'logs', '/' | '/history' | '/settings' | '/logs'> = {
      tasks: '/',
      history: '/history',
      settings: '/settings',
      logs: '/logs',
    };
    navigate(routeMap[target]);
  };

  const handleShowInFinder = (filePath: string) => {
    console.log('在 Finder 中显示:', filePath);
  };

  const handleClearHistory = async () => {
    const confirmed = await confirm('确定要清除所有历史记录吗？此操作不可撤销。', {
      title: '确认清除',
      okLabel: '确认',
      cancelLabel: '取消',
    });
    if (confirmed) {
      try {
        await clearHistory();
        await loadHistory(); // 重新加载历史记录
      } catch (error) {
        console.error('清除历史记录失败:', error);
      }
    }
  };

  const renderItem = (item: DownloadRecord, index: number) => {
    const { glyph, color } = getIcon(item.status);
    return (
      <div key={`${item.title}-${index}`} style={itemRowStyle}>
        <div style={itemInfoStyle}>
          <div style={itemTitleRowStyle}>
            <span style={iconStyle(color)}>{glyph}</span>
            <span style={itemTitleStyle}>{item.title}</span>
            <span style={timestampStyle}>
              {item.completedAt
                ? new Date(item.completedAt).toLocaleString()
                : item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : ''}
            </span>
          </div>
          {item.status === 'completed' && item.files && item.files.length > 0 ? (
            <span style={pathStyle}>{item.files[0]}</span>
          ) : null}
        </div>
        {item.status === 'completed' && item.files && item.files.length > 0 ? (
          <ActionButton onClick={() => handleShowInFinder(item.files![0])}>在 Finder 中显示</ActionButton>
        ) : null}
      </div>
    );
  };

  return (
    <AppLayout active="history" onNavigate={handleNavigate}>
      <div style={pageContainerStyle}>
        <div style={sectionWrapperStyle}>
          <div style={headerStyle}>
            <p style={sectionTitleStyle}>任务记录</p>
            {history.length > 0 && (
              <button 
                style={clearButtonStyle}
                onClick={handleClearHistory}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                清除记录
              </button>
            )}
          </div>
          <div style={listCardStyle}>
            {history.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '48px' }}>🗂️</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f1f1f' }}>暂无历史记录</span>
                <span style={{ fontSize: '13px', color: 'rgba(60,60,67,0.6)' }}>
                  完成下载后，任务会记录在此处，方便你随时查看及定位文件。
                </span>
              </div>
            ) : (
              history
                .slice()
                .reverse()
                .map(renderItem)
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
