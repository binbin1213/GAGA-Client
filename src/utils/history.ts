/**
 * 下载历史记录管理工具
 */

import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { DownloadRecord } from '../types/history';

const HISTORY_FILE = 'download_history.json';

/**
 * 获取历史记录文件路径
 */
async function getHistoryFilePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, HISTORY_FILE);
}

/**
 * 读取下载历史记录
 */
export async function readHistory(): Promise<DownloadRecord[]> {
  try {
    const filePath = await getHistoryFilePath();
    const content = await readFile(filePath);
    const text = new TextDecoder().decode(content);
    return JSON.parse(text);
  } catch (error) {
    // 文件不存在或读取失败，返回空数组
    return [];
  }
}

/**
 * 保存下载历史记录
 */
export async function writeHistory(records: DownloadRecord[]): Promise<void> {
  try {
    const filePath = await getHistoryFilePath();
    const content = new TextEncoder().encode(JSON.stringify(records, null, 2));
    await writeFile(filePath, content);
  } catch (error) {
    console.error('保存历史记录失败:', error);
    throw error;
  }
}

/**
 * 添加新的下载记录
 */
export async function addDownloadRecord(record: Omit<DownloadRecord, 'id' | 'createdAt'>): Promise<DownloadRecord> {
  const records = await readHistory();
  const newRecord: DownloadRecord = {
    ...record,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  records.unshift(newRecord); // 新记录放在前面
  await writeHistory(records);
  return newRecord;
}

/**
 * 更新下载记录状态
 */
export async function updateDownloadRecord(id: string, updates: Partial<DownloadRecord>): Promise<void> {
  const records = await readHistory();
  const index = records.findIndex(record => record.id === id);
  
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    await writeHistory(records);
  }
}

/**
 * 删除下载记录
 */
export async function deleteDownloadRecord(id: string): Promise<void> {
  const records = await readHistory();
  const filteredRecords = records.filter(record => record.id !== id);
  await writeHistory(filteredRecords);
}

/**
 * 清空所有历史记录
 */
export async function clearHistory(): Promise<void> {
  await writeHistory([]);
}
