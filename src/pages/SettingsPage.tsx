import { useState, useEffect } from 'react';
import { readSettings, updateSettings, resetSettings } from '../utils/settings';
import type { AppSettings } from '../types/config';
import { open } from '@tauri-apps/plugin-dialog';

interface Props {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await readSettings();
      setSettings(config);
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateSettings(settings);
      alert('配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('确定要重置为默认配置吗？')) {
      try {
        const defaultSettings = await resetSettings();
        setSettings(defaultSettings);
        alert('已重置为默认配置');
      } catch (error) {
        console.error('重置配置失败:', error);
        alert('重置配置失败');
      }
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
        setSettings({ ...settings!, defaultDownloadDir: selected });
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
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <div>加载中...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <div>加载配置失败</div>
        <button onClick={onBack}>返回</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 0 18px #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>设置</h2>
        <div>
          <button onClick={onBack} style={{ marginRight: 8 }}>返回</button>
          <button onClick={handleSave} disabled={saving} style={{ marginRight: 8 }}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button onClick={handleReset} style={{ color: 'red' }}>重置</button>
        </div>
      </div>

      {/* 下载设置 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>下载设置</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>默认下载目录：</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={settings.defaultDownloadDir || ''}
              onChange={(e) => handleInputChange('defaultDownloadDir', e.target.value)}
              placeholder="未设置，使用系统默认"
              style={{ flex: 1, padding: 8 }}
            />
            <button onClick={handleSelectDownloadDir}>选择</button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.autoSelectQuality}
              onChange={(e) => handleInputChange('autoSelectQuality', e.target.checked)}
            />
            自动选择画质
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>偏好画质：</label>
          <select
            value={settings.preferQuality}
            onChange={(e) => handleInputChange('preferQuality', e.target.value)}
            style={{ padding: 8, width: 200 }}
          >
            <option value="highest">最高画质</option>
            <option value="medium">中等画质</option>
            <option value="lowest">最低画质</option>
          </select>
        </div>
      </div>

      {/* 字幕设置 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>字幕设置</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.burnSubtitles}
              onChange={(e) => handleInputChange('burnSubtitles', e.target.checked)}
            />
            自动烧录字幕
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>字幕语言：</label>
          <select
            value={settings.subtitleLanguage}
            onChange={(e) => handleInputChange('subtitleLanguage', e.target.value)}
            style={{ padding: 8, width: 200 }}
          >
            <option value="zh">仅中文</option>
            <option value="en">仅英文</option>
            <option value="all">全部语言</option>
          </select>
        </div>
      </div>

      {/* 界面设置 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>界面设置</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>主题：</label>
          <select
            value={settings.theme}
            onChange={(e) => handleInputChange('theme', e.target.value)}
            style={{ padding: 8, width: 200 }}
          >
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
      </div>

      {/* 高级设置 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>高级设置</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>最大并发下载数：</label>
          <input
            type="number"
            min="1"
            max="5"
            value={settings.maxConcurrentDownloads}
            onChange={(e) => handleInputChange('maxConcurrentDownloads', parseInt(e.target.value) || 1)}
            style={{ padding: 8, width: 100 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>重试次数：</label>
          <input
            type="number"
            min="0"
            max="10"
            value={settings.retryAttempts}
            onChange={(e) => handleInputChange('retryAttempts', parseInt(e.target.value) || 0)}
            style={{ padding: 8, width: 100 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>超时时间（毫秒）：</label>
          <input
            type="number"
            min="5000"
            max="300000"
            step="5000"
            value={settings.timeout}
            onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 30000)}
            style={{ padding: 8, width: 120 }}
          />
        </div>
      </div>
    </div>
  );
}
