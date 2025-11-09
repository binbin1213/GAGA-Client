# GAGA 视频下载器

基于 Tauri + React 的桌面应用，用于下载和处理 DRM 保护的视频内容。

## 功能特性

- 🎬 支持 MPD 格式视频下载
- 🔐 自动 DRM 解密（Widevine）
- 📝 自动烧录中文字幕
- 🎨 现代化 UI 界面
- 💻 跨平台支持（macOS、Windows）

## 系统要求

### 必需工具

应用依赖以下外部工具（已包含在 `bin` 目录中）：

- **N_m3u8DL-RE** - 视频下载工具
- **mp4decrypt** - 解密工具
- **ffmpeg** - 视频处理工具（需要系统安装）

### 系统安装 ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
下载 ffmpeg 并添加到系统 PATH

## 前置依赖

### 后端服务

本应用需要配合后端 API 服务使用：

1. 克隆或下载后端项目：`GAGA-Backend`
2. 启动后端服务（默认端口 8001）：
   ```bash
   cd GAGA-Backend
   ./run.sh
   ```

### 油猴脚本

需要在浏览器中安装油猴脚本来捕获 DRM 信息：

1. 安装 Tampermonkey 浏览器扩展
2. 安装 `GagaOOLala_v4_fixed.js` 脚本
3. 访问视频网站，脚本会自动捕获 DRM 数据

## 安装和运行

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或直接启动 Tauri 应用
npm run tauri dev
```

### 构建应用

```bash
# 构建生产版本
npm run build

# 构建 Tauri 应用
npm run tauri build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录。

## 使用流程

1. **启动后端服务**
   ```bash
   # 在后端项目目录
   ./run.sh
   ```

2. **启动桌面应用**
   ```bash
   npm run tauri dev
   ```

3. **获取 DRM 数据**
   - 在浏览器中打开视频网站
   - 油猴脚本会自动捕获 DRM 信息
   - 点击"复制数据"（选择 JSON 格式）

4. **下载视频**
   - 在桌面应用中粘贴 JSON 数据
   - 点击"开始下载"
   - 选择保存位置
   - 等待下载和处理完成

## 配置

### 修改后端地址

如果后端服务运行在其他地址，修改 `src/api/index.ts`：

```typescript
const baseURL = 'http://127.0.0.1:8001'; // 修改为你的后端地址
```

### 工具路径

应用会自动查找以下位置的工具：
1. `client/bin/` 目录（优先）
2. 系统 PATH

## 项目结构

```
client/
├── bin/                    # 内置工具
│   ├── N_m3u8DL-RE        # 下载工具
│   ├── mp4decrypt         # 解密工具
│   └── shaka-packager     # 打包工具
├── src/                   # 前端源代码
│   ├── api/              # API 接口
│   ├── pages/            # 页面组件
│   ├── types/            # TypeScript 类型
│   └── utils/            # 工具函数
├── src-tauri/            # Tauri 后端
│   └── src/
│       └── lib.rs        # Rust 命令处理
└── package.json
```

## 故障排除

### 工具未找到

确保 `bin` 目录中的工具有执行权限：

```bash
chmod +x bin/N_m3u8DL-RE
chmod +x bin/mp4decrypt
```

### 后端连接失败

1. 确认后端服务已启动
2. 检查端口 8001 是否被占用
3. 查看后端日志排查问题

### 下载失败

1. 检查网络连接
2. 确认 DRM 数据完整（MPD、PSSH、LicenseURL）
3. 查看应用日志

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **桌面框架**: Tauri 2.x
- **后端语言**: Rust
- **UI**: 原生 CSS

## 许可证

仅供学习和研究使用。
