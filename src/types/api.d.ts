// API 请求与响应类型定义

export interface AuthRequest {
  device_id: string;
  license_code: string;
}

export interface AuthResponse {
  status: string; // ok | failed
  message?: string;
}

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

export interface SubmitTaskResponse {
  task_id: string;
  status: string;
  message?: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string; // submitted | processing | completed | failed
  progress?: number; // 0-100
  message?: string;
}

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

export interface GetKeysResponse {
  status: string;
  keys?: KeyInfo[];
  message?: string;
}
