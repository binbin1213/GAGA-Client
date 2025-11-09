/**
 * 安全日志工具
 * 根据环境控制日志输出，避免泄露敏感信息
 */

// 检查是否为开发环境
const isDevelopment = (() => {
  try {
    // 优先使用 Vite 的环境变量
    return import.meta.env.DEV;
  } catch {
    // 如果无法访问环境变量，默认为生产环境以确保安全
    return false;
  }
})();

/**
 * 安全日志级别
 */
export const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN', 
  INFO: 'INFO',
  DEBUG: 'DEBUG'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

/**
 * 安全日志函数
 * @param level 日志级别
 * @param message 日志消息
 * @param sensitive 是否包含敏感信息
 * @param data 附加数据
 */
export function safeLog(
  level: LogLevel, 
  message: string, 
  sensitive: boolean = false,
  data?: any
): void {
  // 生产环境不输出敏感日志
  if (!isDevelopment && sensitive) {
    return;
  }

  // 生产环境只输出 ERROR 和 WARN 级别
  if (!isDevelopment && level !== LogLevel.ERROR && level !== LogLevel.WARN) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;

  switch (level) {
    case LogLevel.ERROR:
      console.error(logMessage, data);
      break;
    case LogLevel.WARN:
      console.warn(logMessage, data);
      break;
    case LogLevel.INFO:
      if (isDevelopment) {
        console.info(logMessage, data);
      }
      break;
    case LogLevel.DEBUG:
      if (isDevelopment) {
        console.debug(logMessage, data);
      }
      break;
  }
}

/**
 * 便捷的日志函数
 */
export const logError = (message: string, data?: any) => 
  safeLog(LogLevel.ERROR, message, false, data);

export const logWarn = (message: string, data?: any) => 
  safeLog(LogLevel.WARN, message, false, data);

export const logInfo = (message: string, data?: any) => 
  safeLog(LogLevel.INFO, message, false, data);

export const logDebug = (message: string, data?: any) => 
  safeLog(LogLevel.DEBUG, message, false, data);

// 敏感信息日志（仅开发环境）
export const logSensitive = (message: string, data?: any) => 
  safeLog(LogLevel.DEBUG, message, true, data);
