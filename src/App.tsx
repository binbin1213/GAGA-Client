import { useState, useCallback } from 'react';
import AuthPage from './pages/AuthPage';
import TaskPage from './pages/TaskPage';
import './App.css';

function App() {
  const [authed, setAuthed] = useState(false);
  const [deviceId, setDeviceId] = useState('test123'); // 后续可用 context 全局提升
  const [license, setLicense] = useState('');

  // 当授权成功时跳转到任务页 - 使用 useCallback 优化性能
  const handleAuthed = useCallback((device: string, code: string) => {
    setDeviceId(device);
    setLicense(code);
    setAuthed(true);
  }, []);

  if (!authed) {
    return <AuthPage onAuthed={handleAuthed} deviceId={deviceId} />;
  }

  return <TaskPage deviceId={deviceId} licenseCode={license} />;
}

export default App;
