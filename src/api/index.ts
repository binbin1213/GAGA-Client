import axios from 'axios';
import type { AuthRequest, AuthResponse, SubmitTaskRequest, SubmitTaskResponse, TaskStatusResponse, GetKeysRequest, GetKeysResponse } from '../types/api';
import { config } from '../config';

const baseURL = config.apiBaseURL;
const api = axios.create({
  baseURL,
  timeout: 10000
});

// 设备授权接口
export async function auth(data: AuthRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth', data);
  return res.data;
}

// 提交任务接口
export async function submitTask(data: SubmitTaskRequest): Promise<SubmitTaskResponse> {
  const res = await api.post<SubmitTaskResponse>('/api/submit_task', data);
  return res.data;
}

// 查询任务状态接口
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const res = await api.get<TaskStatusResponse>(`/api/task_status/${taskId}`);
  return res.data;
}

// 获取解密密钥接口
export async function getKeys(data: GetKeysRequest): Promise<GetKeysResponse> {
  const res = await api.post<GetKeysResponse>('/api/get_keys', data);
  return res.data;
}

// 获取下载文件信息（保留，用于兼容）
export async function getDownloadInfo(taskId: string) {
  const res = await api.get(`/api/download/${taskId}/info`);
  return res.data;
}

// 下载产物，返回 Axios 原始响应，可用于处理 blob 下载（保留，用于兼容）
export async function download(taskId: string, onProgress?: (progress: number) => void) {
  const res = await api.get(`/api/download/${taskId}`, {
    responseType: 'blob',
    onDownloadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return res.data;
}
