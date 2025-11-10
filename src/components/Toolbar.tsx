import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import { openWindow } from '../utils/windowManager';

interface ToolbarProps {
  taskCount: number;
  onAddTask: () => void;
}

export function Toolbar({ taskCount, onAddTask }: ToolbarProps) {
  const handleShowHistory = () => {
    openWindow('history').catch((error) => {
      console.error('打开历史记录窗口失败:', error);
    });
  };

  const handleShowSettings = () => {
    openWindow('settings').catch((error) => {
      console.error('打开设置窗口失败:', error);
    });
  };

  const toolbarStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: downieTheme.sizes.toolbar.height,
    background: downieTheme.glass.toolbar.background,
    backdropFilter: downieTheme.glass.toolbar.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.toolbar.backdropFilter,
    borderTop: `0.5px solid ${downieTheme.colors.border.light}`,
    boxShadow: downieTheme.shadows.toolbar,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${downieTheme.spacing.lg}`,
    fontFamily: downieTheme.fonts.system,
    zIndex: 100,
  };

  const leftGroupStyle: CSSProperties = {
    display: 'flex',
    gap: downieTheme.spacing.xs,
    alignItems: 'center',
  };

  const centerTextStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    color: downieTheme.colors.text.tertiary,
    fontWeight: downieTheme.fontWeights.regular,
  };

  const rightGroupStyle: CSSProperties = {
    display: 'flex',
    gap: downieTheme.spacing.xs,
    alignItems: 'center',
    minWidth: '100px',
  };

  const iconButtonStyle: CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: downieTheme.radius.button,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    transition: `all ${downieTheme.transitions.fast}`,
    color: downieTheme.colors.text.secondary,
  };

  return (
    <div style={toolbarStyle}>
      {/* 左侧按钮组 */}
      <div style={leftGroupStyle}>
        <button
          style={iconButtonStyle}
          onClick={onAddTask}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="添加任务"
        >
          ➕
        </button>
        <button
          style={iconButtonStyle}
          onClick={handleShowHistory}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="历史记录"
        >
          📋
        </button>
        <button
          style={iconButtonStyle}
          onClick={handleShowSettings}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="设置"
        >
          ⚙️
        </button>
      </div>

      {/* 中间任务计数 */}
      <div style={centerTextStyle}>
        {taskCount === 0 ? '无任务' : taskCount === 1 ? '1 个下载' : `${taskCount} 个任务`}
      </div>

      {/* 右侧按钮组（预留，保持对称） */}
      <div style={rightGroupStyle}>
        {/* 可以添加搜索、暂停等功能 */}
      </div>
    </div>
  );
}
