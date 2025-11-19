// 应用配置
export const config = {
  // 后端 API 地址
  // 可以通过 VITE_API_URL 环境变量配置
    apiBaseURL: import.meta.env.VITE_API_URL || 'https://gaga.binbino.cn:88',
  
  // 请求超时时间（毫秒）
  timeout: 10000,
};
