import { useState, useCallback, useMemo } from 'react';
import { getKeys } from '../api';
import type { SubmitTaskRequest } from '../types/api';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { mkdir, readDir, remove, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

interface Props {
  deviceId: string;
  licenseCode: string;
}

export default function TaskPage({ deviceId, licenseCode }: Props) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');

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

    // 检查工具
    if (!(await checkTools())) {
      setStatus('failed');
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
    }
  }, [parsedData, deviceId, licenseCode, checkTools]);

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 0 18px #eee' }}>
      <h2 style={{ textAlign: 'center' }}>下载视频</h2>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
          从油猴脚本复制的 JSON 数据：
        </div>
        <textarea
          placeholder='粘贴从 GagaOOLala DRM 捕获器复制的 JSON 数据，例如：&#10;{&#10;  "Title": "视频标题",&#10;  "MPD": "https://...",&#10;  "PSSH": "AAAA...",&#10;  "LicenseURL": "https://..."&#10;}'
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          style={{ width: '100%', padding: 12, minHeight: 200, fontFamily: 'monospace', fontSize: 12, borderRadius: 6, border: '1px solid #ddd' }}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={status === 'downloading' || status === 'getting_keys' || status === 'checking'}
        style={{
          width: '100%',
          padding: 10,
          marginBottom: 24,
          opacity: (status === 'downloading' || status === 'getting_keys' || status === 'checking') ? 0.6 : 1,
          cursor: (status === 'downloading' || status === 'getting_keys' || status === 'checking') ? 'not-allowed' : 'pointer'
        }}
      >
        {status === 'downloading' ? '下载中...' : status === 'getting_keys' ? '获取密钥...' : status === 'checking' ? '检查工具...' : '开始下载'}
      </button>

      {(status === 'downloading' || status === 'getting_keys' || status === 'checking') && (
        <div style={{ background: '#f8f8fa', borderRadius: 6, padding: 14, marginBottom: 20 }}>
          <div>状态: <b>{status === 'checking' ? '检查工具' : status === 'getting_keys' ? '获取密钥' : '下载中'}</b></div>
          <div>进度: <b>{progress}%</b></div>
          <div style={{ marginTop: 8, width: '100%', background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: 8,
                background: '#4CAF50',
                width: `${progress}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div style={{ background: '#d4edda', borderRadius: 6, padding: 14, marginBottom: 20, color: '#155724' }}>
          ✅ 下载完成！
        </div>
      )}

      {status === 'failed' && (
        <div style={{ background: '#f8d7da', borderRadius: 6, padding: 14, marginBottom: 20, color: '#721c24' }}>
          ❌ 处理失败
        </div>
      )}

      {msg && <div style={{ color: status === 'failed' ? 'red' : 'orange', marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
