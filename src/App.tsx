import { useState, useEffect, useCallback } from 'react';
import AuthPage from './pages/AuthPage';
import TaskPage from './pages/TaskPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { getDeviceId } from './utils/deviceId';
import { validateLocalAuth, clearAuthState } from './utils/auth';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './App.css';

type PageType = 'task' | 'history' | 'settings';

function App() {
  const [authed, setAuthed] = useState(false);
  const [deviceId, setDeviceId] = useState<string>(''); // 初始化为空，等待真实设备ID
  const [license, setLicense] = useState('');
  const [currentPage, setCurrentPage] = useState<PageType>('task');
  const [loading, setLoading] = useState(true); // 统一加载状态

  useEffect(() => {
    // 设置窗口最小化到托盘的行为
    const setupWindow = async () => {
      const window = getCurrentWindow();
      
      // 监听窗口关闭事件，改为隐藏到托盘
      const unlisten = window.onCloseRequested(async (event) => {
        event.preventDefault();
        await window.hide();
      });

      return unlisten;
    };

    const initializeApp = async () => {
      try {
        console.log('正在初始化应用...');
        
        // 1. 获取设备ID
        const id = await getDeviceId();
        setDeviceId(id);
        console.log('设备ID已初始化:', id);

        // 2. 检查本地授权状态
        const authState = await validateLocalAuth();
        if (authState && authState.deviceId === id) {
          // 授权状态有效且设备ID匹配
          setLicense(authState.licenseCode);
          setAuthed(true);
          console.log('本地授权状态有效，直接进入应用');
        } else {
          console.log('需要重新授权');
          // 确保清除任何不匹配的授权状态
          if (authState) {
            await clearAuthState();
          }
        }
      } catch (error) {
        console.error('应用初始化失败:', error);
        // 发生错误时，清除可能存在的无效授权状态
        try {
          await clearAuthState();
        } catch (clearError) {
          console.error('清除授权状态失败:', clearError);
        }
        // 设置降级设备ID但不设置授权状态
        setDeviceId(`fallback_${Date.now()}`);
      } finally {
        setLoading(false);
      }
    };

    setupWindow();
    initializeApp();
  }, []);

  // 当授权成功时跳转到任务页 - 使用 useCallback 优化性能
  const handleAuthed = useCallback((device: string, code: string) => {
    setDeviceId(device);
    setLicense(code);
    setAuthed(true);
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <div>正在初始化应用...</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>获取设备信息并检查授权状态</div>
      </div>
    );
  }

  if (!authed) {
    return <AuthPage onAuthed={handleAuthed} deviceId={deviceId} />;
  }

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
  };

  switch (currentPage) {
    case 'history':
      return <HistoryPage onBack={() => handlePageChange('task')} />;
    case 'settings':
      return <SettingsPage onBack={() => handlePageChange('task')} />;
    default:
      return <TaskPage deviceId={deviceId} licenseCode={license} onShowHistory={() => handlePageChange('history')} onShowSettings={() => handlePageChange('settings')} />;
  }
}

export default App;
