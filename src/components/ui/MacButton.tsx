import { useMemo } from 'react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { downieTheme } from '../../styles/downie-theme';
import '../../styles/interactions.css';

type MacButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface MacButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MacButtonVariant;
}

export function MacButton({ variant = 'primary', style, disabled, className, ...rest }: MacButtonProps) {
  const baseStyle: CSSProperties = useMemo(() => {
    const variants: Record<MacButtonVariant, CSSProperties> = {
      primary: {
        background: downieTheme.colors.accent,
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 8px 16px rgba(175, 82, 222, 0.12)',
      },
      secondary: {
        background: 'rgba(0, 0, 0, 0.06)',
        color: downieTheme.colors.text.secondary,
        border: `0.5px solid ${downieTheme.colors.border.light}`,
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      ghost: {
        background: 'transparent',
        color: downieTheme.colors.text.secondary,
        border: 'none',
        boxShadow: 'none',
      },
    };

    return {
      padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.lg}`,
      borderRadius: downieTheme.radius.button,
      fontSize: downieTheme.fontSizes.body,
      fontWeight: downieTheme.fontWeights.semibold,
      fontFamily: downieTheme.fonts.system,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: downieTheme.spacing.xs,
      minHeight: 32,
      opacity: disabled ? 0.6 : 1,
      ...variants[variant],
    } as CSSProperties;
  }, [variant, disabled]);

  // 根据 variant 添加对应的 CSS 类
  const buttonClass = `btn-${variant} ${className || ''}`.trim();

  return (
    <button
      style={{ ...baseStyle, ...(style || {}) }}
      disabled={disabled}
      className={buttonClass}
      {...rest}
    />
  );
}

