# GAGA Client

一个基于 Tauri 的桌面视频下载客户端，支持 DRM 加密视频的下载和解密。

## 功能特性

- 🔐 **设备授权管理** - 基于设备 ID 的授权验证系统
- 🎬 **DRM 视频下载** - 支持 DASH/HLS 加密视频的下载和解密
- 🔑 **自动密钥获取** - 自动从服务器获取解密密钥
- 📦 **多窗口架构** - 主窗口、历史记录、设置、授权等独立窗口
- 🎨 **Downie 风格 UI** - 玻璃态效果的现代化界面设计
- 📝 **下载历史** - 自动记录下载历史和状态
- 🌐 **系统托盘** - 最小化到系统托盘，后台运行

## 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tauri 2.x** - 桌面应用框架

### 后端
- **Rust** - Tauri 后端
- **N_m3u8DL-RE** - 视频下载工具
- **FFmpeg** - 视频处理和合并
- **mp4decrypt** - DRM 解密工具

### API 服务
- **FastAPI** - Python 后端 API
- **SQLModel** - 数据库 ORM
- **Widevine** - DRM 密钥获取

## 项目结构

```
GAGA-Client/
├── src/                      # 前端源代码
│   ├── api/                  # API 接口
│   ├── components/           # React 组件
│   ├── pages/                # 页面组件
│   ├── styles/               # 样式文件
│   ├── types/                # TypeScript 类型定义
│   └── utils/                # 工具函数
├── src-tauri/                # Tauri 后端
│   ├── src/                  # Rust 源代码
│   ├── capabilities/         # 权限配置
│   └── icons/                # 应用图标
├── bin/                      # 二进制工具
│   ├── N_m3u8DL-RE          # 下载工具
│   ├── ffmpeg               # 视频处理
│   └── mp4decrypt           # 解密工具
└── public/                   # 静态资源
```

## 开发环境要求

- **Node.js** >= 18.0.0
- **Rust** >= 1.70.0
- **pnpm/npm** - 包管理器
- **macOS/Windows/Linux** - 支持的操作系统

## 安装和运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd GAGA-Client
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
VITE_API_URL=https://gaga.binbino.cn:88
```

### 4. 开发模式运行

```bash
npm run tauri dev
```

### 5. 构建生产版本

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`

## 使用说明

### 1. 首次启动

首次启动应用时，会自动生成设备 ID 并保存到本地。

### 2. 设备授权

1. 点击主界面的"立即授权"按钮
2. 复制设备 ID
3. 输入授权码
4. 点击"验证授权"

### 3. 下载视频

1. 从浏览器插件获取视频信息（JSON 格式）
2. 粘贴到主界面的拖放区域
3. 应用会自动：
   - 解析视频信息
   - 获取解密密钥
   - 下载视频分片
   - 解密并合并视频
4. 下载完成后可在历史记录中查看

### JSON 格式示例

```json
{
  "Title": "视频标题",
  "MPD": "https://example.com/video.mpd",
  "PSSH": "AAAAQ3Bzc2g...",
  "LicenseURL": "https://license.example.com/...",
  "捕获时间": "2025/11/10 18:55:21"
}
```

## 配置说明

### API 配置

编辑 `src/config.ts`：

```typescript
export const config = {
  apiBaseURL: 'https://your-api-server.com',
  timeout: 10000,
};
```

### 下载配置

在设置页面中可以配置：
- 默认下载目录
- 下载线程数（默认 16）
- 其他下载选项

## 开发指南

### 添加新的 API 接口

1. 在 `src/types/api.d.ts` 中定义类型
2. 在 `src/api/index.ts` 中实现接口
3. 在组件中调用

### 添加新的页面

1. 在 `src/pages/` 中创建页面组件
2. 在 `src/utils/windowManager.ts` 中注册窗口
3. 在 `src-tauri/tauri.conf.json` 中配置窗口

### 添加新的 Rust 命令

1. 在 `src-tauri/src/lib.rs` 中定义命令
2. 在 `invoke_handler` 中注册
3. 在前端使用 `invoke()` 调用

## 常见问题

### Q: 下载失败，提示"获取密钥失败"

**A:** 检查以下几点：
1. 确保已经授权
2. 检查网络连接
3. 确认 API 服务器正常运行
4. 查看控制台日志获取详细错误信息

### Q: 下载的视频无法播放

**A:** 可能的原因：
1. 解密密钥不正确
2. 视频合并失败
3. FFmpeg 未正确安装

### Q: 应用启动后无法获取设备 ID

**A:** 检查文件系统权限：
1. 确保应用有读写权限
2. 检查 `~/Library/Application Support/com.gaga.client/` 目录
3. 查看日志文件获取详细信息

## 依赖工具

### N_m3u8DL-RE

用于下载 DASH/HLS 视频流。

- 版本：20251029
- 文档：https://github.com/nilaoda/N_m3u8DL-RE

### FFmpeg

用于视频处理和合并。

- 版本：8.0
- 文档：https://ffmpeg.org/

### mp4decrypt

用于 DRM 视频解密。

- 来源：Bento4 工具集
- 文档：https://www.bento4.com/

## 许可证

本项目仅供学习和研究使用。

## 贡献

欢迎提交 Issue 和 Pull Request。

## 更新日志

### v1.0.0 (2025-11-10)

- ✅ 实现设备授权系统
- ✅ 实现 DRM 视频下载
- ✅ 实现自动密钥获取
- ✅ 实现多窗口架构
- ✅ 实现 Downie 风格 UI
- ✅ 实现下载历史记录
- ✅ 实现系统托盘功能

## 联系方式

如有问题或建议，请通过以下方式联系：

- Issue: [GitHub Issues](https://github.com/your-repo/issues)
- Email: your-email@example.com

---

**注意：** 本软件仅供学习和研究使用，请勿用于非法用途。下载受版权保护的内容前，请确保您有合法的访问权限。
