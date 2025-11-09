// 应用配置
export const config = {
  // 后端 API 地址
  // 如果后端运行在其他地址，修改这里即可
  apiBaseURL: import.meta.env.VITE_API_URL || 'https://gaga.binbino.cn:88',
  
  // 本地开发备用地址（如果需要）
  localAPI: 'http://localhost:3000',
};
