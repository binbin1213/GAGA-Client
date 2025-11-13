# GAGA Client 无障碍支持指南

## 📋 无障碍属性规范

### 按钮 (Button)

```tsx
<button
  aria-label="描述按钮的作用"
  aria-pressed={isPressed}
  aria-disabled={isDisabled}
  title="鼠标悬停提示"
>
  按钮文本
</button>
```

**常见场景**:
- 主按钮: `aria-label="开始下载"`
- 关闭按钮: `aria-label="关闭对话框"`
- 图标按钮: `aria-label="打开菜单"`

---

### 表单控件

```tsx
<input
  id="download-path"
  aria-label="下载目录"
  aria-describedby="download-path-hint"
  aria-required="true"
  aria-invalid={hasError}
/>
<span id="download-path-hint">选择保存视频的目录</span>
```

---

### 导航

```tsx
<nav aria-label="主导航">
  <button aria-current="page">当前页面</button>
  <button>其他页面</button>
</nav>
```

---

### 加载状态

```tsx
<div
  role="status"
  aria-live="polite"
  aria-busy={isLoading}
>
  正在加载...
</div>
```

---

### 错误提示

```tsx
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  发生错误：{errorMessage}
</div>
```

---

### 进度条

```tsx
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="下载进度"
>
  {progress}%
</div>
```

---

## 🎯 实施清单

### 高优先级
- [ ] 为所有按钮添加 `aria-label`
- [ ] 为表单输入添加 `aria-label` 和 `aria-describedby`
- [ ] 为错误提示添加 `role="alert"`
- [ ] 为加载状态添加 `aria-busy`

### 中优先级
- [ ] 添加键盘导航支持
- [ ] 改进焦点管理
- [ ] 添加 `aria-current` 到活跃导航项
- [ ] 测试屏幕阅读器兼容性

### 低优先级
- [ ] 添加 ARIA 标记到复杂组件
- [ ] 改进颜色对比度
- [ ] 添加文本大小调整支持

---

## 📱 键盘导航

### 标准快捷键
- `Tab` - 在可交互元素间导航
- `Shift + Tab` - 反向导航
- `Enter` - 激活按钮
- `Space` - 激活按钮或复选框
- `Escape` - 关闭对话框

### 实施建议

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    onClose();
  }
  if (e.key === 'Enter' && e.ctrlKey) {
    onSubmit();
  }
};
```

---

## 🎨 视觉无障碍

### 颜色对比度
- 正常文本: 最小 4.5:1
- 大文本: 最小 3:1
- 图形元素: 最小 3:1

### 焦点指示器
```css
button:focus-visible {
  outline: 2px solid #007AFF;
  outline-offset: 2px;
}
```

### 文本大小
- 最小字体: 12px
- 可缩放: 最小 200%

---

## ✅ 测试方法

### 屏幕阅读器测试
1. 使用 NVDA (Windows) 或 VoiceOver (macOS)
2. 测试所有交互元素
3. 验证标签和描述

### 键盘导航测试
1. 禁用鼠标
2. 使用 Tab 键导航
3. 验证焦点顺序
4. 测试快捷键

### 自动化测试
```bash
npm install --save-dev axe-core
npm install --save-dev @axe-core/react
```

---

## 📚 参考资源

- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA 创作实践](https://www.w3.org/WAI/ARIA/apg/)
- [MDN 无障碍](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

**更新日期**: 2025-11-13  
**状态**: 进行中
