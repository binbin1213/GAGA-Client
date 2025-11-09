import { useState, useEffect } from 'react';
import { readHistory, deleteDownloadRecord, clearHistory } from '../utils/history';
import type { DownloadRecord } from '../types/history';

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
      <div style={{ maxWidth: 800, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 0 18px #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>下载历史</h2>
        <div>
          <button onClick={onBack} style={{ marginRight: 8 }}>返回</button>
          {records.length > 0 && (
            <button onClick={handleClearAll} style={{ color: 'red' }}>清空全部</button>
          )}
        </div>
      </div>

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
  );
}
