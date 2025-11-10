import { useState } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../styles/downie-theme';

interface DropZoneProps {
  onPaste: (text: string) => void;
}

export function DropZone({ onPaste }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const containerStyle: CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
  };

  const dropZoneStyle: CSSProperties = {
    border: isDragging
      ? `2px dashed ${downieTheme.colors.accent}`
      : '2px dashed rgba(0, 0, 0, 0.15)',
    borderRadius: downieTheme.radius.card,
    padding: '80px 40px',
    textAlign: 'center',
    background: isDragging 
      ? 'rgba(175, 82, 222, 0.05)' 
      : 'transparent',
    transition: `all ${downieTheme.transitions.base}`,
    cursor: 'pointer',
  };

  const iconStyle: CSSProperties = {
    fontSize: '64px',
    marginBottom: downieTheme.spacing.lg,
    opacity: isDragging ? 1 : 0.6,
    transition: `opacity ${downieTheme.transitions.fast}`,
  };

  const textStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.title,
    color: downieTheme.colors.text.secondary,
    fontFamily: downieTheme.fonts.system,
    fontWeight: downieTheme.fontWeights.semibold,
    marginBottom: downieTheme.spacing.sm,
  };

  const hintStyle: CSSProperties = {
    fontSize: downieTheme.fontSizes.body,
    color: downieTheme.colors.text.tertiary,
    fontFamily: downieTheme.fonts.system,
    fontWeight: downieTheme.fontWeights.regular,
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
        style={dropZoneStyle}
        onClick={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={iconStyle}>📋</div>
        <div style={textStyle}>粘贴 JSON 信息</div>
        <div style={hintStyle}>点击粘贴或拖放文件到这里</div>
      </div>
    </div>
  );
}
