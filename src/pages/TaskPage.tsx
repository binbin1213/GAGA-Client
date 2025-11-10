import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { readSettings } from '../utils/settings';
import { logInfo } from '../utils/logger';
import { downieTheme } from '../styles/downie-theme';
import { TaskCard } from '../components/TaskCard';
import { Toolbar } from '../components/Toolbar';
import { DropZone } from '../components/DropZone';
import { openWindow } from '../utils/windowManager';

interface TaskPageProps {
  deviceId: string;
  licenseCode: string;
  authed: boolean;
}

interface VideoInfo {
  Title: string;
  MPD: string;
  PSSH?: string;
  LicenseURL?: string;
  Keys?: string[]; // KID:KEY 格式的密钥数组
  捕获时间: string;
}

export default function TaskPage({ authed }: TaskPageProps) {
  const [outputPath, setOutputPath] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [currentTask, setCurrentTask] = useState<VideoInfo | null>(null);
  const [status, setStatus] = useState<'pending' | 'downloading' | 'completed' | 'failed'>('pending');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await readSettings();
        if (settings.defaultDownloadDir) {
          setOutputPath(settings.defaultDownloadDir);
        }
      } catch (err) {
        logInfo('使用默认设置');
      }
    };

    loadSettings();
  }, []);

  const handlePaste = async (text: string) => {
    try {
      // 解析 JSON
      const videoInfo: VideoInfo = JSON.parse(text);

      // 验证必要字段
      if (!videoInfo.Title || !videoInfo.MPD) {
        setError('JSON 格式不正确，缺少必要字段');
        return;
      }

      // 检查授权
      if (!authed) {
        setError('需要授权才能下载');
        return;
      }

      // 检查下载目录
      if (!outputPath) {
        setError('请先选择下载目录');
        return;
      }

      // 设置当前任务
      setCurrentTask(videoInfo);
      setStatus('pending');
      setError('');

      // TODO: 这里应该弹出确认对话框
      // 现在直接开始下载
      await startDownload(videoInfo);
    } catch (err) {
      setError('JSON 解析失败，请检查格式');
    }
  };

  const startDownload = async (videoInfo: VideoInfo) => {
    setStatus('downloading');
    setProgress(0);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // 构建下载参数
      const args = [
        videoInfo.MPD,
        '--save-dir', outputPath,
        '--save-name', videoInfo.Title,
        '--thread-count', '16',
        '--del-after-done',
        '--auto-select',  // 自动选择最佳流，避免交互式提示
        '--no-ansi-color',  // 禁用 ANSI 颜色代码
        '--no-log',  // 禁用日志文件输出
      ];

      // 如果有 PSSH 和 LicenseURL，先获取解密密钥
      if (videoInfo.PSSH && videoInfo.LicenseURL) {
        logInfo(`检测到加密视频，正在获取解密密钥...`);
        
        try {
          const { getKeys } = await import('../api');
          const { getDeviceId } = await import('../utils/deviceId');
          const { validateLocalAuth } = await import('../utils/auth');
          
          // 获取设备ID和授权信息
          const deviceId = await getDeviceId();
          const authState = await validateLocalAuth();
          
          if (!authState || !authState.licenseCode) {
            throw new Error('未授权，无法获取解密密钥');
          }
          
          // 调用 API 获取密钥
          const keysResponse = await getKeys({
            device_id: deviceId,
            license_code: authState.licenseCode,
            pssh: videoInfo.PSSH,
            license_url: videoInfo.LicenseURL,
          });
          
          if ((keysResponse.status === 'ok' || keysResponse.status === 'success') && keysResponse.keys && keysResponse.keys.length > 0) {
            logInfo(`成功获取 ${keysResponse.keys.length} 个解密密钥`);
            
            // 添加解密密钥参数
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
      setStatus('completed');
      setProgress(100);

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
  };

  const handleCancelDownload = () => {
    setStatus('pending');
    setCurrentTask(null);
    setProgress(0);
  };

  const handleShowInFinder = () => {
    // TODO: 在 Finder 中显示文件
    console.log('在 Finder 中显示');
  };

  const handleShowAuth = async () => {
    console.log('TaskPage: 点击授权按钮');
    try {
      const result = await openWindow('auth');
      console.log('TaskPage: 授权窗口打开结果:', result);
    } catch (error) {
      console.error('TaskPage: 打开授权窗口失败:', error);
    }
  };

  // 样式
  const containerStyle: CSSProperties = {
    width: '100vw',
    height: '100vh',
    background: currentTask
      ? downieTheme.glass.main.background
      : downieTheme.glass.warm.background,
    backdropFilter: currentTask
      ? downieTheme.glass.main.backdropFilter
      : downieTheme.glass.warm.backdropFilter,
    WebkitBackdropFilter: currentTask
      ? downieTheme.glass.main.backdropFilter
      : downieTheme.glass.warm.backdropFilter,
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    fontFamily: downieTheme.fonts.system,
  };

  const mainContentStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: `${downieTheme.spacing.xl} ${downieTheme.spacing.lg}`,
    paddingBottom: `calc(${downieTheme.sizes.toolbar.height} + ${downieTheme.spacing.xl})`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: downieTheme.spacing.xl,
  };

  const unauthorizedBoxStyle: CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    background: 'rgba(255, 59, 48, 0.1)',
    borderRadius: downieTheme.radius.card,
    padding: downieTheme.spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const unauthorizedTextStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    color: downieTheme.colors.text.primary,
  };

  const authButtonStyle: CSSProperties = {
    padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.lg}`,
    background: downieTheme.colors.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: downieTheme.radius.button,
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.semibold,
    cursor: 'pointer',
    fontFamily: downieTheme.fonts.system,
  };

  return (
    <div style={containerStyle}>
      {/* 主内容区 */}
      <div style={mainContentStyle}>
        {/* 任务卡片或拖放区域 */}
        {currentTask ? (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <TaskCard
              title={currentTask.Title}
              progress={progress}
              status={status}
              fileInfo="MP4 - 1920×1080"
              onClose={handleCancelDownload}
              onShowInFinder={status === 'completed' ? handleShowInFinder : undefined}
            />
          </div>
        ) : (
          <DropZone onPaste={handlePaste} />
        )}

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              ...unauthorizedBoxStyle,
              background: 'rgba(255, 59, 48, 0.1)',
            }}
          >
            <div style={unauthorizedTextStyle}>{error}</div>
          </div>
        )}

        {/* 未授权提示 */}
        {!authed && (
          <div style={unauthorizedBoxStyle}>
            <div>
              <div style={{ ...unauthorizedTextStyle, fontWeight: 600, marginBottom: '4px' }}>
                🔒 需要授权
              </div>
              <div style={unauthorizedTextStyle}>下载功能需要授权后才能使用</div>
            </div>
            <button style={authButtonStyle} onClick={handleShowAuth}>
              立即授权
            </button>
          </div>
        )}
      </div>

      {/* 底部工具栏 */}
      <Toolbar
        taskCount={currentTask ? 1 : 0}
        onAddTask={() => {
          // TODO: 打开添加任务对话框
        }}
      />
    </div>
  );
}
