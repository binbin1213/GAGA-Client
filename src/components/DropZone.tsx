import { useState } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';
import '../styles/interactions.css';

interface DropZoneProps {
  onPaste: (text: string) => void;
}

export function DropZone({ onPaste }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const containerStyle: CSSProperties = {
    width: '100%',
  };

  const dropZoneStyle: CSSProperties = {
    border: isDragging
      ? `2px dashed #007AFF`
      : '2px dashed rgba(0, 0, 0, 0.15)',
    borderRadius: '12px',
    padding: '48px 0',
    textAlign: 'center',
    background: isDragging ? 'rgba(0, 122, 255, 0.12)' : 'rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: downieTheme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const iconStyle: CSSProperties = {
    fontSize: '28px',
    color: 'rgba(0, 0, 0, 0.6)',
  };

  const textStyle: CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: 'rgba(0, 0, 0, 0.9)',
    fontFamily: downieTheme.fonts.system,
  };

  const hintStyle: CSSProperties = {
    fontSize: '13px',
    color: 'rgba(60, 60, 67, 0.6)',
    fontFamily: downieTheme.fonts.system,
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onPaste(text);
      }
    } catch (error) {
      console.error('读取剪贴板失败:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const text = e.dataTransfer.getData('text');
    if (text.trim()) {
      onPaste(text);
    }
  };

  return (
    <div style={containerStyle}>
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        style={dropZoneStyle}
        onClick={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="dropzone-icon" style={iconStyle}>📥</div>
        <div style={textStyle}>粘贴或拖放任务信息</div>
        <div style={hintStyle}>支持 JSON 或 MPD 链接，点击可读取剪贴板</div>
      </div>
    </div>
  );
}
