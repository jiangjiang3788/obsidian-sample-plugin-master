# CSS V1 兼容性 Spike

## 结论

目标 Obsidian 桌面运行环境基于现代 Electron/Chromium，V1 使用的以下能力均有安全降级：

| 能力 | V1 用途 | 降级策略 |
|---|---|---|
| Cascade Layers | 固定新设计系统内部优先级 | 旧 CSS 暂时保持无 Layer，因此旧页面优先级不变 |
| CSS Custom Properties | Semantic Token 与动态值桥接 | Obsidian 本身已大量使用变量；Token 均带宿主 fallback |
| `:where()` | 降低 Foundation selector specificity | 不支持时仅基础 reset/focus 缺失，不影响内容渲染 |
| `:focus-visible` | 键盘焦点 | 宿主浏览器不支持时保留原生 focus 行为 |
| `prefers-reduced-motion` | 减少动画 | 不支持时维持原动画，不阻断功能 |
| `forced-colors` | 高对比焦点 | 非 Windows 高对比环境不会触发 |

## V1 特别决策

没有把旧 CSS 立即导入 Cascade Layer。原因是 Layered CSS 的优先级低于无 Layer 样式，若第一版整体包层，可能改变旧 CSS 与 MUI/Obsidian Runtime CSS 的关系。V1 只让新 Token/Foundation 分层，业务 CSS 在 V2–V4 逐模块迁移。

## 后续验证

V2 MUI Theme Bridge 引入 CSS variables 时，需要在 Style Catalog 中并排验证：

- 默认浅色；
- 默认深色；
- 第三方高对比主题；
- Settings Tab；
- Workspace Settings View；
- Obsidian native Modal；
- Preact shared Modal。
