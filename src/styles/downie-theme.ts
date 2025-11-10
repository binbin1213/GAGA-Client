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

export type DownieTheme = typeof downieTheme;
