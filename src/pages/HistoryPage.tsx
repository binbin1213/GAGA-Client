import { useState, useEffect } from 'react';
import { readHistory, deleteDownloadRecord, clearHistory } from '../utils/history';
import type { DownloadRecord } from '../types/history';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface Props {
  onBack: () => void;
}

export default function HistoryPage({ onBack }: Props) {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await readHistory();
      setRecords(history);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      try {
        await deleteDownloadRecord(id);
        await loadHistory(); // 重新加载
      } catch (error) {
        alert('删除失败');
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      try {
        await clearHistory();
        setRecords([]);
      } catch (error) {
        alert('清空失败');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'downloading': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'downloading': return '下载中';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#606060', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '14px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部窗口控制栏 */}
      <div 
        data-tauri-drag-region
        style={{ padding: '0', height: '36px', background: '#ffffff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1px' }}>
          <button onClick={() => getCurrentWindow().minimize()} style={{ width: '36px', height: '36px', background: 'transparent', color: '#606060', border: 'none', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
          <button onClick={async () => { const window = getCurrentWindow(); if (await window.isMaximized()) { await window.unmaximize(); } else { await window.maximize(); } }} style={{ width: '36px', height: '36px', background: 'transparent', color: '#606060', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>□</button>
          <button onClick={() => getCurrentWindow().hide()} style={{ width: '36px', height: '36px', background: 'transparent', color: '#606060', border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
        </div>
      </div>

      {/* 标题和按钮 */}
      <div style={{ background: 'transparent', padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>下载历史</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onBack} style={{ padding: '8px 16px', background: '#ffffff', color: '#333333', border: '1px solid #d0d0d0', fontSize: '13px', fontFamily: 'system-ui, -apple-system, sans-serif', cursor: 'pointer' }}>返回</button>
          {records.length > 0 && (
            <button onClick={handleClearAll} style={{ padding: '8px 16px', background: '#ffffff', color: '#dc2626', border: '1px solid #fecaca', fontSize: '13px', fontFamily: 'system-ui, -apple-system, sans-serif', cursor: 'pointer' }}>清空全部</button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

      {records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          暂无下载记录
        </div>
      ) : (
        <div>
          {records.map((record) => (
            <div
              key={record.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: 16,
                marginBottom: 12,
                backgroundColor: '#fafafa'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{record.title || '未知标题'}</div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: 4 }}>
                    状态: <span style={{ color: getStatusColor(record.status) }}>
                      {getStatusText(record.status)}
                    </span>
                  </div>
                  {record.progress !== undefined && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: 4 }}>
                      进度: {record.progress}%
                    </div>
                  )}
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: 4 }}>
                    创建时间: {formatDate(record.createdAt)}
                  </div>
                  {record.completedAt && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: 4 }}>
                      完成时间: {formatDate(record.completedAt)}
                    </div>
                  )}
                  {record.errorMessage && (
                    <div style={{ fontSize: '14px', color: 'red', marginBottom: 4 }}>
                      错误: {record.errorMessage}
                    </div>
                  )}
                  {record.files && record.files.length > 0 && (
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      文件: {record.files.length} 个
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(record.id)}
                  style={{ color: 'red', border: '1px solid red', padding: '4px 8px' }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
