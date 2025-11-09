/**
 * 客户端下载和处理工具
 * 使用 N_m3u8DL-RE 和 shaka-packager 进行下载和解密
 */

import { invoke } from '@tauri-apps/api/core';

export interface DownloadOptions {
  mpdUrl: string;
  keys: Array<{ kid: string; key: string }>;
  outputName: string;
  outputDir: string;
  onProgress?: (progress: number, status: string) => void;
}

/**
 * 执行下载和解密（使用 N_m3u8DL-RE）
 * 注意：需要系统已安装 N_m3u8DL-RE 和 shaka-packager
 */
export async function downloadAndDecrypt(options: DownloadOptions): Promise<string[]> {
  const { mpdUrl, keys, outputName, outputDir, onProgress } = options;

  // 构建 N_m3u8DL-RE 命令
  const keyArgs: string[] = [];
  for (const keyInfo of keys) {
    keyArgs.push('--key', `${keyInfo.kid}:${keyInfo.key}`);
  }

  const cmd = [
    'N_m3u8DL-RE',
    mpdUrl,
    '--save-name', outputName,
    '--save-dir', outputDir,
    '--tmp-dir', `${outputDir}/temp`,
    ...keyArgs,
    '--decryption-engine', 'SHAKA_PACKAGER',
    '--decryption-binary-path', 'shaka-packager',
    '--mp4-real-time-decryption',
    '--auto-select',
    '--log-level', 'INFO',
    '--drop-subtitle', 'lang=de|es|fr|hi|id|pt|vi:for=all',
    '--no-date-info',
  ];

  onProgress?.(10, '开始下载...');

  try {
    // 使用 Tauri Command API 执行命令
    // 注意：需要先在 Rust 后端创建对应的命令处理器
    const result = await invoke<string>('exec_download_command', {
      command: cmd.join(' '),
      args: cmd.slice(1),
    });

    onProgress?.(90, '下载完成，正在处理文件...');

    // 查找下载的文件
    const files = await findDownloadedFiles(outputDir, outputName);

    onProgress?.(100, '处理完成');

    return files;
  } catch (error) {
    throw new Error(`下载失败: ${error}`);
  }
}

/**
 * 查找下载的文件
 */
async function findDownloadedFiles(outputDir: string, outputName: string): Promise<string[]> {
  // 使用 Tauri 文件系统 API 查找文件
  const { readDir } = await import('@tauri-apps/plugin-fs');

  const files: string[] = [];
  const entries = await readDir(outputDir);

  for (const entry of entries) {
    if (entry.name && entry.name.includes(outputName)) {
      if (entry.name.endsWith('.mp4') || entry.name.endsWith('.m4v')) {
        // 排除语言代码文件
        if (!entry.name.match(/\.(en|zh|th|de|es|fr)(\.|$)/)) {
          files.push(`${outputDir}/${entry.name}`);
        }
      } else if (entry.name.endsWith('.m4a')) {
        files.push(`${outputDir}/${entry.name}`);
      }
    }
  }

  return files;
}

/**
 * 混流视频和音频（使用 ffmpeg）
 */
export async function mergeVideoAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const cmd = [
    'ffmpeg',
    '-i', videoPath,
    '-i', audioPath,
    '-c', 'copy',
    '-y',
    outputPath,
  ];

  onProgress?.(0);

  try {
    await invoke('exec_merge_command', {
      command: cmd.join(' '),
      args: cmd.slice(1),
    });

    onProgress?.(100);
  } catch (error) {
    throw new Error(`混流失败: ${error}`);
  }
}

