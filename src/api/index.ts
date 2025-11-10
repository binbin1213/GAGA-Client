import { fetch } from '@tauri-apps/plugin-http';
import type { AuthRequest, AuthResponse, SubmitTaskRequest, SubmitTaskResponse, TaskStatusResponse, GetKeysRequest, GetKeysResponse } from '../types/api';
import { config } from '../config';

// 设备授权接口
export async function auth(data: AuthRequest): Promise<AuthResponse> {
  const response = await fetch(`${config.apiBaseURL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
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
  const response = await fetch(`${config.apiBaseURL}/api/get_keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
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
