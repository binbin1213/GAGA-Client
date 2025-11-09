import { useState, useEffect } from 'react';
import { readSettings, updateSettings } from '../utils/settings';
import type { AppSettings } from '../types/config';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import AuthPage from './AuthPage';

interface Props {
  onBack: () => void;
  deviceId: string;
  authed: boolean;
  onAuthed: (device: string, code: string) => void;
}

export default function SettingsPage({ onBack, deviceId, authed, onAuthed }: Props) {
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // 授权成功后的回调
  const handleAuthed = (device: string, code: string) => {
    onAuthed(device, code);
    // 延迟返回设置页面，让用户看到成功提示
    setTimeout(() => {
      setShowAuthSection(false);
    }, 1500);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 当从授权页面返回时，重新加载设置
  useEffect(() => {
    if (!showAuthSection) {
      loadSettings();
    }
  }, [showAuthSection]);

  const loadSettings = async () => {
    try {
      const config = await readSettings();
      console.log('加载的配置:', config);
      console.log('下载目录:', config.defaultDownloadDir);
      setSettings(config);
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDownloadDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择默认下载目录',
      });
      
      if (selected && typeof selected === 'string') {
        // 更新本地状态
        const newSettings = { ...settings!, defaultDownloadDir: selected };
        setSettings(newSettings);
        
        // 自动保存 - 只保存 defaultDownloadDir 字段
        try {
          await updateSettings({ defaultDownloadDir: selected });
          console.log('下载目录已保存:', selected);
          alert('下载目录已保存');
        } catch (saveError) {
          console.error('保存失败:', saveError);
          alert('保存失败，请重试');
        }
      }
    } catch (error) {
      console.error('选择目录失败:', error);
    }
  };

  const handleInputChange = (key: keyof AppSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#606060', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '12px' }}>加载中...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ color: '#c41e3a', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '12px' }}>错误: 加载配置失败</div>
        <button onClick={onBack} style={{ padding: '8px 16px', background: 'transparent', color: '#606060', border: '1px solid #b0b0b0', fontSize: '11px', fontFamily: 'Consolas, "Courier New", monospace', cursor: 'pointer' }}>返回</button>
      </div>
    );
  }

  // 如果显示授权页面，则渲染授权组件
  if (showAuthSection) {
    return (
      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setShowAuthSection(false)}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '8px 16px',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            color: '#333333',
            cursor: 'pointer',
            zIndex: 10,
            fontSize: '11px',
            fontFamily: 'Consolas, "Courier New", monospace',
            letterSpacing: '0.5px'
          }}
        >
          ← 返回设置
        </button>
        <AuthPage onAuthed={handleAuthed} deviceId={deviceId} />
      </div>
    );
  }


  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部窗口控制栏 */}
      <div 
        data-tauri-drag-region
        style={{ padding: '0', height: '36px', background: '#ffffff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1px' }}>
          <button onClick={() => getCurrentWindow().minimize()} style={{ width: '36px', height: '36px', background: 'transparent', color: '#606060', border: 'none', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
          <button onClick={async () => { const window = getCurrentWindow(); if (await window.isMaximized()) { await window.unmaximize(); } else { await window.maximize(); } }} style={{ width: '36px', height: '36px', background: 'transparent', color: '#606060', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>□</button>
          <button onClick={() => getCurrentWindow().hide()} style={{ width: '36px', height: '36px', background: 'transparent', color: '#606060', border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
        </div>
      </div>

      {/* 标题和返回按钮 */}
      <div style={{ background: 'transparent', padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>设置</h2>
        <button onClick={onBack} style={{ padding: '8px 16px', background: '#ffffff', color: '#333333', border: '1px solid #d0d0d0', fontSize: '13px', fontFamily: 'system-ui, -apple-system, sans-serif', cursor: 'pointer' }}>返回</button>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* 授权管理 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: authed ? '#f0fdf4' : '#fef2f2', border: `1px solid ${authed ? '#bbf7d0' : '#fecaca'}` }}>
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '500', color: '#606060', fontFamily: 'Consolas, "Courier New", monospace', letterSpacing: '0.5px' }}>授权管理</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: authed ? '#166534' : '#dc2626', marginBottom: '4px', fontFamily: 'Consolas, "Courier New", monospace' }}>
                  状态: {authed ? '已授权' : '未授权'}
                </div>
                <div style={{ fontSize: '11px', color: '#707070', fontFamily: 'Consolas, "Courier New", monospace' }}>
                  {authed ? '所有功能均可用' : '下载功能需要授权'}
                </div>
              </div>
              <button
                onClick={() => setShowAuthSection(true)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: authed ? '#166534' : '#dc2626',
                  border: `1px solid ${authed ? '#bbf7d0' : '#fecaca'}`,
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'Consolas, "Courier New", monospace',
                  letterSpacing: '0.5px'
                }}
              >
                {authed ? '重新授权' : '立即授权'}
              </button>
            </div>
          </div>

          {/* 下载设置 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '500', color: '#606060', fontFamily: 'Consolas, "Courier New", monospace', letterSpacing: '0.5px' }}>下载设置</h3>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#606060', marginBottom: '8px', fontFamily: 'Consolas, "Courier New", monospace', letterSpacing: '0.5px' }}>默认目录</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={settings.defaultDownloadDir || ''}
                  onChange={(e) => handleInputChange('defaultDownloadDir', e.target.value)}
                  placeholder="未设置，使用系统默认"
                  style={{ flex: 1, padding: '12px', border: '1px solid #b0b0b0', fontSize: '13px', fontFamily: 'Consolas, "Courier New", monospace', backgroundColor: '#f8f8f8', color: '#707070', boxSizing: 'border-box', outline: 'none' }}
                />
                <button onClick={handleSelectDownloadDir} style={{ padding: '12px 16px', background: 'transparent', color: '#606060', border: '1px solid #b0b0b0', fontSize: '11px', fontFamily: 'Consolas, "Courier New", monospace', cursor: 'pointer', whiteSpace: 'nowrap' }}>浏览</button>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#707070', fontFamily: 'Consolas, "Courier New", monospace' }}>
                设置后每次下载会自动使用此目录
              </div>
            </div>
          </div>

          {/* 关于 */}
          <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '500', color: '#606060', fontFamily: 'Consolas, "Courier New", monospace', letterSpacing: '0.5px' }}>关于</h3>
            </div>
            <div style={{ fontSize: '12px', color: '#707070', lineHeight: 1.8, fontFamily: 'Consolas, "Courier New", monospace' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#303030' }}>GAGA Client</strong>
              </div>
              <div style={{ marginBottom: '4px' }}>版本: 0.1.0</div>
              <div>专业的视频下载工具</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
