import { useState, useEffect } from 'react';
import { auth } from '../api';
import type { AuthRequest, AuthResponse } from '../types/api';
import { saveAuthState } from '../utils/auth';
import { getDeviceId } from '../utils/deviceId';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface Props {
  onAuthed?: (deviceId: string, license: string) => void;
  deviceId?: string;
  onBack?: () => void;
}

export default function AuthPage({ onAuthed, deviceId: initialDeviceId, onBack }: Props) {
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
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* 顶部窗口控制栏 */}
      <div 
        data-tauri-drag-region
        style={{
          background: '#ffffff',
          padding: '0',
          height: '36px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
        <div style={{ display: 'flex', gap: '1px' }}>
          <button
            onClick={() => getCurrentWindow().minimize()}
            style={{
              width: '36px',
              height: '36px',
              background: 'transparent',
              color: '#606060',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            −
          </button>
          <button
            onClick={async () => {
              const window = getCurrentWindow();
              if (await window.isMaximized()) {
                await window.unmaximize();
              } else {
                await window.maximize();
              }
            }}
            style={{
              width: '36px',
              height: '36px',
              background: 'transparent',
              color: '#606060',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            □
          </button>
          <button
            onClick={() => getCurrentWindow().hide()}
            style={{
              width: '36px',
              height: '36px',
              background: 'transparent',
              color: '#606060',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* 授权表单区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
        width: '480px',
        maxWidth: '100%',
        background: '#ffffff',
        padding: '40px',
        border: '1px solid #e0e0e0',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        {/* 返回按钮 */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              padding: '8px 16px',
              background: '#ffffff',
              color: '#333333',
              border: '1px solid #d0d0d0',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              cursor: 'pointer'
            }}
          >
            ← 返回
          </button>
        )}

        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 8px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.5px'
          }}>
            设备授权
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#666666',
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            请输入授权码以激活应用
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#333333',
            marginBottom: '10px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            设备码
          </label>
          <div style={{
            padding: '14px 16px',
            border: '1px solid #e0e0e0',
            backgroundColor: '#f9f9f9',
            fontSize: '13px',
            fontFamily: 'Consolas, Monaco, monospace',
            wordBreak: 'break-all',
            color: '#333333',
            lineHeight: '1.6',
            marginBottom: '12px'
          }}>
            {deviceId}
          </div>
          <button
            onClick={handleCopy}
            style={{
              width: '100%',
              padding: '11px',
              backgroundColor: '#f5f5f5',
              color: '#333333',
              border: '1px solid #d0d0d0',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            复制设备码
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#333333',
            marginBottom: '10px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            授权码
          </label>
          <input
            type="password"
            value={licenseCode}
            onChange={e => setLicenseCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid #d0d0d0',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              backgroundColor: '#ffffff',
              color: '#1a1a1a',
              boxSizing: 'border-box',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#0066ff'}
            onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
            placeholder="请输入授权码"
          />
        </div>

        <button
          onClick={handleAuth}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#0066ff',
            color: '#ffffff',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginBottom: '20px'
          }}
        >
          提交授权
        </button>

        {/* 状态消息 */}
        {msg && (
          <div style={{
            padding: '14px 16px',
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: status === 'ok' ? '#f0fdf4' : '#fef2f2',
            color: status === 'ok' ? '#166534' : '#dc2626',
            border: `1px solid ${status === 'ok' ? '#bbf7d0' : '#fecaca'}`,
            textAlign: 'center'
          }}>
            {status === 'ok' ? '✓ ' : '✗ '}{msg}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
