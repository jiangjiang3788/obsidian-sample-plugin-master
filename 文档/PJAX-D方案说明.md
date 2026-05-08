# D 方案：PJAX 局部加载版说明

本版本只改公共资源，不批量重写 100+ 个 HTML 页面。

## 改动文件

- `_资源/文档脚本.js`
  - 接管站内 `.html` 链接点击。
  - 用 `fetch + DOMParser` 读取目标页面。
  - 只替换右侧 `.main` 正文区域。
  - 左侧 `.sidebar` 不刷新、不回到顶部。
  - 使用 History API 保留浏览器前进/后退。
  - fetch 失败时自动回退为普通整页跳转。

- `_资源/文档样式.css`
  - 给右侧正文增加 100ms 级别轻微淡入/淡出。
  - 尊重 `prefers-reduced-motion: reduce`。

## 重要使用方式

PJAX 依赖浏览器允许 `fetch` 读取本地 HTML。建议不要直接双击 `index.html`，而是在文档根目录启动一个本地静态服务器：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://localhost:8000/index.html
```

如果直接用 `file://` 打开，部分浏览器会禁止读取本地 HTML 文件。此时脚本会自动回退为普通页面跳转，但左侧目录不刷新的效果不会完整生效。
