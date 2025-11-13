import { fetch } from '@tauri-apps/plugin-http';
import type { AuthRequest, AuthResponse, SubmitTaskRequest, SubmitTaskResponse, TaskStatusResponse, GetKeysRequest, GetKeysResponse } from '../types/api';
import { config } from '../config';

// 重试辅助函数
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`请求失败 (尝试 ${i + 1}/${maxRetries}):`, error.message);
      
      // 如果不是最后一次尝试，等待后重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 递增延迟
      }
    }
  }
  
  throw lastError || new Error('请求失败');
}

// 设备授权接口
export async function auth(data: AuthRequest): Promise<AuthResponse> {
  const response = await fetchWithRetry(`${config.apiBaseURL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    connectTimeout: 10000,
  }, 3);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.message || 'Authorization failed');
  }
  
  return await response.json();
}

// 提交任务接口
export async function submitTask(data: SubmitTaskRequest): Promise<SubmitTaskResponse> {
  const response = await fetch(`${config.apiBaseURL}/api/submit_task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Submit task failed');
  }
  
  return await response.json();
}

// 查询任务状态接口
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${config.apiBaseURL}/api/task_status/${taskId}`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Get task status failed');
  }
  
  return await response.json();
}

// 获取解密密钥接口
export async function getKeys(data: GetKeysRequest): Promise<GetKeysResponse> {
  try {
    // 使用重试机制
    const response = await fetchWithRetry(`${config.apiBaseURL}/api/get_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      connectTimeout: 10000, // 10秒连接超时
    }, 3); // 最多重试3次
    
    if (!response.ok) {
      let errorMessage = `获取密钥失败 (HTTP ${response.status})`;
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || errorMessage;
      } catch {
        // 无法解析错误响应
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error: any) {
    // 网络错误或连接失败
    if (error.message && error.message.includes('error sending request')) {
      throw new Error(`无法连接到服务器 (${config.apiBaseURL})，请检查：\n1. 网络连接是否正常\n2. 服务器是否运行\n3. 防火墙是否阻止连接`);
    }
    throw error;
  }
}

// 获取下载文件信息（保留，用于兼容）
export async function getDownloadInfo(taskId: string) {
  const response = await fetch(`${config.apiBaseURL}/api/download/${taskId}/info`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Get download info failed');
  }
  
  return await response.json();
}

// 下载产物（保留，用于兼容）
export async function download(taskId: string, _onProgress?: (progress: number) => void) {
  const response = await fetch(`${config.apiBaseURL}/api/download/${taskId}`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Download failed');
  }
  
  // TODO: 实现进度回调
  return await response.blob();
}
