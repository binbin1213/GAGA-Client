/**
 * 设备ID生成工具
 * 获取硬件唯一标识符作为机器码
 */

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { logError, logInfo } from './logger';

// 定义 remove_file 命令的类型
declare global {
  interface Window {
    __TAURI_INVOKE__: (cmd: string, args?: any) => Promise<any>;
  }
}

const DEVICE_ID_FILE = 'device_id.json';
const INSTALL_TIME_FILE = 'install_time.json';

/**
 * 获取安装时间文件路径
 */
function getInstallTimeFilePath(): string {
  return INSTALL_TIME_FILE;
}

/**
 * 获取或创建安装时间
 * 确保在同一台机器上始终返回相同的时间戳
 */
async function getOrCreateInstallTime(): Promise<string> {
  try {
    await ensureAppDataDir();
    const filePath = await getInstallTimeFilePath();
    
    try {
      // 尝试读取文件
      const text = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
      const data = JSON.parse(text);
      
      if (data.installTime) {
        return data.installTime;
      }
    } catch (error) {
      // 文件不存在或读取失败，继续创建新文件
      logInfo('安装时间文件不存在或读取失败，将创建新文件');
    }
  } catch (error) {
    logError('获取安装时间失败，将创建新的安装时间', error);
  }

  // 创建新的安装时间
  const installTime = Date.now().toString();
  try {
    await ensureAppDataDir();
    const filePath = await getInstallTimeFilePath();
    const content = JSON.stringify({
      installTime,
      createdAt: new Date().toISOString()
    }, null, 2);
    await writeTextFile(filePath, content, { baseDir: BaseDirectory.AppData });
    logInfo('安装时间已保存');
  } catch (error) {
    logError('保存安装时间失败', error);
    throw error; // 重新抛出错误，让调用者处理
  }
  
  return installTime;
}

/**
 * 获取设备ID文件路径
 */
function getDeviceIdFilePath(): string {
  return DEVICE_ID_FILE;
}

/**
 * 策略1：基于硬件信息生成设备ID
 */
async function tryHardwareBasedId(): Promise<string | null> {
  try {
    const sysInfo = await invoke<any>('get_system_info');
    
    const components = [
      sysInfo.cpu_id || '',
      sysInfo.board_serial || '',
      sysInfo.disk_serial || '',
      sysInfo.mac_address || '',
      sysInfo.hostname || ''
    ].filter(Boolean);

    if (components.length === 0) {
      return null;
    }

    const combined = components.join('|');
    const hash = await invoke<string>('hash_string', { input: combined });
    return `device_${hash.substr(0, 32)}`;
  } catch (error) {
    logError('硬件ID生成失败', error);
    return null;
  }
}

/**
 * 策略2：基于安装时间生成设备ID
 */
async function tryInstallTimeBasedId(): Promise<string | null> {
  try {
    const installTime = await getOrCreateInstallTime();
    const hash = await invoke<string>('hash_string', { input: `fallback_${installTime}` });
    return `device_${hash.substr(0, 32)}`;
  } catch (error) {
    logError('安装时间ID生成失败', error);
    return null;
  }
}

/**
 * 策略3：基于随机字符串生成设备ID（最后的降级方案）
 * 注意：这个方法只在前两个策略都失败时才会被调用
 * 生成的ID会被保存，所以不会每次都变
 */
function tryTimestampBasedId(): string {
  // 使用固定的随机字符串，而不是时间戳
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `device_${randomStr}`;
}

/**
 * 生成基于系统信息的设备ID
 * 使用多层降级策略确保总能生成ID
 */
async function generateDeviceId(): Promise<string> {
  // 策略1：硬件信息
  const hardwareId = await tryHardwareBasedId();
  if (hardwareId) {
    logInfo('使用硬件信息生成设备ID');
    return hardwareId;
  }

  // 策略2：安装时间
  const installTimeId = await tryInstallTimeBasedId();
  if (installTimeId) {
    logInfo('使用安装时间生成设备ID');
    return installTimeId;
  }

  // 策略3：时间戳（最后的降级方案）
  logInfo('使用时间戳生成设备ID');
  return tryTimestampBasedId();
}

/**
 * 读取已保存的设备ID
 */
async function readSavedDeviceId(): Promise<string | null> {
  try {
    const filePath = await getDeviceIdFilePath();
    const text = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const data = JSON.parse(text);
    return data.deviceId || null;
  } catch (error) {
    return null;
  }
}

/**
 * 确保应用数据目录存在
 */
/**
 * 确保应用数据目录存在并可写
 */
async function ensureAppDataDir(): Promise<void> {
  try {
    const { appDataDir } = await import('@tauri-apps/api/path');
    const { exists, mkdir } = await import('@tauri-apps/plugin-fs');
    
    const appDir = await appDataDir();
    logInfo(`应用数据目录路径: ${appDir}`);
    
    const dirExists = await exists(appDir);
    
    if (!dirExists) {
      await mkdir(appDir, { recursive: true });
      logInfo('应用数据目录已创建');
    } else {
      logInfo('应用数据目录已存在');
    }
    
    // 简化验证：只检查目录是否存在，不创建测试文件
    // 实际的读写操作会在保存设备ID时进行
    logInfo('应用数据目录验证通过');
  } catch (error) {
    logError('创建应用数据目录失败', error);
    throw error;
  }
}

/**
 * 保存设备ID到本地
 */
async function saveDeviceId(deviceId: string): Promise<void> {
  await ensureAppDataDir();
  const filePath = getDeviceIdFilePath();
  const content = JSON.stringify({
    deviceId,
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  }, null, 2);
  
  try {
    // 直接写入文件（覆盖模式）
    await writeTextFile(filePath, content, { 
      baseDir: BaseDirectory.AppData
    });
    logInfo('设备ID已保存');
  } catch (error) {
    logError('保存设备ID失败', error);
    throw new Error(`保存设备ID失败: ${error}`);
  }
}

/**
 * 获取或生成设备ID
 * 优先使用已保存的ID，如果没有则生成新的
 */
export async function getDeviceId(): Promise<string> {
  try {
    logInfo('开始获取设备ID');
    
    // 尝试读取已保存的设备ID
    const savedId = await readSavedDeviceId();
    if (savedId) {
      logInfo(`使用已保存的设备ID: ${savedId}`);
      return savedId;
    }

    // 生成新的设备ID
    logInfo('没有已保存的设备ID，开始生成新的');
    const newId = await generateDeviceId();
    logInfo(`生成的设备ID: ${newId}`);
    
    // 保存设备ID
    logInfo('开始保存设备ID');
    await saveDeviceId(newId);
    logInfo('设备ID保存成功');
    
    return newId;
  } catch (error) {
    logError('获取设备ID过程中出错，使用紧急降级方案', error);
    // 紧急降级方案：生成一个随机ID并尝试保存
    const emergencyId = `device_emergency_${Math.random().toString(36).substring(2, 15)}`;
    logInfo(`生成紧急设备ID: ${emergencyId}`);
    try {
      await saveDeviceId(emergencyId);
      logInfo('紧急设备ID保存成功');
      return emergencyId;
    } catch (saveError) {
      logError('保存紧急设备ID也失败了', saveError);
      // 最后的最后，直接返回不保存
      return emergencyId;
    }
    return emergencyId;
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
    logError('重置设备ID失败', error);
    throw error;
  }
}
