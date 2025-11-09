import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readSettings, updateSettings } from '../utils/settings';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface TaskPageProps {
  deviceId: string;
  licenseCode: string;
  authed: boolean;
  onShowHistory: () => void;
  onShowSettings: () => void;
  onShowAuth: () => void;
}

const TaskPage: React.FC<TaskPageProps> = ({ 
  deviceId,
  licenseCode,
  authed,
  onShowHistory, 
  onShowSettings,
  onShowAuth
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await readSettings();
      if (settings.defaultDownloadDir) {
        setOutputPath(settings.defaultDownloadDir);
      }
    } catch (err) {
      console.log('使用默认设置');
    }
  };

  const selectOutputPath = async () => {
    try {
      const selected = await open({
        directory: true,
        title: '选择下载目录'
      });
      
      if (selected) {
        setOutputPath(selected as string);
        // 保存到设置
        await updateSettings({ defaultDownloadDir: selected as string });
      }
    } catch (err) {
      setError('选择目录失败');
    }
  };

  const startDownload = async () => {
    // 检查授权状态
    if (!authed) {
      setError('未授权：请先在设置页面完成设备授权后再进行下载');
      return;
    }

    if (!videoUrl.trim()) {
      setError('请输入视频链接');
      return;
    }

    if (!outputPath.trim()) {
      setError('请选择下载目录');
      return;
    }

    setDownloading(true);
    setProgress(0);
    setStatus('正在准备下载...');
    setError('');

    try {
      await invoke<string>('exec_download_command', {
        command: `yt-dlp -o "${outputPath}/%(title)s.%(ext)s" "${videoUrl}"`,
        args: [],
      });

      setStatus('下载完成！');
      setProgress(100);
    } catch (err: any) {
      setError(`下载失败: ${err}`);
      setStatus('');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* 顶部导航栏 - 只有窗口控制 */}
      <div 
        data-tauri-drag-region
        style={{
          background: '#ffffff',
          padding: '0',
          height: '36px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
        {/* 窗口控制按钮 */}
        <div style={{ display: 'flex', gap: '1px' }}>
          <button
            onClick={() => getCurrentWindow().minimize()}
            style={{
              width: '36px',
              height: '36px',
              background: 'transparent',
              color: '#606060',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            −
          </button>
          <button
            onClick={async () => {
              const window = getCurrentWindow();
              if (await window.isMaximized()) {
                await window.unmaximize();
              } else {
                await window.maximize();
              }
            }}
            style={{
              width: '36px',
              height: '36px',
              background: 'transparent',
              color: '#606060',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            □
          </button>
          <button
            onClick={() => getCurrentWindow().hide()}
            style={{
              width: '36px',
              height: '36px',
              background: 'transparent',
              color: '#606060',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            title="最小化到托盘"
          >
            ×
          </button>
        </div>
      </div>

      {/* 标题和功能按钮 */}
      <div style={{
        background: 'transparent',
        padding: '24px 24px 16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          GAGA Client
        </h1>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <button
            onClick={onShowHistory}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#333333',
              border: '1px solid #d0d0d0',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              cursor: 'pointer'
            }}
          >
            下载历史
          </button>
          <button
            onClick={onShowSettings}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#333333',
              border: '1px solid #d0d0d0',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              cursor: 'pointer'
            }}
          >
            设置
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          background: '#f5f5f5',
          padding: '0',
          boxShadow: 'none',
          border: 'none',
          boxSizing: 'border-box'
        }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #e0e0e0', paddingBottom: '16px' }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: 0,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              视频下载
            </h2>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#333333',
              marginBottom: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              视频链接
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startDownload()}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #d0d0d0',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0066ff'}
              onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
              placeholder="请输入视频链接..."
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#333333',
              marginBottom: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              下载目录
            </label>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={outputPath}
                readOnly
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  border: '1px solid #d0d0d0',
                  fontSize: '14px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  backgroundColor: '#f9f9f9',
                  color: '#666666',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="选择下载目录..."
              />
              <button
                onClick={selectOutputPath}
                style={{
                  padding: '14px 20px',
                  background: '#ffffff',
                  color: '#333333',
                  border: '1px solid #d0d0d0',
                  fontSize: '14px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                浏览
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '12px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#c41e3a',
              fontFamily: 'Consolas, "Courier New", monospace'
            }}>
              错误: {error}
            </div>
          )}

          {status && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '12px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#166534',
              fontFamily: 'Consolas, "Courier New", monospace'
            }}>
              状态: {status}
            </div>
          )}

          {downloading && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '11px',
                  color: '#606060',
                  fontFamily: 'Consolas, "Courier New", monospace',
                  letterSpacing: '0.5px'
                }}>
                  进度
                </span>
                <span style={{
                  fontSize: '11px',
                  color: '#1a1a1a',
                  fontFamily: 'Consolas, "Courier New", monospace'
                }}>
                  {progress}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e0e0e0',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#22c55e'
                }} />
              </div>
            </div>
          )}

          <button
            onClick={startDownload}
            disabled={downloading || !videoUrl.trim() || !outputPath.trim()}
            style={{
              width: '100%',
              padding: '16px',
              background: downloading || !videoUrl.trim() || !outputPath.trim()
                ? '#e0e0e0'
                : '#0066ff',
              color: downloading || !videoUrl.trim() || !outputPath.trim() ? '#999999' : '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              cursor: downloading || !videoUrl.trim() || !outputPath.trim() ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box'
            }}
          >
            {downloading ? '下载中...' : '开始下载'}
          </button>

          {/* 未授权提示 */}
          {!authed && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '4px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  未授权
                </div>
                <div style={{ fontSize: '13px', color: '#991b1b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  下载功能需要授权后才能使用
                </div>
              </div>
              <button
                onClick={onShowAuth}
                style={{
                  padding: '10px 20px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                立即授权
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskPage;
