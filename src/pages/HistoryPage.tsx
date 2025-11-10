import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import { readHistory } from '../utils/history';
import type { DownloadRecord } from '../types/history';

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



  const handleShowInFinder = (filePath: string) => {
    // TODO: 在 Finder 中显示文件
    console.log('在 Finder 中显示:', filePath);
  };

  // 样式
  const containerStyle: CSSProperties = {
    width: '100vw',
    height: '100vh',
    background: downieTheme.glass.main.background,
    backdropFilter: downieTheme.glass.main.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.main.backdropFilter,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: downieTheme.fonts.system,
  };



  const contentStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: downieTheme.spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.base,
  };

  const historyItemStyle: CSSProperties = {
    background: downieTheme.glass.card.background,
    backdropFilter: downieTheme.glass.card.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.card.backdropFilter,
    borderRadius: downieTheme.radius.card,
    boxShadow: downieTheme.shadows.card,
    padding: downieTheme.spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const itemInfoStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xs,
  };

  const itemTitleStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.title,
    fontWeight: downieTheme.fontWeights.semibold,
    color: downieTheme.colors.text.primary,
  };

  const itemDateStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    color: downieTheme.colors.text.tertiary,
  };

  const itemPathStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    color: downieTheme.colors.text.tertiary,
    fontFamily: downieTheme.fonts.mono,
  };

  const viewButtonStyle: CSSProperties = {
    padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.lg}`,
    background: downieTheme.colors.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.semibold,
    cursor: 'pointer',
    fontFamily: downieTheme.fonts.system,
  };

  const emptyStateStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: downieTheme.spacing.lg,
  };

  const emptyTextStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.title,
    color: downieTheme.colors.text.tertiary,
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      {/* 内容 */}
      <div style={contentStyle}>
        {history.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: '64px' }}>📋</div>
            <div style={emptyTextStyle}>暂无下载历史</div>
          </div>
        ) : (
          history.map((item, index) => (
            <div key={index} style={historyItemStyle}>
              <div style={itemInfoStyle}>
                <div style={itemTitleStyle}>
                  {item.status === 'completed'
                    ? '✅'
                    : item.status === 'failed'
                      ? '❌'
                      : '⏳'}{' '}
                  {item.title}
                </div>
                <div style={itemDateStyle}>
                  {item.completedAt
                    ? new Date(item.completedAt).toLocaleString()
                    : new Date(item.createdAt).toLocaleString()}
                </div>
                {item.files && item.files.length > 0 && (
                  <div style={itemPathStyle}>{item.files[0]}</div>
                )}
              </div>
              {item.status === 'completed' && item.files && item.files.length > 0 && (
                <button
                  style={viewButtonStyle}
                  onClick={() => handleShowInFinder(item.files![0])}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  查看
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
