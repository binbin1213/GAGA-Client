import { useState } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import { auth } from '../api';
import { saveAuthState } from '../utils/auth';
import { closeCurrentWindow } from '../utils/windowManager';


interface AuthPageProps {
  deviceId: string;
  onAuthed: (deviceId: string, licenseCode: string) => void;
}

export default function AuthPage({ deviceId, onAuthed }: AuthPageProps) {
  const [licenseCode, setLicenseCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleAuth = async () => {
    if (!licenseCode.trim()) {
      setError('请输入授权码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await auth({
        device_id: deviceId,
        license_code: licenseCode.trim(),
      });

      if (result.status === 'ok') {
        // 保存授权状态
        await saveAuthState({
          deviceId,
          licenseCode: licenseCode.trim(),
          expiresAt: result.expires_at,
          authorizedAt: new Date().toISOString(),
          isValid: true,
        });

        // 通知父组件
        onAuthed(deviceId, licenseCode.trim());
        
        // 发送全局事件通知其他窗口
        try {
          const { emit } = await import('@tauri-apps/api/event');
          await emit('auth-success', {
            deviceId,
            licenseCode: licenseCode.trim(),
          });
        } catch (emitError) {
          console.error('发送授权成功事件失败:', emitError);
        }
        
        // 显示成功状态
        setSuccess(true);
        
        // 2秒后自动关闭窗口
        setTimeout(async () => {
          await closeCurrentWindow();
        }, 2000);
      } else {
        setError(result.message || '授权失败');
      }
    } catch (err: any) {
      setError(`授权失败: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const copyDeviceId = async () => {
    try {
      await navigator.clipboard.writeText(deviceId);
      // TODO: 显示复制成功提示
    } catch (error) {
      console.error('复制失败:', error);
    }
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: downieTheme.spacing.xl,
  };

  const formStyle: CSSProperties = {
    width: '100%',
    maxWidth: '500px',
    background: downieTheme.glass.card.background,
    backdropFilter: downieTheme.glass.card.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.card.backdropFilter,
    borderRadius: downieTheme.radius.card,
    boxShadow: downieTheme.shadows.card,
    padding: `${downieTheme.spacing.xl} ${downieTheme.spacing.xl}`,
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xl,
  };

  const formTitleStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: downieTheme.fontWeights.semibold,
    color: downieTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: downieTheme.spacing.base,
  };

  const formDescStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    color: downieTheme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: '1.5',
  };

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.sm,
  };

  const labelStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.semibold,
    color: downieTheme.colors.text.primary,
  };

  const deviceIdContainerStyle: CSSProperties = {
    display: 'flex',
    gap: downieTheme.spacing.sm,
  };

  const deviceIdInputStyle: CSSProperties = {
    flex: 1,
    padding: `${downieTheme.spacing.md} ${downieTheme.spacing.base}`,
    fontSize: downieTheme.fontSizes.caption,
    fontFamily: downieTheme.fonts.mono,
    color: downieTheme.colors.text.tertiary,
    background: 'rgba(0, 0, 0, 0.05)',
    border: `0.5px solid ${downieTheme.colors.border.light}`,
    borderRadius: downieTheme.radius.button,
    outline: 'none',
  };

  const copyButtonStyle: CSSProperties = {
    padding: `${downieTheme.spacing.md} ${downieTheme.spacing.lg}`,
    background: 'rgba(0, 0, 0, 0.05)',
    color: downieTheme.colors.text.secondary,
    border: `0.5px solid ${downieTheme.colors.border.light}`,
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.regular,
    cursor: 'pointer',
    fontFamily: downieTheme.fonts.system,
  };

  const inputStyle: CSSProperties = {
    padding: `${downieTheme.spacing.md} ${downieTheme.spacing.base}`,
    fontSize: downieTheme.fontSizes.body,
    fontFamily: downieTheme.fonts.system,
    color: downieTheme.colors.text.primary,
    background: downieTheme.glass.card.background,
    border: `0.5px solid ${downieTheme.colors.border.light}`,
    borderRadius: downieTheme.radius.button,
    outline: 'none',
    transition: `border-color ${downieTheme.transitions.fast}`,
  };

  const submitButtonStyle: CSSProperties = {
    padding: `${downieTheme.spacing.base} ${downieTheme.spacing.xl}`,
    background: loading ? 'rgba(175, 82, 222, 0.5)' : downieTheme.colors.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.semibold,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: downieTheme.fonts.system,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: downieTheme.spacing.sm,
  };

  const errorStyle: CSSProperties = {
    padding: downieTheme.spacing.base,
    background: 'rgba(255, 59, 48, 0.1)',
    color: '#FF3B30',
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    textAlign: 'center',
  };

  const successStyle: CSSProperties = {
    padding: downieTheme.spacing.base,
    background: 'rgba(52, 199, 89, 0.1)',
    color: '#34C759',
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      {/* 内容 */}
      <div style={contentStyle}>
        <div style={formStyle}>
          <div>
            <div style={formTitleStyle}>设备授权</div>
            <div style={formDescStyle}>输入授权码以使用下载功能</div>
          </div>

          {/* 设备 ID */}
          <div style={fieldStyle}>
            <div style={labelStyle}>设备 ID</div>
            <div style={deviceIdContainerStyle}>
              <input type="text" value={deviceId} readOnly style={deviceIdInputStyle} />
              <button
                style={copyButtonStyle}
                onClick={copyDeviceId}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                }}
              >
                复制
              </button>
            </div>
          </div>

          {/* 授权码 */}
          <div style={fieldStyle}>
            <div style={labelStyle}>授权码</div>
            <input
              type="text"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="请输入授权码"
              style={inputStyle}
              disabled={success}
              onFocus={(e) => {
                e.target.style.borderColor = downieTheme.colors.accent;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = downieTheme.colors.border.light;
              }}
            />
          </div>

          {/* 错误提示 */}
          {error && <div style={errorStyle}>{error}</div>}

          {/* 成功提示 */}
          {success && <div style={successStyle}>✅ 授权成功！窗口即将关闭...</div>}

          {/* 提交按钮 */}
          {!success && (
            <button
              style={submitButtonStyle}
              onClick={handleAuth}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {loading && (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              )}
              {loading ? '验证中...' : '验证授权'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
