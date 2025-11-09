/**
 * 应用配置管理工具
 */

import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
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
 * 获取配置文件路径
 */
async function getSettingsFilePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, SETTINGS_FILE);
}

/**
 * 读取应用配置
 */
export async function readSettings(): Promise<AppSettings> {
  try {
    const filePath = await getSettingsFilePath();
    const content = await readFile(filePath);
    const text = new TextDecoder().decode(content);
    const settings = JSON.parse(text);
    
    // 合并默认配置，确保所有字段都存在
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    // 文件不存在或读取失败，返回默认配置
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存应用配置
 */
export async function writeSettings(settings: AppSettings): Promise<void> {
  try {
    const filePath = await getSettingsFilePath();
    const content = new TextEncoder().encode(JSON.stringify(settings, null, 2));
    await writeFile(filePath, content);
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
