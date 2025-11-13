import { useState, useEffect } from 'react';
import TaskPage from './pages/TaskPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { getDeviceId } from './utils/deviceId';
import { validateLocalAuth, clearAuthState } from './utils/auth';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { logInfo, logError } from './utils/logger';
import { navigationConstants } from './utils/navigation';
import './App.css';

function App() {
  const [authed, setAuthed] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [license, setLicense] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      if (detail?.path) {
        setCurrentPath(detail.path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(navigationConstants.eventName, handleNavigate as EventListener);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(navigationConstants.eventName, handleNavigate as EventListener);
    };
  }, []);

  useEffect(() => {
    // 设置窗口最小化到托盘的行为（仅主窗口）
    const setupWindow = async () => {
      const window = getCurrentWindow();
      
      // 只有主窗口才隐藏到托盘，其他窗口直接关闭
      if (currentPath === '/') {
        const unlisten = window.onCloseRequested(async (event) => {
          event.preventDefault();
          await window.hide();
        });
        return unlisten;
      }
    };

    const initializeApp = async () => {
      try {
        logInfo('正在初始化应用...');
        
        // 1. 获取设备ID
        const id = await getDeviceId();
        setDeviceId(id);
        logInfo(`设备ID已初始化: ${id}`);

        // 2. 检查本地授权状态
        const authState = await validateLocalAuth();
        if (authState && authState.deviceId === id) {
          setLicense(authState.licenseCode);
          setAuthed(true);
          logInfo('本地授权状态有效');
        } else {
          logInfo('未授权或授权已过期');
          if (authState) {
            await clearAuthState();
          }
        }
      } catch (error) {
        logError('应用初始化失败', error);
        try {
          await clearAuthState();
        } catch (clearError) {
          logError('清除授权状态失败', clearError);
        }
        setDeviceId(`fallback_${Date.now()}`);
      } finally {
        setLoading(false);
      }
    };

    setupWindow();
    initializeApp();

    // 监听授权成功事件
    let unlisten: (() => void) | undefined;
    const setupAuthListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('auth-success', (event: any) => {
        logInfo('收到授权成功事件');
        const { deviceId: newDeviceId, licenseCode } = event.payload;
        handleAuthed(newDeviceId, licenseCode);
      });
    };
    setupAuthListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [currentPath]);

  const handleAuthed = (device: string, code: string) => {
    setDeviceId(device);
    setLicense(code);
    setAuthed(true);
    logInfo('授权状态已更新');
  };

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ fontSize: '48px' }}>⏳</div>
        <div style={{ fontSize: '17px', color: '#1d1d1f' }}>正在初始化应用...</div>
        <div style={{ fontSize: '13px', color: '#86868b' }}>获取设备信息并检查授权状态</div>
      </div>
    );
  }

  // 根据路径渲染不同的页面
  switch (currentPath) {
    case '/history':
      return <HistoryPage />;
    case '/settings':
      return <SettingsPage deviceId={deviceId} authed={authed} />;
    case '/auth':
      return (
        <AuthPage
          deviceId={deviceId}
          onAuthed={handleAuthed}
        />
      );
    default:
      return (
        <TaskPage
          deviceId={deviceId}
          licenseCode={license}
          authed={authed}
        />
      );
  }
}

export default App;
