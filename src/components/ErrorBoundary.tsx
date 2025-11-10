import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logError } from '../utils/logger';
import { downieTheme } from '../styles/downie-theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError('React Error Boundary 捕获到错误', {
      error,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: downieTheme.glass.main.background,
          backdropFilter: downieTheme.glass.main.backdropFilter,
          WebkitBackdropFilter: downieTheme.glass.main.backdropFilter,
          padding: downieTheme.spacing.xl,
          boxSizing: 'border-box',
          fontFamily: downieTheme.fonts.system,
        }}>
          <div style={{
            maxWidth: '600px',
            background: downieTheme.glass.card.background,
            backdropFilter: downieTheme.glass.card.backdropFilter,
            WebkitBackdropFilter: downieTheme.glass.card.backdropFilter,
            padding: `${downieTheme.spacing.xl} ${downieTheme.spacing.xl}`,
            borderRadius: downieTheme.radius.card,
            boxShadow: downieTheme.shadows.card,
          }}>
            <div style={{
              fontSize: '64px',
              textAlign: 'center',
              marginBottom: downieTheme.spacing.lg,
            }}>
              ⚠️
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: downieTheme.fontWeights.semibold,
              color: downieTheme.colors.text.primary,
              marginBottom: downieTheme.spacing.base,
              textAlign: 'center',
            }}>
              应用出错了
            </h1>
            <p style={{
              fontSize: downieTheme.fontSizes.body,
              color: downieTheme.colors.text.tertiary,
              marginBottom: downieTheme.spacing.lg,
              textAlign: 'center',
              lineHeight: '1.5',
            }}>
              应用遇到了一个意外错误。您可以尝试重新加载应用。
            </p>
            {this.state.error && (
              <details style={{
                marginBottom: downieTheme.spacing.xl,
                padding: downieTheme.spacing.base,
                background: 'rgba(0, 0, 0, 0.05)',
                border: `0.5px solid ${downieTheme.colors.border.light}`,
                borderRadius: downieTheme.radius.button,
                fontSize: downieTheme.fontSizes.caption,
                fontFamily: downieTheme.fonts.mono,
                color: downieTheme.colors.text.secondary,
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  marginBottom: downieTheme.spacing.sm,
                  fontWeight: downieTheme.fontWeights.semibold,
                }}>
                  错误详情
                </summary>
                <pre style={{ 
                  margin: 0, 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  fontSize: downieTheme.fontSizes.caption,
                }}>
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: `${downieTheme.spacing.base} ${downieTheme.spacing.xl}`,
                background: downieTheme.colors.accent,
                color: '#ffffff',
                border: 'none',
                borderRadius: downieTheme.radius.button,
                fontSize: downieTheme.fontSizes.body,
                fontWeight: downieTheme.fontWeights.semibold,
                cursor: 'pointer',
                transition: `transform ${downieTheme.transitions.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
