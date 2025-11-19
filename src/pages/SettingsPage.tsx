import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme, commonStyles } from '../styles/downie-theme';
import { readSettings, updateSettings } from '../utils/settings';
import type { AppSettings } from '../types/config';
import { openWindow } from '../utils/windowManager';
import { AppLayout } from '../components/layout/AppLayout';
import { navigate } from '../utils/navigation';
import { MacCard } from '../components/ui/MacCard';


interface SettingsPageProps {
  authed: boolean;
  deviceId: string;
}

type ButtonVariant = 'primary' | 'outline';

type SettingRowProps = {
  label: string;
  desc?: string;
  children: React.ReactNode;
  bordered?: boolean;
};

const rowStyle: CSSProperties = commonStyles.settingRow;
const labelColumnStyle: CSSProperties = commonStyles.labelColumn;
const labelStyle: CSSProperties = commonStyles.label;
const descStyle: CSSProperties = commonStyles.description;
const contentColumnStyle: CSSProperties = commonStyles.contentColumn;

function SettingRow({ label, desc, children, bordered = true }: SettingRowProps) {
  return (
    <div style={{ ...rowStyle, borderBottom: bordered ? rowStyle.borderBottom : 'none', paddingBottom: bordered ? '10px' : '0' }}>
      <div style={labelColumnStyle}>
        <span style={labelStyle}>{label}</span>
        {desc && <span style={descStyle}>{desc}</span>}
      </div>
      <div style={contentColumnStyle}>{children}</div>
    </div>
  );
}

const readonlyInputStyle: CSSProperties = commonStyles.readonlyInput;

const statusBadgeStyle = (authed: boolean): CSSProperties => commonStyles.statusBadge(authed);

const buttonBaseStyle: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '6px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: downieTheme.fonts.system,
};

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
  color: '#ffffff',
  boxShadow: '0 4px 12px rgba(168,85,247,0.25)',
};

const outlineButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: 'rgba(255,255,255,0.3)',
  border: '1px solid rgba(0,122,255,0.5)',
  color: '#007AFF',
};

function StyledButton({ variant, children, onClick }: { variant: ButtonVariant; children: React.ReactNode; onClick?: () => void }) {
  const style = variant === 'primary' ? primaryButtonStyle : outlineButtonStyle;
  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 6px 14px rgba(168,85,247,0.32)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(168,85,247,0.25)';
        }
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
    >
      {children}
    </button>
  );
}

export default function SettingsPage({ authed, deviceId }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>({ defaultDownloadDir: '' });

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
      const selected = await open({ directory: true, title: '选择默认下载目录' });
      if (selected) {
        const newSettings = { ...settings, defaultDownloadDir: selected as string };
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

  const handleNavigate = (target: 'tasks' | 'history' | 'settings' | 'logs') => {
    if (target === 'settings') return;
    const routeMap: Record<'tasks' | 'history' | 'settings' | 'logs', '/' | '/history' | '/settings' | '/logs'> = {
      tasks: '/',
      history: '/history',
      settings: '/settings',
      logs: '/logs',
    };
    navigate(routeMap[target]);
  };

  const pageContainerStyle: CSSProperties = {
    maxWidth: 640,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px 0 36px',
    margin: '0 auto',
  };

  const sectionHeadingStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginTop: 12,
    alignSelf: 'flex-start',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(60,60,67,0.6)',
  };

  const cardStyleOverrides: CSSProperties = {
    padding: '20px 28px',
    gap: 10,
  };

  return (
    <AppLayout active="settings" onNavigate={handleNavigate}>
      <div style={pageContainerStyle}>

        <div style={sectionHeadingStyle}>
          <span style={sectionTitleStyle}>授权设置</span>
        </div>
        <MacCard style={cardStyleOverrides}>
          <SettingRow label="授权状态" desc="下载功能需要授权后才能使用">
            <span style={statusBadgeStyle(authed)}>{authed ? '已授权' : '未授权'}</span>
          </SettingRow>
          <SettingRow label="设备 ID" desc="用于设备识别和授权验证">
            <span style={readonlyInputStyle}>{deviceId}</span>
          </SettingRow>
          <SettingRow label="管理授权" bordered={false}>
            <StyledButton variant="primary" onClick={handleOpenAuth}>
              {authed ? '更新授权' : '立即授权'}
            </StyledButton>
          </SettingRow>
        </MacCard>

        <div style={sectionHeadingStyle}>
          <span style={sectionTitleStyle}>下载设置</span>
        </div>
        <MacCard style={cardStyleOverrides}>
          <SettingRow label="默认下载目录" desc="新任务的默认保存位置" bordered={false}>
            {settings.defaultDownloadDir ? (
              <span style={readonlyInputStyle}>{settings.defaultDownloadDir}</span>
            ) : (
              <span style={{ ...readonlyInputStyle, color: 'rgba(60,60,67,0.4)' }}>未选择目录</span>
            )}
            <StyledButton variant="outline" onClick={handleSelectDirectory}>
              选择目录
            </StyledButton>
          </SettingRow>
        </MacCard>



      </div>
    </AppLayout>
  );
}
