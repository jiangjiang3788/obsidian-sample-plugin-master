# Think OS Freeform Layout V2

本增量包必须在 V1 增量包之后覆盖到项目根目录。本版不删除任何文件。

## 本版完成内容

1. 自由布局卡片右下角缩放手柄。
2. 缩放期间只更新内存预览，松手时只提交一次 placement。
3. 使用 Pointer Capture，指针移出卡片后仍能稳定完成缩放。
4. 拖动和缩放提交后保留乐观位置，避免 Store 持久化返回前卡片短暂弹回。
5. 拖动或缩放到画布底部时，画布高度实时扩展。
6. 宽度不能越过画布右边界；宽高不能小于配置的最小尺寸。
7. 网格吸附同时作用于位置和缩放后的宽高。
8. 用户缩到最小尺寸时保留精确最小值，不因网格取整而产生隐性最小值。
9. 新增不同视图类型的首次推荐尺寸：
   - Excel / Table / Timeline 等信息密集视图默认更宽更高；
   - Statistics / Progress / Heatmap 使用更紧凑的推荐尺寸；
   - 已保存的 placement 永远优先，不会覆盖用户尺寸。
10. 修复 V1 在不同默认宽高卡片混排时可能产生的重叠：改为按行顺序打包。
11. 画布增加最小宽度配置。面板较窄时横向滚动，避免视图内容被强行压坏。
12. 设置页新增最小卡片宽度、最小卡片高度、画布最小宽度。
13. 固定尺寸卡片内部继续使用独立滚动区域，表格、时间线等内容不会撑破布局。
14. 缩放时显示实时宽高提示。

## 覆盖方式

1. 先确保已经应用 V1。
2. 备份当前项目。
3. 将本压缩包解压到项目根目录。
4. 保留压缩包目录结构，覆盖同名文件。
5. 不需要删除任何文件。

## 验收步骤

1. 打开一个自由布局并进入“编辑自由布局”。
2. 拖动卡片右下角手柄，确认宽高实时变化并显示尺寸。
3. 缩小到最小尺寸，确认不会继续缩小。
4. 向右放大，确认不会越过画布右边界。
5. 向下放大或拖动，确认画布高度随之增长。
6. 松手后重新加载插件，确认尺寸保持。
7. 连续缩放时确认 data.json 不会在每次 pointermove 时写入，只在结束时提交。
8. 新建或重置自由布局，确认 Excel/Table 等视图获得较大推荐尺寸，卡片之间不重叠。
9. 缩窄 Obsidian 面板，确认画布出现横向滚动，卡片内部没有被挤坏。

## 验证结果

- Vite production build：通过，1516 modules transformed。
- 自由布局模型单元测试：9/9 通过。
- public API gate：通过。
- core public gate：通过。
- architecture gate：通过。
- settings persistence gate：通过。
- data store boundary gate：通过。
- feature boundary gate：通过。
- performance boundary gate：通过。
- ZIP 完整性检查：生成后执行。

## 原项目现有验证限制

项目自身完整 TypeScript 检查仍有多个与自由布局无关的基线错误，例如 QuickInput、AI parser、Goal overview 和部分旧 MUI 回调的类型问题。本次修改涉及的 FreeformCanvas、FreeformLayoutItem、freeformLayout 模型、LayoutRenderer 和新增 schema 字段未出现在新增错误列表中。

原项目直接 npm install 还会解析到不存在的 webdriverio@9.29.1。本次使用隔离的最小依赖环境完成构建和测试，没有修改 package.json 或 package-lock.json。

## 下一版（V3）建议范围

- 卡片锁定与解锁；
- 点击置顶和 zIndex 持久化；
- 更明确的添加/移除视图体验；
- 默认布局模板；
- 窄屏与移动端只读降级；
- 编辑态选中反馈和操作菜单。
