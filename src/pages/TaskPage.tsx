import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { readSettings } from '../utils/settings';
import { downieTheme } from '../styles/downie-theme';
import { TaskCard } from '../components/TaskCard';
import { useDownload, type VideoInfo } from '../hooks/useDownload';

import { DropZone } from '../components/DropZone';
import { AppLayout } from '../components/layout/AppLayout';
import { navigate } from '../utils/navigation';
import { openWindow } from '../utils/windowManager';

interface TaskPageProps {
  deviceId: string;
  licenseCode: string;
  authed: boolean;
}



export default function TaskPage({ authed }: TaskPageProps) {
  const [outputPath, setOutputPath] = useState<string>('');
  const { status, progress, error, logs, currentTask, startDownload, cancelDownload, setError, phase, downloadSpeed } = useDownload();
  const [showLogs, setShowLogs] = useState<boolean>(true);



  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await readSettings();
        if (settings.defaultDownloadDir) {
          setOutputPath(settings.defaultDownloadDir);
        }
      } catch (err) {
        console.warn('使用默认设置');
      }
    };

    loadSettings();
  }, []);





  const handlePaste = async (text: string) => {
    try {
      let videoInfo: VideoInfo;

      // 尝试解析为 JSON
      if (text.trim().startsWith('{')) {
        videoInfo = JSON.parse(text);
      } else if (text.trim().startsWith('http')) {
        // 直接 MPD 链接
        const url = text.trim();
        const title = new URL(url).pathname.split('/').pop() || 'video';
        videoInfo = {
          Title: title,
          MPD: url,
          捕获时间: new Date().toLocaleString('zh-CN'),
        };
      } else {
        setError('格式不支持，请粘贴 JSON 或 MPD 链接');
        return;
      }

      // 验证必要字段
      if (!videoInfo.Title || !videoInfo.MPD) {
        setError('缺少必要字段：Title 和 MPD');
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

      // 直接开始下载
      await startDownload(videoInfo, outputPath);
    } catch (err) {
      setError('解析失败，请检查格式（JSON 或 MPD 链接）');
    }
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

  const handleNavigate = (target: 'tasks' | 'history' | 'settings' | 'logs') => {
    if (target === 'tasks') return;
    const routeMap: Record<'tasks' | 'history' | 'settings' | 'logs', '/' | '/history' | '/settings' | '/logs'> = {
      tasks: '/',
      history: '/history',
      settings: '/settings',
      logs: '/logs',
    };
    navigate(routeMap[target]);
  };

  // 样式
  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '20px 0 80px',
    boxSizing: 'border-box',
    overflow: 'auto',
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
    justifyContent: 'flex-start',
    gap: downieTheme.spacing.lg,
    maxWidth: '100%',
    width: '100%',
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
    <AppLayout active="tasks" onNavigate={handleNavigate}>
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
              phase={phase}
              speed={downloadSpeed}
              fileInfo="MP4 - 1920×1080"
              onClose={cancelDownload}
              onShowInFinder={status === 'completed' ? handleShowInFinder : undefined}
            />
            
            {/* 日志显示面板 */}
            {logs.length > 0 && (
              <div
                style={{
                  marginTop: downieTheme.spacing.lg,
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.05)',
                  border: `1px solid ${downieTheme.colors.border.light}`,
                  borderRadius: downieTheme.radius.card,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.md}`,
                    background: 'rgba(0, 0, 0, 0.03)',
                    borderBottom: `1px solid ${downieTheme.colors.border.light}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowLogs(!showLogs)}
                >
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: downieTheme.colors.text.primary 
                  }}>
                    详细日志 ({logs.length} 条)
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: downieTheme.colors.text.secondary 
                  }}>
                    {showLogs ? '▼' : '▶'}
                  </span>
                </div>
                {showLogs && (
                  <div
                    style={{
                      maxHeight: '400px',
                      padding: downieTheme.spacing.md,
                      overflowY: 'auto',
                      fontFamily: downieTheme.fonts.mono,
                      fontSize: '11px',
                      lineHeight: 1.8,
                    }}
                  >
                    {logs.map((log, index) => {
                      const color =
                        log.level === 'ERROR'
                          ? '#ff3b30'
                          : log.level === 'WARN'
                          ? '#ff9500'
                          : log.level === 'INFO'
                          ? downieTheme.colors.text.secondary
                          : downieTheme.colors.text.tertiary;

                      return (
                        <div
                          key={index}
                          style={{
                            color,
                            marginBottom: '2px',
                            wordBreak: 'break-all',
                          }}
                        >
                          {`[${new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}] ${log.message}`}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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


      </div>
    </AppLayout>
  );
}
