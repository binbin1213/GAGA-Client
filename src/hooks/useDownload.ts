import { useState, useCallback } from 'react';
import { logInfo } from '../utils/logger';
import { isSuccessResponse } from '../types/api';
import type { GetKeysResponse } from '../types/api';

export interface VideoInfo {
  Title: string;
  MPD: string;
  PSSH?: string;
  LicenseURL?: string;
  Keys?: string[];
  捕获时间: string;
}

export interface LogEntry {
  level: string;
  message: string;
  progress?: number;
  speed?: string;
  timestamp: string;
}

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';

interface UseDownloadReturn {
  status: DownloadStatus;
  progress: number;
  error: string;
  logs: LogEntry[];
  downloadSpeed: string;
  startDownload: (videoInfo: VideoInfo, outputPath: string) => Promise<void>;
  cancelDownload: () => void;
  clearError: () => void;
}

/**
 * 下载管理 Hook
 * 处理视频下载的所有逻辑，包括密钥获取、文件合并、字幕烧录等
 */
export function useDownload(): UseDownloadReturn {
  const [status, setStatus] = useState<DownloadStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [downloadSpeed, setDownloadSpeed] = useState('');

  const startDownload = useCallback(
    async (videoInfo: VideoInfo, outputPath: string) => {
      setStatus('downloading');
      setProgress(0);
      setLogs([]);
      setDownloadSpeed('');
      setError('');

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const { getKeys } = await import('../api');
        const { getDeviceId } = await import('../utils/deviceId');
        const { validateLocalAuth } = await import('../utils/auth');

        // 构建下载参数
        const args = [
          videoInfo.MPD,
          '--save-dir', outputPath,
          '--save-name', videoInfo.Title,
          '--tmp-dir', `${outputPath}/temp`,
          '--thread-count', '16',
          '--auto-select',
          '--drop-subtitle', 'lang=de|es|fr|hi|id|ja|ko|pt|vi|en|zh-Hant:for=all',
          '--binary-merge',
          '--no-ansi-color',
          '--no-log',
          '--log-level', 'INFO',
        ];

        // 如果有 PSSH 和 LicenseURL，先获取解密密钥
        if (videoInfo.PSSH && videoInfo.LicenseURL) {
          logInfo('检测到加密视频，正在获取解密密钥...');

          try {
            const deviceId = await getDeviceId();
            const authState = await validateLocalAuth();

            if (!authState || !authState.licenseCode) {
              throw new Error('未授权，无法获取解密密钥');
            }

            const keysResponse: GetKeysResponse = await getKeys({
              device_id: deviceId,
              license_code: authState.licenseCode,
              pssh: videoInfo.PSSH,
              license_url: videoInfo.LicenseURL,
            });

            if (isSuccessResponse(keysResponse) && keysResponse.keys && keysResponse.keys.length > 0) {
              logInfo(`成功获取 ${keysResponse.keys.length} 个解密密钥`);

              keysResponse.keys.forEach(keyInfo => {
                args.push('--key', `${keyInfo.kid}:${keyInfo.key}`);
                logInfo(`添加密钥: ${keyInfo.kid}:${keyInfo.key.substring(0, 8)}...`);
              });
            } else {
              throw new Error(keysResponse.message || '获取解密密钥失败');
            }
          } catch (keyError: any) {
            logInfo(`获取密钥失败: ${keyError.message || keyError}`);
            setError(`获取解密密钥失败: ${keyError.message || keyError}`);
            setStatus('failed');
            return;
          }
        }

        logInfo(`开始下载: ${videoInfo.Title}`);
        logInfo(`参数: ${JSON.stringify(args)}`);

        // 调用下载命令
        const result = await invoke<string>('exec_download_command', {
          command: 'N_m3u8DL-RE',
          args: args,
        });

        logInfo(`下载完成: ${result}`);

        // 后处理（合并、烧录等）
        await handlePostProcessing(videoInfo, outputPath);

        setStatus('completed');
        setProgress(100);

        // 清理临时文件夹
        try {
          const { remove } = await import('@tauri-apps/plugin-fs');
          const tempDir = `${outputPath}/temp`;
          await remove(tempDir, { recursive: true });
          logInfo('已清理临时文件夹');
        } catch (cleanErr) {
          logInfo(`清理临时文件夹失败（可忽略）: ${cleanErr}`);
        }

        // 保存到历史记录
        const { addDownloadRecord } = await import('../utils/history');
        await addDownloadRecord({
          title: videoInfo.Title,
          mpdUrl: videoInfo.MPD,
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
          files: [`${outputPath}/${videoInfo.Title}.mp4`],
        });
      } catch (err: any) {
        logInfo(`下载失败: ${err}`);
        setError(`下载失败: ${err}`);
        setStatus('failed');

        // 保存失败记录
        try {
          const { addDownloadRecord } = await import('../utils/history');
          await addDownloadRecord({
            title: videoInfo.Title,
            mpdUrl: videoInfo.MPD,
            status: 'failed',
            progress: 0,
            errorMessage: String(err),
          });
        } catch (historyErr) {
          logInfo(`保存历史记录失败: ${historyErr}`);
        }
      }
    },
    []
  );

  const cancelDownload = useCallback(() => {
    setStatus('pending');
    setProgress(0);
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    status,
    progress,
    error,
    logs,
    downloadSpeed,
    startDownload,
    cancelDownload,
    clearError,
  };
}

/**
 * 处理下载后的文件处理（合并、烧录等）
 */
async function handlePostProcessing(videoInfo: VideoInfo, outputPath: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const { readDir, remove } = await import('@tauri-apps/plugin-fs');

    const entries = await readDir(outputPath);

    // 查找视频、音频和字幕文件
    const videoFile = entries.find(entry =>
      entry.name && entry.name.includes(videoInfo.Title) && entry.name.endsWith('.mp4')
    );
    const audioFile = entries.find(entry =>
      entry.name && entry.name.includes(videoInfo.Title) && entry.name.endsWith('.m4a')
    );
    const subtitleFile = entries.find(entry =>
      entry.name && entry.name.endsWith('.zh-Hans.srt')
    );

    let finalVideoPath = videoFile ? `${outputPath}/${videoFile.name}` : '';

    // 如果视频和音频分离，先合并
    if (videoFile && audioFile) {
      logInfo('检测到独立的视频和音频文件，开始合并...');

      const mergedFile = `${outputPath}/${videoInfo.Title}_merged.mp4`;

      await invoke<string>('exec_merge_command', {
        command: 'ffmpeg',
        args: [
          '-i', `${outputPath}/${videoFile.name}`,
          '-i', `${outputPath}/${audioFile.name}`,
          '-c', 'copy',
          '-y',
          mergedFile,
        ],
      });

      logInfo('音视频合并完成');

      // 删除原始视频和音频文件
      await remove(`${outputPath}/${videoFile.name}`);
      await remove(`${outputPath}/${audioFile.name}`);

      finalVideoPath = mergedFile;
    }

    // 烧录字幕（如果有字幕文件）
    if (subtitleFile && subtitleFile.name && finalVideoPath) {
      logInfo('检测到字幕文件，开始烧录...');

      const subtitlePath = `${outputPath}/${subtitleFile.name}`;
      const outputFile = `${outputPath}/${videoInfo.Title}_字幕版.mp4`;

      await invoke<string>('burn_subtitle', {
        videoPath: finalVideoPath,
        subtitlePath: subtitlePath,
        outputPath: outputFile,
      });

      logInfo('字幕烧录完成');

      // 删除原始文件和字幕文件
      await remove(finalVideoPath);
      await remove(subtitlePath);
      logInfo('已删除原始文件');
    }
  } catch (processErr) {
    logInfo(`后处理失败（可忽略）: ${processErr}`);
  }
}
