/**
 * 设备ID生成工具
 * 获取硬件唯一标识符作为机器码
 */

import { invoke } from '@tauri-apps/api/core';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { logError, logInfo, logSensitive } from './logger';

const DEVICE_ID_FILE = 'device_id.json';
const INSTALL_TIME_FILE = 'install_time.json';

/**
 * 获取安装时间文件路径
 */
async function getInstallTimeFilePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, INSTALL_TIME_FILE);
}

/**
 * 获取或创建安装时间
 * 确保在同一台机器上始终返回相同的时间戳
 */
async function getOrCreateInstallTime(): Promise<string> {
  try {
    const filePath = await getInstallTimeFilePath();
    const content = await readFile(filePath);
    const text = new TextDecoder().decode(content);
    const data = JSON.parse(text);
    
    if (data.installTime) {
      return data.installTime;
    }
  } catch (error) {
    // 文件不存在或读取失败，需要创建
  }

  // 创建新的安装时间
  const installTime = Date.now().toString();
  try {
    const filePath = await getInstallTimeFilePath();
    const content = new TextEncoder().encode(JSON.stringify({
      installTime,
      createdAt: new Date().toISOString()
    }, null, 2));
    await writeFile(filePath, content);
    logInfo('安装时间已保存');
  } catch (error) {
    logError('保存安装时间失败', error);
  }
  
  return installTime;
}

/**
 * 获取设备ID文件路径
 */
async function getDeviceIdFilePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, DEVICE_ID_FILE);
}

/**
 * 生成基于系统信息的设备ID
 * 通过Tauri后端获取系统硬件信息
 */
async function generateDeviceId(): Promise<string> {
  try {
    // 获取系统信息
    const sysInfo = await invoke<any>('get_system_info');
    
    // 组合多个硬件信息生成唯一ID
    const components = [
      sysInfo.cpu_id || '',
      sysInfo.board_serial || '',
      sysInfo.disk_serial || '',
      sysInfo.mac_address || '',
      sysInfo.hostname || ''
    ].filter(Boolean);

    if (components.length === 0) {
      // 如果无法获取硬件信息，使用基于时间的确定性ID
      // 使用安装时间作为种子，确保在同一台机器上始终相同
      const installTime = await getOrCreateInstallTime();
      const fallbackHash = await invoke<string>('hash_string', { input: `fallback_${installTime}` });
      return `device_${fallbackHash.substr(0, 32)}`;
    }

    // 使用SHA256哈希生成固定长度的设备ID
    const combined = components.join('|');
    const hash = await invoke<string>('hash_string', { input: combined });
    
    return `device_${hash.substr(0, 32)}`;
  } catch (error) {
    logError('生成设备ID失败', error);
    // 降级方案：使用基于时间的确定性ID
    try {
      const installTime = await getOrCreateInstallTime();
      const fallbackHash = await invoke<string>('hash_string', { input: `fallback_${installTime}` });
      return `device_${fallbackHash.substr(0, 32)}`;
    } catch (fallbackError) {
      logError('降级方案也失败', fallbackError);
      // 最后的降级方案：使用固定前缀+时间戳（但仍尽量保持一致）
      return `device_persistent_${Date.now().toString().substr(0, 10)}`;
    }
  }
}

/**
 * 读取已保存的设备ID
 */
async function readSavedDeviceId(): Promise<string | null> {
  try {
    const filePath = await getDeviceIdFilePath();
    const content = await readFile(filePath);
    const text = new TextDecoder().decode(content);
    const data = JSON.parse(text);
    return data.deviceId || null;
  } catch (error) {
    return null;
  }
}

/**
 * 保存设备ID到本地
 */
async function saveDeviceId(deviceId: string): Promise<void> {
  try {
    const filePath = await getDeviceIdFilePath();
    const content = new TextEncoder().encode(JSON.stringify({
      deviceId,
      createdAt: new Date().toISOString()
    }, null, 2));
    await writeFile(filePath, content);
  } catch (error) {
    console.error('保存设备ID失败:', error);
  }
}

/**
 * 获取或生成设备ID
 * 优先使用已保存的ID，如果没有则生成新的
 */
export async function getDeviceId(): Promise<string> {
  try {
    // 尝试读取已保存的设备ID
    const savedId = await readSavedDeviceId();
    if (savedId) {
      logSensitive('使用已保存的设备ID');
      return savedId;
    }

    // 生成新的设备ID
    logInfo('生成新的设备ID');
    const newId = await generateDeviceId();
    await saveDeviceId(newId);
    logSensitive('设备ID已保存');
    
    return newId;
  } catch (error) {
    logError('获取设备ID失败', error);
    // 最后的降级方案
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 重置设备ID（删除已保存的ID并生成新的）
 */
export async function resetDeviceId(): Promise<string> {
  try {
    // 生成新的设备ID并覆盖保存
    const newId = await generateDeviceId();
    await saveDeviceId(newId);
    return newId;
  } catch (error) {
    console.error('重置设备ID失败:', error);
    throw error;
  }
}
