import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';

export interface WindowConfig {
  label: string;
  title: string;
  url: string;
  width: number;
  height: number;
  resizable?: boolean;
  center?: boolean;
  decorations?: boolean;
  hiddenTitle?: boolean;
}

const windowConfigs: Record<string, WindowConfig> = {
  main: {
    label: 'main',
    title: 'GAGA',
    url: '/',
    width: 800,
    height: 600,
    resizable: true,
    center: true,
    decorations: true,
    hiddenTitle: true,
  },
  history: {
    label: 'history',
    title: '下载历史',
    url: '/history',
    width: 900,
    height: 700,
    resizable: true,
    center: true,
    decorations: true,
    hiddenTitle: true,
  },
  settings: {
    label: 'settings',
    title: '设置',
    url: '/settings',
    width: 700,
    height: 600,
    resizable: true,
    center: true,
    decorations: true,
    hiddenTitle: true,
  },
  auth: {
    label: 'auth',
    title: '设备授权',
    url: '/auth',
    width: 600,
    height: 500,
    resizable: false,
    center: true,
    decorations: true,
    hiddenTitle: true,
  },
};

/**
 * 打开一个新窗口
 */
export async function openWindow(windowType: keyof typeof windowConfigs): Promise<WebviewWindow | null> {
  try {
    const config = windowConfigs[windowType];
    console.log(`尝试打开窗口: ${config.label}`);
    
    // 检查窗口是否已经存在
    try {
      const existingWindow = await WebviewWindow.getByLabel(config.label);
      if (existingWindow) {
        console.log(`窗口 ${config.label} 已存在，聚焦`);
        await existingWindow.setFocus();
        return existingWindow;
      }
    } catch (err) {
      console.log(`检查窗口存在性时出错，继续创建新窗口:`, err);
    }

    // 创建新窗口
    console.log(`创建新窗口: ${config.label}`, config);
    const webview = new WebviewWindow(config.label, {
      title: config.title,
      url: config.url,
      width: config.width,
      height: config.height,
      resizable: config.resizable ?? true,
      center: config.center ?? true,
      decorations: config.decorations ?? true,
      hiddenTitle: config.hiddenTitle,
    });

    console.log(`窗口 ${config.label} 创建成功`);
    return webview;
  } catch (error) {
    console.error(`打开窗口失败:`, error);
    return null;
  }
}

/**
 * 关闭当前窗口
 */
export async function closeCurrentWindow(): Promise<void> {
  try {
    const window = getCurrentWindow();
    await window.close();
  } catch (error) {
    console.error('关闭窗口失败:', error);
  }
}

/**
 * 隐藏当前窗口
 */
export async function hideCurrentWindow(): Promise<void> {
  try {
    const window = getCurrentWindow();
    await window.hide();
  } catch (error) {
    console.error('隐藏窗口失败:', error);
  }
}

/**
 * 获取当前窗口标签
 */
export async function getCurrentWindowLabel(): Promise<string> {
  try {
    const window = getCurrentWindow();
    return window.label;
  } catch (error) {
    console.error('获取窗口标签失败:', error);
    return 'unknown';
  }
}
