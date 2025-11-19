import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import type { DownloadPhase } from '../hooks/useDownload';

interface TaskCardProps {
  title: string;
  source?: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  phase?: DownloadPhase;
  speed?: string;
  fileInfo?: string;
  onClose?: () => void;
  onShowInFinder?: () => void;
}

export function TaskCard({
  title,
  source = 'gagaoolala.com',
  progress,
  status,
  phase,
  speed,
  fileInfo,
  onClose,
  onShowInFinder,
}: TaskCardProps) {
  const cardStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: downieTheme.sizes.taskCard.height,
    background: downieTheme.glass.card.background,
    backdropFilter: downieTheme.glass.card.backdropFilter,
    WebkitBackdropFilter: downieTheme.glass.card.backdropFilter,
    borderRadius: downieTheme.radius.card,
    boxShadow: downieTheme.shadows.card,
    padding: downieTheme.spacing.lg,
    display: 'flex',
    gap: downieTheme.spacing.lg,
    alignItems: 'center',
    fontFamily: downieTheme.fonts.system,
  };

  const thumbnailStyle: CSSProperties = {
    width: downieTheme.sizes.taskCard.thumbnailSize,
    height: downieTheme.sizes.taskCard.thumbnailSize,
    borderRadius: downieTheme.radius.button,
    background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8EA 100%)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.sm,
    minWidth: 0,
  };

  const titleStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.title,
    fontWeight: downieTheme.fontWeights.semibold,
    color: downieTheme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const sourceStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    fontWeight: downieTheme.fontWeights.regular,
    color: downieTheme.colors.text.tertiary,
  };

  const progressContainerStyle: CSSProperties = {
    width: '100%',
    height: '6px',
    background: 'linear-gradient(to bottom, #e9e9ea, #dcdcde)',
    borderRadius: downieTheme.radius.progress,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
  };

  const progressBarStyle: CSSProperties = {
    width: `${progress}%`,
    height: '100%',
    background: `linear-gradient(90deg, ${downieTheme.colors.progress.start}, ${downieTheme.colors.progress.end})`,
    borderRadius: downieTheme.radius.progress,
    boxShadow: '0 0 8px rgba(175, 82, 222, 0.4)',
    transition: `width ${downieTheme.transitions.base}`,
  };

  const infoRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const infoStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    fontWeight: downieTheme.fontWeights.regular,
    color: downieTheme.colors.text.tertiary,
  };

  const closeButtonStyle: CSSProperties = {
    position: 'absolute',
    top: downieTheme.spacing.base,
    right: downieTheme.spacing.base,
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0, 0, 0, 0.06)',
    color: downieTheme.colors.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: downieTheme.fontWeights.regular,
    transition: `all ${downieTheme.transitions.fast}`,
  };

  const finderButtonStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.caption,
    color: downieTheme.colors.accent,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: downieTheme.fonts.system,
    fontWeight: downieTheme.fontWeights.semibold,
    transition: `opacity ${downieTheme.transitions.fast}`,
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'downloading':
        return '📺';
      default:
        return '⏳';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return '下载完成';
      case 'failed':
        return '下载失败';
      case 'downloading':
        return `正在下载 ${progress}%`;
      default:
        return '等待中';
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'decrypting':
        return '正在解密';
      case 'merging':
        return '正在合并';
      case 'burning':
        return '字幕烧录中';
      case 'completed':
        return '下载完成';
      case 'failed':
        return '下载失败';
      case 'downloading':
        return `正在下载 ${progress}%`;
      default:
        return undefined;
    }
  };

  return (
    <div style={cardStyle}>
      {/* 缩略图 */}
      <div style={thumbnailStyle}>{getStatusIcon()}</div>

      {/* 内容 */}
      <div style={contentStyle}>
        <div style={titleStyle}>{title}</div>
        <div style={sourceStyle}>{source}</div>
        
        {/* 进度条或状态 */}
        {status === 'downloading' ? (
          <>
            <div style={progressContainerStyle}>
              <div style={progressBarStyle} />
            </div>
            <div style={infoRowStyle}>
              <div style={infoStyle}>{[getPhaseText() || getStatusText(), speed].filter(Boolean).join(' · ')}</div>
              {fileInfo && <div style={infoStyle}>{fileInfo}</div>}
            </div>
          </>
        ) : (
          <div style={infoRowStyle}>
            <div style={infoStyle}>{getPhaseText() || getStatusText()}</div>
            {fileInfo && <div style={infoStyle}>{fileInfo}</div>}
          </div>
        )}
        
        {/* 完成后显示查看按钮 */}
        {status === 'completed' && onShowInFinder && (
          <button
            style={finderButtonStyle}
            onClick={onShowInFinder}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            在 Finder 中显示 →
          </button>
        )}
      </div>

      {/* 关闭按钮 */}
      {onClose && (
        <button
          style={closeButtonStyle}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
