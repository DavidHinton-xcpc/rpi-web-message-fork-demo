# rpi-web message-level fork placement demo

这是一个基于当前 `rpi-web` 前端一比一复制的静态交互 demo，用于演示以下 UI 设想：

- 从顶部工具栏移除 fork 按钮。
- 将 fork 放到每条模型回复下方，与复制、朗读并列。
- 删除复制、朗读按钮的文字说明，三个按钮只保留图标。
- 从左到右顺序固定为：`复制 → fork → 朗读`。

 demo 是纯静态页，浏览器内 mock 了 rpi-web API 和会话数据，不连接真实 native host。

## Local build

```bash
npm ci
npm run build
python -m http.server 4173 --directory dist
```

打开 <http://127.0.0.1:4173/>。

## Implementation notes

- UI 源码来自 `rpi-package/packages/rpi-web/frontend`，除以下位置外保持原样：
  - `src/App.tsx`：工具栏 fork 移除；`MessageRow` 增加 `onFork`；回复下方三个按钮改为纯图标。
  - `src/styles.css`：新增 `.message-action-icon` 图标按钮样式。
  - `src/staticDemo.ts`：静态 API mock。
- `vite.config.ts` 使用 `base: "./"`，适配 GitHub Pages 子路径部署。
- `.github/workflows/deploy.yml` 负责构建并部署 `dist/` 到 GitHub Pages。
