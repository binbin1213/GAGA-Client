import { useState, useCallback, useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { readDir, stat } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
 
import { isSuccessResponse } from '../types/api.d';
import type { GetKeysResponse } from '../types/api.d';

export interface VideoInfo {
  Title: string;
  MPD: string;
  PSSH?: string;
  LicenseURL?: string;
  Keys?: string[];
  捕获时间: string;
}

// 从后端接收的原始日志事件负载
interface NM3u8dlLogPayload {
  level: string;
  message: string;
  progress?: number;
  speed?: string;
  timestamp: string;
}

// 格式化后用于UI展示的日志条目
export interface LogEntry {
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  message: string;
  timestamp: string;
}

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';

export type DownloadPhase = 'pending' | 'downloading' | 'decrypting' | 'merging' | 'burning' | 'completed' | 'failed';

interface UseDownloadReturn {
  status: DownloadStatus;
  progress: number;
  error: string;
  logs: LogEntry[];
  downloadSpeed: string;
  phase: DownloadPhase;
  currentTask: VideoInfo | null;
  startDownload: (videoInfo: VideoInfo, outputPath: string) => Promise<void>;
  cancelDownload: () => void;
  clearError: () => void;
  setError: (message: string) => void;
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
  const [phase, setPhase] = useState<DownloadPhase>('pending');
    const [currentTask, setCurrentTask] = useState<VideoInfo | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ videoInfo: VideoInfo; outputPath: string } | null>(null);

  // 监听后端的下载日志事件
  useEffect(() => {
    let unlisteners: UnlistenFn[] = [];

    const subscribeToLogs = async () => {
      const u1 = await listen<NM3u8dlLogPayload>('n-m3u8dl-log', (event) => {
        const { level, message, progress: newProgress, speed, timestamp } = event.payload;

        // 1. 更新日志
        setLogs(prev => [...prev, { level: level as LogEntry['level'], message, timestamp }].slice(-200));

        // 2. 如果是错误，设置失败状态
        if (level === 'ERROR') {
          setError(message);
          setStatus('failed');
          setPhase('failed');
          return;
        }

        // 3. 更新进度和速度
        if (typeof newProgress === 'number') {
          const normalized = Math.max(0, Math.min(100, Math.round(newProgress)));
          setProgress(normalized);
          setStatus(prevStatus => {
            if (prevStatus === 'failed') return prevStatus;
            return 'downloading';
          });
        }
        if (speed) {
          setDownloadSpeed(speed);
        }

        if (typeof message === 'string') {
          const m = message.toLowerCase();
          if (
            m.includes('下载完成') ||
            m.includes('下载任务完成') ||
            m.includes('下载任务执行成功') ||
            m.includes('done') ||
            m.includes('success')
          ) {
            setStatus('completed');
            setProgress(100);
            setPhase('completed');
          } else if (m.includes('正在解密') || m.includes('decrypting')) {
            setPhase('decrypting');
          } else if (m.includes('正在合并') || m.includes('binary merging') || m.includes('merging')) {
            setPhase('merging');
          }
        }
      });
      unlisteners.push(u1);

      const u2 = await listen<string>('burn-subtitle-progress', (event) => {
        const line = event.payload;
        setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: `字幕烧录进度: ${line}`, timestamp: new Date().toISOString() }].slice(-200));
        setPhase('burning');
      });
      unlisteners.push(u2);

      const u3 = await listen<{ level?: string; message: string; timestamp?: string }>('burn-subtitle-status', (event) => {
        const { level, message, timestamp } = event.payload || { message: '' } as any;
        const uiLevel: LogEntry['level'] = level === 'ERROR' ? 'ERROR' : level === 'WARN' ? 'WARN' : 'INFO';
        setLogs(prev => [...prev, { level: uiLevel, message, timestamp: timestamp || new Date().toISOString() }].slice(-200));
        if (uiLevel === 'ERROR') {
          setError(message);
          setStatus('failed');
          setPhase('failed');
        } else {
          setPhase('burning');
        }
      });
      unlisteners.push(u3);
    };

    subscribeToLogs().catch(err => {
      const errorMessage = `监听下载日志失败: ${err}`;
      setError(errorMessage);
      setLogs(prev => [...prev, { level: 'ERROR' as LogEntry['level'], message: errorMessage, timestamp: new Date().toISOString() }]);
    });

    return () => {
      if (unlisteners.length) {
        unlisteners.forEach(fn => fn());
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'failed' || status === 'pending') {
      setCurrentTask(null);
      setPhase(status as DownloadPhase);
    }
  }, [status]);

  const startDownload = useCallback(
    async (videoInfo: VideoInfo, outputPath: string) => {
      // 1. 重置状态
      setCurrentTask(videoInfo);
      setDownloadInfo({ videoInfo, outputPath });
      setStatus('downloading');
      setProgress(0);
      setLogs([]);
      setDownloadSpeed('');
      setError('');
      setPhase('downloading');

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const { getKeys } = await import('../api');
        const { getDeviceId } = await import('../utils/deviceId');
        const { validateLocalAuth } = await import('../utils/auth');

        // 2. 构建下载参数 (修正后的版本)
        const args = [
          videoInfo.MPD,
          '--save-dir', outputPath,
          '--save-name', videoInfo.Title,
          '--tmp-dir', `${outputPath}/.temp_${Date.now()}`,
          '--thread-count', '16',
          '--select-video', 'best',
          '--select-audio', 'best',
          '--select-subtitle', 'lang=zh-Hans',
          '--binary-merge',
          '--no-ansi-color',
          '--no-log',
          '--log-level', 'INFO',
        ];

        // 3. 如果需要，获取解密密钥
        if (videoInfo.PSSH && videoInfo.LicenseURL) {
          try {
            const deviceId = await getDeviceId();
            const authState = await validateLocalAuth();
            if (!authState || !authState.licenseCode) throw new Error('未授权，无法获取解密密钥');

            const keysResponse: GetKeysResponse = await getKeys({
              device_id: deviceId,
              license_code: authState.licenseCode,
              pssh: videoInfo.PSSH,
              license_url: videoInfo.LicenseURL,
            });

            if (isSuccessResponse(keysResponse) && keysResponse.keys?.length) {
              keysResponse.keys.forEach(keyInfo => {
                args.push('--key', `${keyInfo.kid}:${keyInfo.key}`);
              });
            } else {
              throw new Error(keysResponse.message || '获取解密密钥失败');
            }
          } catch (keyError: any) {
            setError(`获取解密密钥失败: ${keyError.message || keyError}`);
            setStatus('failed');
            return;
          }
        }

        // 4. 调用后端命令
        await invoke<string>('exec_download_command', {
          command: 'N_m3u8DL-RE',
          args: args,
          workingDir: outputPath,
        });

        // 注意：后续的状态更新（如完成、失败）由事件监听器处理
        // 这里不再需要手动设置 setStatus('completed') 或处理错误
        // 只需要处理调用 invoke 本身的异常

      } catch (err: any) {
        // 这个 catch 主要捕获 invoke 调用失败或参数错误等问题
        setError(`下载启动失败: ${err}`);
        setStatus('failed');
      }
    },
    []
  );

  const cancelDownload = useCallback(() => {
    setStatus('pending');
    setProgress(0);
  }, []);

  const handlePostProcessing = useCallback(async () => {
    if (!downloadInfo) {
      setError('下载信息丢失，无法进行后期处理。');
      setStatus('failed');
      return;
    }

    const { videoInfo, outputPath } = downloadInfo;
    setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: '下载完成，开始进行后期处理...', timestamp: new Date().toISOString() }]);

    try {
        const { invoke } = await import('@tauri-apps/api/core');
        const entries: any[] = await readDir(outputPath);

        const videoFile = entries.find(e => e.name?.startsWith(videoInfo.Title) && e.name.endsWith('.mp4'));
        const audioFile = entries.find(e => e.name?.startsWith(videoInfo.Title) && e.name.endsWith('.m4a'));
        const subtitleFile = entries.find(e => e.name?.startsWith(videoInfo.Title) && (e.name.endsWith('.srt') || e.name.endsWith('.vtt')));

        if (!videoFile) {
            setLogs(prev => [...prev, { level: 'WARN' as LogEntry['level'], message: '未找到视频文件，跳过后处理。可能无需合并。', timestamp: new Date().toISOString() }]);
            return;
        }

        // 如果只有视频文件，没有独立音频文件，说明 N_m3u8DL-RE 可能已经合并了音视频
        if (videoFile && !audioFile) {
             setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: '检测到音视频已合并，仅处理字幕烧录。', timestamp: new Date().toISOString() }]);
        }

        const finalOutputName = `${videoInfo.Title}_processed.mp4`;
        const finalOutputPath = await join(outputPath, finalOutputName);
        const videoInputPath = await join(outputPath, videoFile.name);
        const mergedOutputName = `${videoInfo.Title}_merged.mp4`;
        const mergedOutputPath = await join(outputPath, mergedOutputName);

        let sourceForSubtitles = videoInputPath;

        const waitStable = async (paths: string[], attempts = 5, intervalMs = 1000) => {
          for (let i = 0; i < attempts; i++) {
            const sizes1 = await Promise.all(paths.map(async p => {
              const s = await stat(p);
              return (s as any).size || 0;
            }));
            await new Promise(res => setTimeout(res, intervalMs));
            const sizes2 = await Promise.all(paths.map(async p => {
              const s = await stat(p);
              return (s as any).size || 0;
            }));
            const stable = sizes1.length > 0 && sizes1.every((sz, idx) => sz > 0 && sz === sizes2[idx]);
            if (stable) return true;
          }
          throw new Error('文件未稳定');
        };

        const filesToCheck: string[] = [videoInputPath];
        if (audioFile) {
          const audioInputPath = await join(outputPath, audioFile.name);
          filesToCheck.push(audioInputPath);
        }
        await waitStable(filesToCheck);

        if (audioFile) {
            const audioInputPath = await join(outputPath, audioFile.name);
            const mergeArgs: string[] = ['-y', '-i', videoInputPath, '-i', audioInputPath, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', mergedOutputPath];
            setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: `执行音视频合并...`, timestamp: new Date().toISOString() }]);
            setPhase('merging');
            await invoke<string>('exec_merge_command', { command: 'ffmpeg', args: mergeArgs });
            sourceForSubtitles = mergedOutputPath;
        }

        if (subtitleFile) {
            const copyArgs: string[] = ['-y', '-i', sourceForSubtitles, '-c', 'copy', finalOutputPath];
            setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: `字幕烧录已禁用，复制输出...`, timestamp: new Date().toISOString() }]);
            await invoke<string>('exec_merge_command', { command: 'ffmpeg', args: copyArgs });
        } else {
            const copyArgs: string[] = ['-y', '-i', sourceForSubtitles, '-c', 'copy', finalOutputPath];
            setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: `无字幕，复制输出...`, timestamp: new Date().toISOString() }]);
            await invoke<string>('exec_merge_command', { command: 'ffmpeg', args: copyArgs });
        }

        setLogs(prev => [...prev, { level: 'INFO' as LogEntry['level'], message: `处理完成，输出文件位于: ${finalOutputPath}`, timestamp: new Date().toISOString() }]);
        setPhase('completed');

    } catch (procError: any) {
        const errorMessage = procError.message || procError.toString();
        setError(`后期处理失败: ${errorMessage}`);
        setLogs(prev => [...prev, { level: 'ERROR' as LogEntry['level'], message: `后期处理失败: ${errorMessage}`, timestamp: new Date().toISOString() }]);
        setStatus('failed');
        setPhase('failed');
    }
  }, [downloadInfo]);

  useEffect(() => {
    if (status === 'completed' && downloadInfo) {
      handlePostProcessing().catch(err => {
        const errorMessage = err.message || err.toString();
        setError(`调用后期处理时发生错误: ${errorMessage}`);
        setLogs(prev => [...prev, { level: 'ERROR' as LogEntry['level'], message: `调用后期处理时发生错误: ${errorMessage}`, timestamp: new Date().toISOString() }]);
        setStatus('failed');
        setPhase('failed');
      });
    }
  }, [status, downloadInfo]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    status,
    progress,
    error,
    logs,
    downloadSpeed,
    phase,
    currentTask,
    startDownload,
    cancelDownload,
    clearError,
    setError,
  };
}
