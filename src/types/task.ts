/**
 * 下载任务相关类型定义
 */

export interface VideoInfo {
  Title: string;
  MPD: string;
  PSSH: string;
  LicenseURL: string;
  捕获时间: string;
}

export type TaskStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

export interface DownloadTask {
  id: string;
  videoInfo: VideoInfo;
  status: TaskStatus;
  progress: number;
  error?: string;
  filePath?: string;
  createdAt: string;
  completedAt?: string;
}
