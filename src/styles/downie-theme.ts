/**
 * Downie 风格主题配置
 * 基于真实 Downie 4 界面的精确规范
 */

export const downieTheme = {
  // 毛玻璃背景
  glass: {
    // 主界面 - 冷色调，干净
    main: {
      background: 'rgba(255, 255, 255, 0.65)',
      backdropFilter: 'blur(40px) saturate(180%)',
    },
    // 启动页/空状态 - 暖色渐变
    warm: {
      background: `linear-gradient(135deg, 
        rgba(255, 182, 193, 0.3) 0%,
        rgba(173, 216, 230, 0.3) 50%,
        rgba(255, 218, 185, 0.3) 100%)`,
      backdropFilter: 'blur(40px)',
    },
    // 卡片
    card: {
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(20px)',
    },
    // 工具栏
    toolbar: {
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
    },
  },

  // 颜色
  colors: {
    // 进度条绿色
    progress: {
      start: '#30D158',
      end: '#34C759',
    },
    // 强调紫色
    accent: '#AF52DE',
    // 文字
    text: {
      primary: '#000000',
      secondary: '#3C3C43',
      tertiary: '#8E8E93',
    },
    // 边框
    border: {
      light: 'rgba(0, 0, 0, 0.1)',
    },
  },

  // 阴影（轻盈感）
  shadows: {
    card: '0 1px 5px rgba(0, 0, 0, 0.06)',
    toolbar: '0 -2px 10px rgba(0, 0, 0, 0.05)',
  },

  // 字体（SF Pro）
  fonts: {
    system: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Monaco, monospace',
  },

  // 字号
  fontSizes: {
    title: '17px',      // 标题
    body: '13px',       // 次级信息
    caption: '11px',    // 辅助说明
  },

  // 字重
  fontWeights: {
    regular: 400,
    semibold: 600,
  },

  // 圆角
  radius: {
    card: '12px',
    button: '8px',
    progress: '3px',
  },

  // 尺寸
  sizes: {
    // 任务卡片
    taskCard: {
      height: '100px',
      thumbnailSize: '68px',
    },
    // 工具栏
    toolbar: {
      height: '52px',
    },
    // 标题栏
    titleBar: {
      height: '52px',
    },
  },

  // 间距
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    base: '16px',
    lg: '20px',
    xl: '24px',
  },

  // 动画
  transitions: {
    fast: '200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    base: '300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

// 常用样式对象
export const commonStyles = {
  // 只读输入框样式
  readonlyInput: {
    background: 'rgba(250,250,250,0.65)',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: '13px',
    fontFamily: 'SF Mono, ui-monospace, Menlo, Monaco, monospace',
    color: 'rgba(60,60,67,0.85)',
    maxWidth: 280,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // 状态徽章
  statusBadge: (authed: boolean) => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    padding: '4px 12px',
    borderRadius: 999,
    background: authed
      ? 'linear-gradient(90deg, #34C759 0%, #30D158 100%)'
      : 'linear-gradient(90deg, #FF3B30 0%, #FF453A 100%)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '13px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  }),

  // 设置行样式
  settingRow: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 20,
    padding: '10px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },

  // 设置标签列
  labelColumn: {
    width: 160,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 4,
  },

  // 设置标签
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(60,60,67,0.9)',
  },

  // 设置描述
  description: {
    fontSize: '12px',
    color: 'rgba(60,60,67,0.6)',
  },

  // 内容列
  contentColumn: {
    flex: 1,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    gap: 12,
    flexWrap: 'wrap' as const,
  },

  // 日志列表
  logList: {
    maxHeight: 240,
    overflowY: 'auto' as const,
    padding: `${downieTheme.spacing.sm} ${downieTheme.spacing.sm}`,
    borderRadius: downieTheme.radius.button,
    border: `0.5px solid ${downieTheme.colors.border.light}`,
    background: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Menlo, Monaco, Consolas, "SF Mono", monospace',
    fontSize: '12px',
  },

  // 日志条目
  logEntry: (level: string) => ({
    display: 'flex' as const,
    gap: downieTheme.spacing.sm,
    alignItems: 'flex-start' as const,
    padding: `${downieTheme.spacing.xs} ${downieTheme.spacing.sm}`,
    borderRadius: downieTheme.radius.button,
    background:
      level === 'ERROR'
        ? 'rgba(255, 59, 48, 0.12)'
        : level === 'WARN'
        ? 'rgba(255, 204, 0, 0.12)'
        : 'transparent',
    color:
      level === 'ERROR'
        ? '#ff3b30'
        : level === 'WARN'
        ? '#ff9500'
        : downieTheme.colors.text.secondary,
  }),
} as const;

export type DownieTheme = typeof downieTheme;
