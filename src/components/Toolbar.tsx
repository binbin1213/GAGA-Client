import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';

interface ToolbarProps {
  taskCount: number;
  onAddTask: () => void;
}

export function Toolbar({ taskCount, onAddTask }: ToolbarProps) {

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
    <div style={toolbarStyle} role="toolbar" aria-label="下载工具栏">
      {/* 左侧按钮组 */}
      <div style={leftGroupStyle}>
        <button
          className="btn-icon"
          style={iconButtonStyle}
          onClick={onAddTask}
          title="添加任务"
          aria-label="添加新的下载任务"
        >
          ➕
        </button>
      </div>

      {/* 中间任务计数 */}
      <div style={centerTextStyle} role="status" aria-live="polite">
        {taskCount === 0 ? '暂无任务' : taskCount === 1 ? '1 个下载' : `${taskCount} 个任务`}
      </div>

      {/* 右侧按钮组（预留，保持对称） */}
      <div style={rightGroupStyle}>
        {/* 可以添加搜索、暂停等功能 */}
      </div>
    </div>
  );
}
