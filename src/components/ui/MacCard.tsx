import type { CSSProperties, ReactNode } from 'react';
import { downieTheme } from '../../styles/downie-theme';

interface MacCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
}

export function MacCard({ title, description, actions, children, style, contentStyle }: MacCardProps) {
  const cardStyle: CSSProperties = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.38)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.04)',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.md,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    ...style,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: description ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: downieTheme.spacing.lg,
  };

  const titleBlockStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xs,
  };

  return (
    <section style={cardStyle}>
      {(title || description || actions) && (
        <header style={headerStyle}>
          <div style={titleBlockStyle}>
            {title && (
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: downieTheme.fontWeights.semibold,
                  color: downieTheme.colors.text.primary,
                }}
              >
                {title}
              </span>
            )}
            {description && (
              <span
                style={{
                  fontSize: '13px',
                  color: downieTheme.colors.text.secondary,
                  maxWidth: '520px',
                  lineHeight: 1.5,
                }}
              >
                {description}
              </span>
            )}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: downieTheme.spacing.sm }}>{actions}</div>}
        </header>
      )}

      {children && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: downieTheme.spacing.base,
            ...contentStyle,
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

