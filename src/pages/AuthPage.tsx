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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '40px',
        boxSizing: 'border-box'
      }}>
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '600',
            color: '#1f2937',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            设备授权
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            请输入您的设备码和授权码以激活应用
          </p>
        </div>

        {/* 设备码区域 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            设备码
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              fontSize: '14px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              color: '#4b5563',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {deviceId}
            </div>
            <button
              onClick={handleCopy}
              style={{
                padding: '12px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                minWidth: '80px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              复制
            </button>
          </div>
        </div>

        {/* 授权码区域 */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            授权码
          </label>
          <input
            type="text"
            value={licenseCode}
            onChange={e => setLicenseCode(e.target.value)}
            placeholder="请输入您的授权码"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          />
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleAuth}
          style={{
            width: '100%',
            padding: '14px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            marginBottom: '20px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          提交授权
        </button>

        {/* 状态消息 */}
        {msg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: status === 'ok' ? '#f0fdf4' : '#fef2f2',
            color: status === 'ok' ? '#166534' : '#dc2626',
            border: `1px solid ${status === 'ok' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {msg}
          </div>
        )}

        {/* 成功状态 */}
        {status === 'ok' && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1e40af',
              fontSize: '14px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              已授权，可正常使用所有功能
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
