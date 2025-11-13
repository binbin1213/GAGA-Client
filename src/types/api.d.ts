// API 请求与响应类型定义

// 认证相关
export type AuthStatus = 'ok' | 'success' | 'failed' | 'error';

export interface AuthRequest {
  device_id: string;
  license_code: string;
}

export interface AuthResponse {
  status: AuthStatus;
  message?: string;
  expires_at?: string; // 授权过期时间（ISO 8601 格式）
}

// 任务提交相关
export interface SubmitTaskRequest {
  device_id: string;
  license_code: string;
  // DRM 资源信息（从油猴脚本捕获）
  mpd?: string;  // MPD URL
  pssh?: string;  // PSSH (Base64)
  license_url?: string;  // License URL
  title?: string;  // 视频标题
  // 兼容旧版本
  url?: string;
}

export type TaskSubmitStatus = 'submitted' | 'failed' | 'error';

export interface SubmitTaskResponse {
  task_id: string;
  status: TaskSubmitStatus;
  message?: string;
}

// 任务状态相关
export type TaskStatus = 'submitted' | 'processing' | 'completed' | 'failed' | 'error';

export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  progress?: number; // 0-100
  message?: string;
}

// 密钥获取相关
export interface GetKeysRequest {
  device_id: string;
  license_code: string;
  pssh: string;
  license_url: string;
  headers?: Record<string, string>;
}

export interface KeyInfo {
  kid: string;
  key: string;
}

export type KeysResponseStatus = 'ok' | 'success' | 'failed' | 'error';

export interface GetKeysResponse {
  status: KeysResponseStatus;
  keys?: KeyInfo[];
  message?: string;
}

// 类型守卫函数
export function isSuccessResponse(response: { status: string }): boolean {
  return response.status === 'ok' || response.status === 'success';
}

export function isErrorResponse(response: { status: string }): boolean {
  return response.status === 'failed' || response.status === 'error';
}
