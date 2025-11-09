/**
 * 授权状态管理工具
 * 处理本地授权信息的保存、读取和验证
 */

import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { auth } from '../api';
import type { AuthRequest } from '../types/api';
import { logError, logInfo, logSensitive } from './logger';

/**
 * 授权状态接口
 */
export interface AuthState {
  deviceId: string;
  licenseCode: string;
  authorizedAt: string; // 授权时间
  expiresAt?: string;   // 过期时间（如果后端返回）
  isValid: boolean;     // 当前是否有效
}

const AUTH_STATE_FILE = 'auth_state.json';
const AUTH_CACHE_FILE = 'auth_cache.json';

// 缓存配置：5分钟内不重复验证后端
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

/**
 * 授权缓存接口
 */
interface AuthCache {
  lastValidation: string; // 上次验证时间
  isValid: boolean;       // 验证结果
  expiresAt?: string;     // 后端返回的过期时间
}

/**
 * 获取授权缓存文件路径
 */
async function getAuthCacheFilePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, AUTH_CACHE_FILE);
}

/**
 * 读取授权缓存
 */
async function readAuthCache(): Promise<AuthCache | null> {
  try {
    const filePath = await getAuthCacheFilePath();
    const content = await readFile(filePath);
    const text = new TextDecoder().decode(content);
    const cache = JSON.parse(text) as AuthCache;
    
    // 检查缓存是否过期
    const cacheTime = new Date(cache.lastValidation).getTime();
    const currentTime = new Date().getTime();
    
    if (currentTime - cacheTime > CACHE_DURATION) {
      return null; // 缓存过期
    }
    
    return cache;
  } catch (error) {
    return null;
  }
}

/**
 * 保存授权缓存
 */
async function saveAuthCache(cache: AuthCache): Promise<void> {
  try {
    const filePath = await getAuthCacheFilePath();
    const content = new TextEncoder().encode(JSON.stringify(cache, null, 2));
    await writeFile(filePath, content);
  } catch (error) {
    // 缓存保存失败不影响主流程
  }
}

/**
 * 获取授权状态文件路径
 */
async function getAuthStateFilePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, AUTH_STATE_FILE);
}

/**
 * 保存授权状态到本地
 */
export async function saveAuthState(authState: AuthState): Promise<void> {
  try {
    const filePath = await getAuthStateFilePath();
    const content = new TextEncoder().encode(JSON.stringify(authState, null, 2));
    await writeFile(filePath, content);
    logInfo('授权状态已保存到本地');
  } catch (error) {
    logError('保存授权状态失败', error);
    throw error;
  }
}

/**
 * 读取本地授权状态
 */
export async function readAuthState(): Promise<AuthState | null> {
  try {
    const filePath = await getAuthStateFilePath();
    const content = await readFile(filePath);
    const text = new TextDecoder().decode(content);
    const authState = JSON.parse(text) as AuthState;
    
    logSensitive('读取到本地授权状态');
    return authState;
  } catch (error) {
    logInfo('未找到本地授权状态或读取失败');
    return null;
  }
}

/**
 * 检查授权状态是否过期
 */
export function isAuthStateValid(authState: AuthState): boolean {
  if (!authState.isValid) {
    return false;
  }

  // 如果有过期时间，检查是否过期
  if (authState.expiresAt) {
    const expiresTime = new Date(authState.expiresAt).getTime();
    const currentTime = new Date().getTime();
    return currentTime < expiresTime;
  }

  // 如果没有过期时间，假设长期有效
  return true;
}

/**
 * 清除本地授权状态
 */
export async function clearAuthState(): Promise<void> {
  try {
    const filePath = await getAuthStateFilePath();
    // 这里可以添加删除文件的逻辑
    // 简单起见，我们写入一个空的无效状态
    const emptyState: AuthState = {
      deviceId: '',
      licenseCode: '',
      authorizedAt: '',
      isValid: false
    };
    const content = new TextEncoder().encode(JSON.stringify(emptyState, null, 2));
    await writeFile(filePath, content);
    console.log('本地授权状态已清除');
  } catch (error) {
    console.error('清除授权状态失败:', error);
    throw error;
  }
}

/**
 * 清除授权缓存
 */
export async function clearAuthCache(): Promise<void> {
  try {
    const filePath = await getAuthCacheFilePath();
    const emptyCache: AuthCache = {
      lastValidation: new Date(0).toISOString(), // 设置为过期时间
      isValid: false
    };
    const content = new TextEncoder().encode(JSON.stringify(emptyCache, null, 2));
    await writeFile(filePath, content);
  } catch (error) {
    // 缓存清除失败不影响主流程
  }
}

/**
 * 验证本地授权状态（带缓存优化）
 */
export async function validateLocalAuth(): Promise<AuthState | null> {
  try {
    const authState = await readAuthState();
    if (!authState) {
      return null;
    }

    // 检查本地状态是否有效
    if (!isAuthStateValid(authState)) {
      console.log('本地授权状态已过期或无效');
      // 清除过期的授权状态
      await clearAuthState();
      await clearAuthCache(); // 清除缓存
      return null;
    }

    // 检查缓存
    const cache = await readAuthCache();
    if (cache && cache.isValid) {
      console.log('使用缓存的验证结果');
      // 更新过期时间（如果缓存中有）
      if (cache.expiresAt && cache.expiresAt !== authState.expiresAt) {
        const updatedAuthState = {
          ...authState,
          expiresAt: cache.expiresAt
        };
        await saveAuthState(updatedAuthState);
        return updatedAuthState;
      }
      return authState;
    }

    // 缓存未命中或已过期，调用后端验证
    try {
      console.log('缓存未命中，验证后端授权状态');
      const result = await auth({
        device_id: authState.deviceId,
        license_code: authState.licenseCode
      } as AuthRequest);
      
      if (result.status === 'ok') {
        console.log('后端验证通过，授权状态有效');
        
        // 更新缓存
        const newCache: AuthCache = {
          lastValidation: new Date().toISOString(),
          isValid: true,
          expiresAt: result.expires_at
        };
        await saveAuthCache(newCache);
        
        // 更新过期时间（如果后端返回新的）
        if (result.expires_at && result.expires_at !== authState.expiresAt) {
          const updatedAuthState = {
            ...authState,
            expiresAt: result.expires_at
          };
          await saveAuthState(updatedAuthState);
          return updatedAuthState;
        }
        return authState;
      } else {
        console.log('后端验证失败，授权已被撤销:', result.message);
        
        // 更新缓存为无效状态
        const invalidCache: AuthCache = {
          lastValidation: new Date().toISOString(),
          isValid: false
        };
        await saveAuthCache(invalidCache);
        
        // 清除无效的授权状态
        await clearAuthState();
        return null;
      }
    } catch (backendError) {
      console.warn('后端验证失败，使用本地验证结果:', backendError);
      // 如果后端验证失败（网络问题等），仍然使用本地验证结果
      // 但不更新缓存，下次重试
      return authState;
    }
  } catch (error) {
    console.error('验证本地授权状态失败:', error);
    return null;
  }
}
