import { useState, useCallback, useMemo } from 'react';
import { getKeys } from '../api';
import type { SubmitTaskRequest } from '../types/api';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { mkdir, readDir, remove, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { addDownloadRecord, updateDownloadRecord } from '../utils/history';

interface Props {
  deviceId: string;
  licenseCode: string;
  onShowHistory?: () => void;
  onShowSettings?: () => void;
}

export default function TaskPage({ deviceId, licenseCode, onShowHistory, onShowSettings }: Props) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  // 解析 JSON 输入（从油猴脚本复制的数据）- 使用 useMemo 缓存解析结果
  const parsedData = useMemo((): Partial<SubmitTaskRequest> | null => {
    if (!jsonInput.trim()) return null;
    try {
      const data = JSON.parse(jsonInput);
      return {
        mpd: data.MPD || data.mpd,
        pssh: data.PSSH || data.pssh,
        license_url: data.LicenseURL || data.license_url || data.LicenseUrl,
        title: data.Title || data.title
      };
    } catch (e) {
      return null;
    }
  }, [jsonInput]);

  // 检查必要的工具是否可用 - 使用 useCallback 避免重复创建
  const checkTools = useCallback(async (): Promise<boolean> => {
    try {
      const n3u8dl = await invoke<boolean>('check_tool_available', { toolName: 'N_m3u8DL-RE' });
      const ffmpeg = await invoke<boolean>('check_tool_available', { toolName: 'ffmpeg' });
      const shaka = await invoke<boolean>('check_tool_available', { toolName: 'shaka-packager' });

      if (!n3u8dl) {
        setMsg('错误: 未找到 N_m3u8DL-RE，请确保已安装并在 PATH 中');
        return false;
      }
      if (!ffmpeg) {
        setMsg('错误: 未找到 ffmpeg，请确保已安装并在 PATH 中');
        return false;
      }
      if (!shaka) {
        setMsg('警告: 未找到 shaka-packager，将尝试使用系统默认路径');
      }
      return true;
    } catch (e: any) {
      setMsg('检查工具失败: ' + (e?.message || '未知错误'));
      return false;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const parsed = parsedData;
    if (!parsed || !parsed.mpd || !parsed.pssh || !parsed.license_url) {
      setMsg('请粘贴完整的 JSON 数据（包含 MPD、PSSH、LicenseURL）');
      return;
    }

    setStatus('checking');
    setProgress(0);
    setMsg('检查工具...');

    // 创建下载历史记录
    try {
      const record = await addDownloadRecord({
        title: parsed.title || '未知视频',
        mpdUrl: parsed.mpd,
        status: 'downloading',
        progress: 0,
      });
      setCurrentRecordId(record.id);
    } catch (error) {
      console.error('创建历史记录失败:', error);
    }

    // 检查工具
    if (!(await checkTools())) {
      setStatus('failed');
      
      // 更新历史记录为失败状态
      if (currentRecordId) {
        try {
          await updateDownloadRecord(currentRecordId, {
            status: 'failed',
            progress: 0,
            errorMessage: '工具检查失败',
          });
        } catch (error) {
          console.error('更新历史记录失败:', error);
        }
      }
      
      return;
    }

    try {
      setStatus('getting_keys');
      setProgress(10);
      setMsg('解析 MPD 内容保护流...');
      // 直接使用主PSSH获取所有密钥（因为大多数站点音视频使用同一个PSSH）
      const keysResponse = await getKeys({
        device_id: deviceId,
        license_code: licenseCode,
        pssh: parsed.pssh,
        license_url: parsed.license_url,
      });

      let foundKeys: {kid: string, key: string}[] = [];
      if(keysResponse.status==='success' && keysResponse.keys) {
        foundKeys = keysResponse.keys;
        console.log(`成功获取 ${foundKeys.length} 个密钥:`, foundKeys.map(k => `${k.kid}:${k.key.substring(0, 16)}...`));
      }
      if (!foundKeys.length) throw new Error('未获取到任何内容密钥！');
      setProgress(20);
      setMsg(`已获取 ${foundKeys.length} 个内容密钥，开始下载...`);

      // 2. 选择保存位置
      const outputName = parsed.title || 'video';
      const filePath = await save({
        defaultPath: `${outputName}.mp4`,
        filters: [{
          name: '视频文件',
          extensions: ['mp4']
        }]
      });

      if (!filePath) {
        setMsg('已取消');
        setStatus('idle');
        return;
      }

      // 获取文件名（从完整路径提取）
      const pathParts = filePath.split(/[/\\]/);
      const fullFileName = pathParts[pathParts.length - 1];
      const fileName = fullFileName.replace(/\.mp4$/, '');

      setStatus('downloading');
      setProgress(30);
      setMsg('正在下载视频...');

      // 3. 下载和解密（使用 N_m3u8DL-RE）
      const tempDir = await join(await appDataDir(), 'downloads', fileName);
      await mkdir(tempDir, { recursive: true });

      const keyArgs: string[] = [];
      for (const keyInfo of foundKeys) {
        const keyStr = `${keyInfo.kid}:${keyInfo.key}`;
        console.log('密钥格式:', keyStr);
        console.log('KID:', keyInfo.kid);
        console.log('KEY:', keyInfo.key);
        keyArgs.push('--key', keyStr);
      }
      console.log('所有密钥参数:', keyArgs);

      // 使用 MP4DECRYPT 作为解密引擎（N_m3u8DL-RE 默认引擎）
      const mp4decryptPath = await invoke<string>('get_tool_path', { toolName: 'mp4decrypt' });
      console.log('MP4Decrypt 路径:', mp4decryptPath);

      const downloadArgs = [
        parsed.mpd,
        '--save-name', fileName,
        '--save-dir', tempDir,
        '--tmp-dir', await join(tempDir, 'temp'),
        ...keyArgs,
        // 使用 MP4DECRYPT 作为解密引擎（N_m3u8DL-RE 默认，更稳定）
        // 注意：不使用 --mp4-real-time-decryption，因为N_m3u8DL-RE建议实时解密时用shaka-packager
        // 改为下载后解密，更稳定
        '--decryption-engine', 'MP4DECRYPT',
        '--decryption-binary-path', mp4decryptPath,
        '--auto-select',
        '--log-level', 'INFO',
        // 只丢弃不需要的语言，保留中文和英文字幕
        '--drop-subtitle', 'lang=de|es|fr|hi|id|pt|vi|th:for=all',
        '--sub-format', 'SRT',  // 字幕格式设为SRT
        '--no-date-info',
      ];

      console.log('完整下载命令参数:', downloadArgs);

      await invoke('exec_download_command', {
        command: 'N_m3u8DL-RE',
        args: downloadArgs,
      });

      setProgress(70);
      setMsg('下载完成，正在查找文件...');

      // 4. 查找下载的文件
      const files = await readDir(tempDir);
      let videoFile: string | null = null;
      let audioFile: string | null = null;
      let subtitleFile: string | null = null;

      // 查找字幕文件，优先查找 zh-Hans 格式
      // 支持格式：文件名.zh-Hans、文件名.zh-Hans.srt、文件名.zh-Hant、文件名.zh-Hant.srt
      for (const file of files) {
        if (file.name) {
          const name = file.name;
          if (name.includes(fileName)) {
            if ((name.endsWith('.mp4') || name.endsWith('.m4v')) &&
                !name.match(/\.(en|zh|th|de|es|fr)(\.|$)/) &&
                !name.includes('.copy')) {
              videoFile = await join(tempDir, name);
            } else if (name.endsWith('.m4a') && !name.includes('.en.en')) {
              audioFile = await join(tempDir, name);
            } else if (
              // 查找中文字幕：支持 .zh-Hans、.zh-Hans.srt、.zh-Hant、.zh-Hant.srt 等格式
              (name.includes('.zh-Hans') || name.includes('.zh-Hant')) &&
              (name.endsWith('.srt') || name.endsWith('.zh-Hans') || name.endsWith('.zh-Hant') ||
               name.match(/\.zh-Hans(\.srt)?$/) || name.match(/\.zh-Hant(\.srt)?$/))
            ) {
              // 优先选择 zh-Hans（简体中文）
              if (!subtitleFile || name.includes('.zh-Hans')) {
                subtitleFile = await join(tempDir, name);
              }
            }
          }
        }
      }

      // 如果没找到，尝试查找所有 .srt 文件
      if (!subtitleFile) {
        for (const file of files) {
          if (file.name && file.name.endsWith('.srt') && file.name.includes(fileName)) {
            subtitleFile = await join(tempDir, file.name);
            break;
          }
        }
      }

      // 如果还是没找到，尝试查找不带扩展名的字幕文件（如：文件名.zh-Hans）
      if (!subtitleFile) {
        for (const file of files) {
          if (file.name &&
              (file.name.endsWith('.zh-Hans') || file.name.endsWith('.zh-Hant')) &&
              file.name.includes(fileName)) {
            subtitleFile = await join(tempDir, file.name);
            break;
          }
        }
      }

      if (!videoFile) {
        throw new Error('未找到视频文件');
      }

      setProgress(80);
      setMsg('正在混流视频和音频...');

      // 5. 混流（如果有音频文件）
      if (audioFile) {
        // 先混流到临时文件
        const tempMergedPath = await join(tempDir, `temp_merged_${Date.now()}.mp4`);
        const mergeArgs = [
          '-i', videoFile,
          '-i', audioFile,
          '-c', 'copy',
          '-y',
          tempMergedPath,
        ];

        await invoke('exec_merge_command', {
          command: 'ffmpeg',
          args: mergeArgs,
        });

        // 清理临时文件
        try {
          await remove(videoFile);
          await remove(audioFile);
        } catch (e) {
          console.warn('清理临时文件失败:', e);
        }

        videoFile = tempMergedPath;
      }

      // 6. 如果有字幕文件，进行硬字幕烧录
      if (subtitleFile) {
        setProgress(90);
        setMsg('正在烧录中文字幕...');
        console.log('找到字幕文件:', subtitleFile);

        // 检查字幕文件是否有 .srt 扩展名，如果没有则添加
        let finalSubtitlePath = subtitleFile;
        if (!subtitleFile.endsWith('.srt')) {
          // 如果字幕文件没有 .srt 扩展名，尝试读取并验证
          // 如果确实是字幕文件，ffmpeg 的 subtitles 滤镜可以自动识别
          finalSubtitlePath = subtitleFile;
        }

        // 使用 ffmpeg 烧录硬字幕
        // 注意：路径直接传递，Rust 会正确处理中文字符
        // macOS 上使用 libass 渲染字幕，支持 SRT 格式
        // 使用绝对路径，ffmpeg 的 subtitles 滤镜可以直接读取文件
        const burnArgs = [
          '-i', videoFile,
          // subtitles 滤镜：直接使用文件路径，不需要转义
          // force_style 设置字幕样式
          '-vf', `subtitles=${finalSubtitlePath}:force_style='FontName=Microsoft YaHei,FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Shadow=1'`,
          '-c:v', 'libx264',  // 硬字幕需要重新编码视频
          '-c:a', 'copy',      // 音频直接复制
          '-preset', 'fast',   // 使用 fast 预设加快编码速度（比 medium 快约2倍）
          '-crf', '20',        // 稍微降低质量以加快速度（20 仍然是很高质量）
          '-threads', '0',     // 使用所有可用CPU核心
          '-progress', 'pipe:1',  // 输出进度信息到stdout
          '-y',
          filePath,
        ];

        await invoke('exec_merge_command', {
          command: 'ffmpeg',
          args: burnArgs,
        });

        // 清理临时文件
        try {
          if (videoFile !== filePath) {
            await remove(videoFile);
          }
        } catch (e) {
          console.warn('清理临时文件失败:', e);
        }
      } else {
        // 没有字幕，直接复制或移动文件
        if (videoFile !== filePath) {
          const videoContent = await readFile(videoFile);
          await writeFile(filePath, videoContent);
          try {
            await remove(videoFile);
          } catch (e) {
            console.warn('清理临时文件失败:', e);
          }
        }
      }

      setProgress(100);
      setStatus('completed');
      setMsg('下载完成！文件已保存');

      // 更新历史记录为完成状态
      if (currentRecordId) {
        try {
          await updateDownloadRecord(currentRecordId, {
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString(),
            files: [filePath],
          });
        } catch (error) {
          console.error('更新历史记录失败:', error);
        }
      }

    } catch (e: any) {
      console.error('处理失败:', e);
      const errorMsg = e?.message || e?.toString() || '未知错误';
      console.error('详细错误信息:', {
        message: e?.message,
        stack: e?.stack,
        response: e?.response,
        data: e?.response?.data
      });
      setMsg('处理失败: ' + errorMsg);
      setStatus('failed');

      // 更新历史记录为失败状态
      if (currentRecordId) {
        try {
          await updateDownloadRecord(currentRecordId, {
            status: 'failed',
            progress: 0,
            errorMessage: errorMsg,
          });
        } catch (error) {
          console.error('更新历史记录失败:', error);
        }
      }
    }
  }, [parsedData, deviceId, licenseCode, checkTools]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '40px',
        boxSizing: 'border-box'
      }}>
        {/* 头部区域 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: '28px',
              fontWeight: '600',
              color: '#1f2937',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              下载视频
            </h1>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              解密并下载 DRM 保护的视频内容
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onShowHistory && (
              <button
                onClick={onShowHistory}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                📋 下载历史
              </button>
            )}
            {onShowSettings && (
              <button
                onClick={onShowSettings}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                ⚙️ 设置
              </button>
            )}
          </div>
        </div>

        {/* JSON 输入区域 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            📄 从油猴脚本复制的 JSON 数据
          </label>
          <textarea
            placeholder='粘贴从 GagaOOLala DRM 捕获器复制的 JSON 数据，例如：&#10;{&#10;  "Title": "视频标题",&#10;  "MPD": "https://...",&#10;  "PSSH": "AAAA...",&#10;  "LicenseURL": "https://..."&#10;}'
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            style={{
              width: '100%',
              padding: '16px',
              minHeight: '200px',
              fontFamily: 'monospace',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              resize: 'vertical',
              boxSizing: 'border-box',
              backgroundColor: '#f9fafb'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
          />
        </div>

        {/* 数据预览 */}
        {parsedData && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#166534',
              marginBottom: '8px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              ✅ 数据解析成功
            </div>
            <div style={{ fontSize: '13px', color: '#15803d', fontFamily: 'monospace' }}>
              标题: {parsedData.title || '未设置'}<br/>
              MPD: {parsedData.mpd ? '已设置' : '未设置'}<br/>
              PSSH: {parsedData.pssh ? '已设置' : '未设置'}<br/>
              授权URL: {parsedData.license_url ? '已设置' : '未设置'}
            </div>
          </div>
        )}

        {/* 开始下载按钮 */}
        <button
          onClick={handleSubmit}
          disabled={status === 'downloading' || status === 'getting_keys' || status === 'checking'}
          style={{
            width: '100%',
            padding: '16px 24px',
            backgroundColor: (status === 'downloading' || status === 'getting_keys' || status === 'checking') ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: (status === 'downloading' || status === 'getting_keys' || status === 'checking') ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            marginBottom: '24px'
          }}
          onMouseOver={(e) => {
            if (!(status === 'downloading' || status === 'getting_keys' || status === 'checking')) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseOut={(e) => {
            if (!(status === 'downloading' || status === 'getting_keys' || status === 'checking')) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          {status === 'downloading' ? '⬇️ 下载中...' : status === 'getting_keys' ? '🔑 获取密钥...' : status === 'checking' ? '🔍 检查工具...' : '🚀 开始下载'}
        </button>

        {/* 进度显示区域 */}
        {(status === 'downloading' || status === 'getting_keys' || status === 'checking') && (
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                {status === 'checking' ? '🔍 检查工具可用性' : status === 'getting_keys' ? '🔑 获取解密密钥' : '⬇️ 下载视频文件'}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#3b82f6',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                {progress}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                  transition: 'width 0.3s ease',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        )}

        {/* 消息显示 */}
        {msg && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: msg.includes('错误') ? '#fef2f2' : '#f0fdf4',
            color: msg.includes('错误') ? '#dc2626' : '#166534',
            border: `1px solid ${msg.includes('错误') ? '#fecaca' : '#bbf7d0'}`
          }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
