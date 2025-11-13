import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import '../styles/interactions.css';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * 加载动画组件
 * 用于显示加载状态
 * 使用 CSS 动画实现，性能更优
 */
export function LoadingSpinner({ message = '加载中...', size = 'medium' }: LoadingSpinnerProps) {
  const sizeMap = {
    small: { spinner: 24, fontSize: '12px' },
    medium: { spinner: 40, fontSize: '14px' },
    large: { spinner: 56, fontSize: '16px' },
  };

  const { spinner, fontSize } = sizeMap[size];

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: downieTheme.spacing.lg,
    padding: downieTheme.spacing.xl,
  };

  const spinnerStyle: CSSProperties = {
    width: spinner,
    height: spinner,
    borderRadius: '50%',
    border: `3px solid rgba(0, 0, 0, 0.1)`,
    borderTopColor: downieTheme.colors.accent,
  };

  const messageStyle: CSSProperties = {
    fontSize: fontSize,
    color: downieTheme.colors.text.secondary,
    fontFamily: downieTheme.fonts.system,
    fontWeight: downieTheme.fontWeights.semibold,
  };

  return (
    <div style={containerStyle} role="status" aria-live="polite" aria-busy="true">
      <div className="spinner" style={spinnerStyle} aria-hidden="true" />
      {message && <div style={messageStyle}>{message}</div>}
    </div>
  );
}
