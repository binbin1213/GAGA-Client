/**
 * 应用配置类型定义
 */

export interface AppSettings {
  // 下载设置
  defaultDownloadDir?: string;
  autoSelectQuality?: boolean;
  preferQuality?: 'highest' | 'medium' | 'lowest';
  
  // 字幕设置
  burnSubtitles?: boolean;
  subtitleLanguage?: 'zh' | 'en' | 'all';
  
  // 界面设置
  theme?: 'light' | 'dark' | 'auto';
  
  // 高级设置
  maxConcurrentDownloads?: number;
  retryAttempts?: number;
  timeout?: number;
}
