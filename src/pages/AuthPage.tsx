import { useState } from 'react';
import { auth } from '../api';
import type { AuthRequest, AuthResponse } from '../types/api';

interface Props {
  onAuthed?: (deviceId: string, license: string) => void;
  deviceId?: string;
}

export default function AuthPage({ onAuthed, deviceId: initialDeviceId = 'test123' }: Props) {
  const [deviceId] = useState(initialDeviceId); // 可升级为 useEffect 处理动态获取
  const [licenseCode, setLicenseCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

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
        setTimeout(() => onAuthed(deviceId, licenseCode), 600);
      }
    } catch (e: any) {
      setStatus('failed');
      // 显示后端返回的具体错误信息
      const errorMsg = e?.response?.data?.message || e?.message || '认证异常，无法连接服务器';
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
