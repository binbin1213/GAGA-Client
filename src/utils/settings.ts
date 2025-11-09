/**
 * 应用配置管理工具
 */

import { readTextFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import type { AppSettings } from '../types/config';

const SETTINGS_FILE = 'app_settings.json';

/**
 * 默认配置
 */
const DEFAULT_SETTINGS: AppSettings = {
  defaultDownloadDir: '',
  autoSelectQuality: true,
  preferQuality: 'highest',
  burnSubtitles: true,
  subtitleLanguage: 'zh',
  theme: 'light',
  maxConcurrentDownloads: 1,
  retryAttempts: 3,
  timeout: 30000,
};

/**
 * 读取应用配置
 */
export async function readSettings(): Promise<AppSettings> {
  try {
    const text = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
    const settings = JSON.parse(text);
    
    // 合并默认配置，确保所有字段都存在
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    // 文件不存在或读取失败，返回默认配置
    console.log('配置文件不存在，使用默认配置');
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存应用配置
 */
export async function writeSettings(settings: AppSettings): Promise<void> {
  try {
    const content = JSON.stringify(settings, null, 2);
    await writeTextFile(SETTINGS_FILE, content, { baseDir: BaseDirectory.AppData });
    console.log('配置已保存');
  } catch (error) {
    console.error('保存配置失败:', error);
    throw error;
  }
}

/**
 * 更新配置（部分更新）
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const currentSettings = await readSettings();
  const newSettings = { ...currentSettings, ...updates };
  await writeSettings(newSettings);
  return newSettings;
}

/**
 * 重置为默认配置
 */
export async function resetSettings(): Promise<AppSettings> {
  await writeSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
