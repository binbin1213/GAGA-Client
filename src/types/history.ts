/**
 * 下载历史记录类型定义
 */

export interface DownloadRecord {
  id: string;
  title: string;
  mpdUrl: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  files?: string[];
  errorMessage?: string;
  fileSize?: number;
  duration?: string;
}
