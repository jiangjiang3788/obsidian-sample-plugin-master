# EventTimeline 连续主轴修复 · 2026-08-12

本包包含此前 Progress/成长视图最终列表化修改，并新增 EventTimeline 连续主轴修复。

## EventTimeline 修改
- 每个事件行不再通过外边距制造断点。
- 时间线中轴由每行 `et-line` 撑满完整行高，前后事件零 gap 衔接。
- 首条事件主轴从圆点向下延伸。
- 末条事件主轴从上方延伸到圆点。
- 单条事件只保留圆点，不向上下多画无意义线段。
- hover 只改变圆点/卡片视觉，不改变线轴几何位置，不再出现“鼠标一放上线也在动”的错觉。
- 日期/时间继续使用现有 EventTimeline 数据与布局接口，没有新增时间系统或新的 ViewType。

## 验证
已执行 `npm run gate`：
- product PASS
- architecture PASS
- records PASS
- task-session PASS
- energy PASS
- ui-runtime PASS
- quality PASS
- stability PASS
