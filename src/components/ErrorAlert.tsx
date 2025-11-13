import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

/**
 * 错误提示组件
 * 用于显示错误信息和重试选项
 */
export function ErrorAlert({ title = '出现问题', message, onDismiss, onRetry }: ErrorAlertProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: downieTheme.spacing.lg,
    padding: downieTheme.spacing.lg,
    background: 'rgba(255, 59, 48, 0.08)',
    border: `1px solid rgba(255, 59, 48, 0.3)`,
    borderRadius: downieTheme.radius.card,
    fontFamily: downieTheme.fonts.system,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xs,
  };

  const titleStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.title,
    fontWeight: downieTheme.fontWeights.semibold,
    color: '#ff3b30',
  };

  const messageStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    color: 'rgba(60, 60, 67, 0.8)',
    lineHeight: 1.5,
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: downieTheme.spacing.sm,
    alignItems: 'center',
  };

  const buttonStyle: CSSProperties = {
    padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.lg}`,
    borderRadius: downieTheme.radius.button,
    border: 'none',
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.semibold,
    cursor: 'pointer',
    transition: `all ${downieTheme.transitions.fast}`,
    fontFamily: downieTheme.fonts.system,
  };

  const dismissButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: 'rgba(0, 0, 0, 0.06)',
    color: downieTheme.colors.text.secondary,
  };

  const retryButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: '#ff3b30',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(255, 59, 48, 0.25)',
  };

  return (
    <div style={containerStyle} role="alert" aria-live="assertive" aria-atomic="true">
      <div style={contentStyle}>
        <div style={titleStyle}>{title}</div>
        <div style={messageStyle}>{message}</div>
      </div>
      <div style={actionsStyle}>
        {onRetry && (
          <button
            className="btn-primary"
            style={retryButtonStyle}
            onClick={onRetry}
            aria-label="重试操作"
          >
            重试
          </button>
        )}
        {onDismiss && (
          <button
            className="btn-secondary"
            style={dismissButtonStyle}
            onClick={onDismiss}
            aria-label="关闭错误提示"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
