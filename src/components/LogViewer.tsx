import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { downieTheme } from '../styles/downie-theme';

import { CustomSelect } from './ui/CustomSelect';

interface LogViewerProps {
  style?: CSSProperties;
}

export function LogViewer({ style }: LogViewerProps) {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadLogFiles();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadLogContent(selectedFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const loadLogFiles = async () => {
    try {
      const files = await invoke<string[]>('list_log_files');
      setLogFiles(files);
      if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0]);
      }
    } catch (error) {
      console.error('加载日志文件列表失败:', error);
    }
  };

  const loadLogContent = async (filePath: string) => {
    if (!filePath) {
      setLogContent('');
      return;
    }
    setLoading(true);
    try {
      const content = await invoke<string>('read_log_file', { filePath });
      setLogContent(content);
    } catch (error) {
      console.error('加载日志内容失败:', error);
      setLogContent(`加载日志内容失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    const { confirm } = await import('@tauri-apps/plugin-dialog');
    const confirmed = await confirm('确定要清理 30 天前的旧日志文件吗？', {
      title: 'GAGA Client',
      okLabel: 'OK',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    try {
            const deletedCount = await invoke<number>('cleanup_old_logs', { keepDays: 1 });
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      sendNotification({ title: 'GAGA Client', body: `已清理 ${deletedCount} 个旧日志文件` });
      await loadLogFiles();
    } catch (error) {
      console.error('清理日志失败:', error);
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      sendNotification({ title: 'GAGA Client', body: `清理日志失败: ${error}` });
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.md,
    ...style,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: downieTheme.spacing.sm,
  };

  const buttonStyle: CSSProperties = {
    padding: `${downieTheme.spacing.xs} ${downieTheme.spacing.md}`,
    borderRadius: downieTheme.radius.button,
    border: `1px solid ${downieTheme.colors.border.light}`,
    background: 'white',
    fontSize: '13px',
    fontFamily: downieTheme.fonts.system,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const logContentStyle: CSSProperties = {
    maxHeight: '500px',
    overflowY: 'auto',
    padding: downieTheme.spacing.md,
    background: 'rgba(0, 0, 0, 0.02)',
    borderRadius: downieTheme.radius.button,
    fontFamily: "'SF Mono', ui-monospace, Menlo, Monaco, monospace",
    fontSize: '11px',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: downieTheme.colors.text.secondary,
    marginTop: downieTheme.spacing.md,
  };

  return (
    <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: downieTheme.colors.text.primary }}>
            日志文件列表 ({logFiles.length})
          </span>
          <button style={buttonStyle} onClick={handleCleanup}>
            清理旧日志
          </button>
        </div>
        
        {logFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: downieTheme.spacing.xl, color: downieTheme.colors.text.tertiary }}>
            暂无日志文件
          </div>
        ) : (
          <CustomSelect
            options={logFiles.map(file => ({
              value: file,
              label: file.split('/').pop() || file,
            }))}
            value={selectedFile || ''}
            onChange={(value) => setSelectedFile(value)}
          />
        )}

        {selectedFile && (
          <div style={logContentStyle}>
            {loading ? '加载中...' : logContent}
          </div>
        )}

    </div>
  );
}

