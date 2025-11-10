import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import { readSettings, updateSettings } from '../utils/settings';
import type { AppSettings } from '../types/config';
import { openWindow } from '../utils/windowManager';

interface SettingsPageProps {
  authed: boolean;
  deviceId: string;
}

export default function SettingsPage({ authed, deviceId }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>({
    defaultDownloadDir: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await readSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        title: '选择默认下载目录',
      });
      if (selected) {
        const newSettings = {
          ...settings,
          defaultDownloadDir: selected as string,
        };
        setSettings(newSettings);
        await updateSettings(newSettings);
      }
    } catch (error) {
      console.error('选择目录失败:', error);
    }
  };

  const handleOpenAuth = async () => {
    await openWindow('auth');
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
    gap: downieTheme.spacing.xl,
  };

  const sectionStyle: CSSProperties = {
    background: downieTheme.glass.card.background,
    backdropFilter: downieTheme.glass.card.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.card.backdropFilter,
    borderRadius: downieTheme.radius.card,
    boxShadow: downieTheme.shadows.card,
    padding: downieTheme.spacing.xl,
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.title,
    fontWeight: downieTheme.fontWeights.semibold,
    color: downieTheme.colors.text.primary,
    marginBottom: downieTheme.spacing.lg,
  };

  const settingItemStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${downieTheme.spacing.base} 0`,
    borderBottom: `0.5px solid ${downieTheme.colors.border.light}`,
  };

  const settingLabelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xs,
  };

  const labelTextStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.regular,
    color: downieTheme.colors.text.primary,
  };

  const labelDescStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    color: downieTheme.colors.text.tertiary,
  };

  const buttonStyle: CSSProperties = {
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

  const pathTextStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    color: downieTheme.colors.text.tertiary,
    fontFamily: downieTheme.fonts.mono,
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const authStatusStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: downieTheme.spacing.sm,
    fontSize: downieTheme.fontSizes.body,
    color: authed ? '#34C759' : '#FF3B30',
  };

  const deviceIdStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    color: downieTheme.colors.text.tertiary,
    fontFamily: downieTheme.fonts.mono,
    background: 'rgba(0, 0, 0, 0.05)',
    padding: `${downieTheme.spacing.xs} ${downieTheme.spacing.sm}`,
    borderRadius: downieTheme.radius.button,
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      {/* 内容 */}
      <div style={contentStyle}>
        {/* 授权设置 */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>授权设置</div>
          <div style={settingItemStyle}>
            <div style={settingLabelStyle}>
              <div style={labelTextStyle}>授权状态</div>
              <div style={labelDescStyle}>下载功能需要授权后才能使用</div>
            </div>
            <div style={authStatusStyle}>{authed ? '✅ 已授权' : '❌ 未授权'}</div>
          </div>
          <div style={settingItemStyle}>
            <div style={settingLabelStyle}>
              <div style={labelTextStyle}>设备 ID</div>
              <div style={labelDescStyle}>用于设备识别和授权验证</div>
            </div>
            <div style={deviceIdStyle}>{deviceId}</div>
          </div>
          <div style={{ ...settingItemStyle, borderBottom: 'none' }}>
            <div style={settingLabelStyle}>
              <div style={labelTextStyle}>管理授权</div>
              <div style={labelDescStyle}>添加或更新授权码</div>
            </div>
            <button
              style={buttonStyle}
              onClick={handleOpenAuth}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {authed ? '更新授权' : '立即授权'}
            </button>
          </div>
        </div>

        {/* 下载设置 */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>下载设置</div>
          <div style={{ ...settingItemStyle, borderBottom: 'none' }}>
            <div style={settingLabelStyle}>
              <div style={labelTextStyle}>默认下载目录</div>
              <div style={labelDescStyle}>新任务的默认保存位置</div>
              {settings.defaultDownloadDir && (
                <div style={pathTextStyle}>{settings.defaultDownloadDir}</div>
              )}
            </div>
            <button
              style={buttonStyle}
              onClick={handleSelectDirectory}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              选择目录
            </button>
          </div>
        </div>

        {/* 应用信息 */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>应用信息</div>
          <div style={settingItemStyle}>
            <div style={settingLabelStyle}>
              <div style={labelTextStyle}>版本</div>
              <div style={labelDescStyle}>当前应用版本</div>
            </div>
            <div style={labelTextStyle}>1.0.0</div>
          </div>
          <div style={{ ...settingItemStyle, borderBottom: 'none' }}>
            <div style={settingLabelStyle}>
              <div style={labelTextStyle}>关于</div>
              <div style={labelDescStyle}>GAGA Client - 视频下载工具</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
