import { useState } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import { auth } from '../api';
import { saveAuthState } from '../utils/auth';
import { closeCurrentWindow } from '../utils/windowManager';
import { MacButton } from '../components/ui/MacButton';
import { MacCard } from '../components/ui/MacCard';

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

  const pageStyle: CSSProperties = {
    width: '100vw',
    height: '100vh',
    background: downieTheme.glass.main.background,
    backdropFilter: downieTheme.glass.main.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.main.backdropFilter,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: downieTheme.fonts.system,
  };

  const formFieldsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.base,
  };

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xs,
  };

  const labelStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.semibold,
    color: downieTheme.colors.text.primary,
  };

  const monoBadgeStyle: CSSProperties = {
    flex: 1,
    padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.base}`,
    fontSize: downieTheme.fontSizes.caption,
    fontFamily: downieTheme.fonts.mono,
    color: downieTheme.colors.text.secondary,
    background: 'rgba(0, 0, 0, 0.05)',
    borderRadius: downieTheme.radius.button,
    border: `0.5px solid ${downieTheme.colors.border.light}`,
    outline: 'none',
  };

  const inputStyle: CSSProperties = {
    padding: `${downieTheme.spacing.md} ${downieTheme.spacing.base}`,
    fontSize: downieTheme.fontSizes.body,
    fontFamily: downieTheme.fonts.system,
    color: downieTheme.colors.text.primary,
    background: '#fff',
    border: `0.5px solid ${downieTheme.colors.border.light}`,
    borderRadius: downieTheme.radius.button,
    outline: 'none',
    transition: `border-color ${downieTheme.transitions.fast}`,
  };

  const hintStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    color: downieTheme.colors.text.tertiary,
    lineHeight: 1.5,
  };

  const feedbackStyle = (variant: 'error' | 'success'): CSSProperties => ({
    padding: downieTheme.spacing.base,
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    textAlign: 'center',
    background: variant === 'error' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.12)',
    color: variant === 'error' ? '#FF3B30' : '#34C759',
  });

  const buttonGroupStyle: CSSProperties = {
    display: 'flex',
    gap: downieTheme.spacing.sm,
  };

  return (
    <div style={pageStyle}>
      <MacCard
        title="设备授权"
        description="授权后可使用 DRM 密钥服务与下载功能。输入授权码后即可立即生效。"
        contentStyle={{ gap: downieTheme.spacing.lg }}
        style={{ width: '100%', maxWidth: 520 }}
      >
        <div style={formFieldsStyle}>
          <div style={fieldStyle}>
            <span style={labelStyle}>设备 ID</span>
            <div style={buttonGroupStyle}>
              <input type="text" value={deviceId} readOnly style={monoBadgeStyle} />
              <MacButton variant="secondary" onClick={copyDeviceId} disabled={loading}>
                复制
              </MacButton>
            </div>
            <span style={hintStyle}>每台设备唯一，授权码会绑定此 ID。</span>
          </div>

          <div style={fieldStyle}>
            <span style={labelStyle}>授权码</span>
            <input
              type="text"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="请输入授权码，例如 GAGA-XXXX-XXXX"
              style={inputStyle}
              disabled={success}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = downieTheme.colors.accent;
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = downieTheme.colors.border.light;
              }}
            />
            <span style={hintStyle}>授权码区分大小写，请准确输入。</span>
          </div>

          {error && <div style={feedbackStyle('error')}>{error}</div>}
          {success && <div style={feedbackStyle('success')}>✅ 授权成功，窗口即将自动关闭。</div>}

          {!success && (
            <MacButton onClick={handleAuth} disabled={loading}>
              {loading && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              )}
              {loading ? '验证中...' : '验证授权'}
            </MacButton>
          )}
        </div>
      </MacCard>
    </div>
  );
}
