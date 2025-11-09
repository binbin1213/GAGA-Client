import { useState, useEffect } from 'react';
import { auth } from '../api';
import type { AuthRequest, AuthResponse } from '../types/api';
import { saveAuthState } from '../utils/auth';
import { getDeviceId } from '../utils/deviceId';

interface Props {
  onAuthed?: (deviceId: string, license: string) => void;
  deviceId?: string;
}

export default function AuthPage({ onAuthed, deviceId: initialDeviceId }: Props) {
  const [deviceId, setDeviceId] = useState('正在获取设备码...');
  const [licenseCode, setLicenseCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // 获取设备码
  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const id = await getDeviceId();
        setDeviceId(id);
      } catch (error) {
        console.error('获取设备码失败:', error);
        // 浏览器环境降级方案
        const fallbackId = `browser_${navigator.userAgent.length}_${Date.now().toString(36)}`;
        setDeviceId(fallbackId);
      }
    };

    if (!initialDeviceId) {
      fetchDeviceId();
    } else {
      setDeviceId(initialDeviceId);
    }
  }, [initialDeviceId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId);
    setMsg('已复制设备码');
    setTimeout(() => setMsg(''), 1500);
  };

  const handleAuth = async () => {
    if (!deviceId || !licenseCode) {
      setStatus('failed');
      setMsg('请输入设备码与授权码');
      return;
    }
    
    try {
      const result: AuthResponse = await auth({ device_id: deviceId, license_code: licenseCode } as AuthRequest);
      setStatus(result.status);
      setMsg(result.message || (result.status === 'ok' ? '授权成功' : '认证失败'));
      
      if (result.status === 'ok' && onAuthed) {
        // 保存授权状态到本地
        try {
          const authState = {
            deviceId,
            licenseCode,
            authorizedAt: new Date().toISOString(),
            expiresAt: result.expires_at, // 如果后端返回过期时间
            isValid: true
          };
          await saveAuthState(authState);
          console.log('授权状态已保存，下次启动无需重新授权');
        } catch (saveError) {
          console.error('保存授权状态失败:', saveError);
          // 不影响授权流程，继续执行
        }
        
        setTimeout(() => onAuthed(deviceId, licenseCode), 600);
      }
    } catch (e: any) {
      setStatus('failed');
      // 显示后端返回的具体错误信息
      const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || '认证异常，无法连接服务器';
      setMsg(errorMsg);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 0 18px #eee' }}>
      <h2 style={{ textAlign: 'center' }}>设备授权</h2>
      
      <div style={{ marginBottom: 16 }}>
        <div>设备码：</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ wordBreak: 'break-word', flex: 1 }}>{deviceId}</span>
          <button onClick={handleCopy} style={{ marginLeft: 8 }}>复制</button>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div>授权码：</div>
        <input type="text" value={licenseCode} onChange={e => setLicenseCode(e.target.value)} style={{ width: '100%', padding: 8 }} />
      </div>
      <button onClick={handleAuth} style={{ width: '100%', padding: 10, marginBottom: 16 }}>提交授权</button>
      {msg && <div style={{ color: status === 'ok' ? 'green' : 'red', textAlign: 'center' }}>{msg}</div>}
      {status === 'ok' && <div style={{ color: 'green', textAlign: 'center', marginTop: 6 }}>已授权，可正常使用所有功能</div>}
    </div>
  );
}
