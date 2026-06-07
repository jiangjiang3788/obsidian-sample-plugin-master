# ThinkOS 目标中心 P4 报告：GoalManager 拆分与诊断增强

## 本版定位

P4 不改创建/编辑保存主链，不扩新功能；重点是降低数据管理页的复杂度，继续把旧主题模板体系降级为 legacy，同时补充旧 override 影响诊断。

## 本版完成

1. **GoalManager 物理拆分**
   - `GoalManager.tsx` 现在只保留外壳、导航和摘要。
   - 目标实体、目标模板、目标指标、候选与诊断拆成独立子组件。

2. **新增子组件目录**
   - `src/features/settings/input/goalManager/GoalEntitySection.tsx`
   - `src/features/settings/input/goalManager/GoalTemplateSection.tsx`
   - `src/features/settings/input/goalManager/GoalMetricSection.tsx`
   - `src/features/settings/input/goalManager/GoalDiagnosticsSection.tsx`
   - `src/features/settings/input/goalManager/shared.tsx`

3. **旧主题模板影响诊断增强**
   - 在“目标中心 → 候选与诊断”中新增旧 `Block × Theme override` 诊断。
   - 展示旧 override 总量。
   - 按主题列出影响数量。
   - 按 Block 列出影响数量。
   - 明确标注：这些 override 只作为 legacy 数据保留，新模板主链不使用它们决定模板。

4. **ThemeMatrix 进一步 legacy/internal 化**
   - `src/features/settings/index.ts` 不再对外 re-export `ThemeMatrix`。
   - ThemeMatrix 文件仍保留，作为旧数据维护/兼容入口，不再作为设置模块公开入口。

5. **data.json 版本标记**
   - 增加 `goalCoreP4DataManagementVersion = 1`。

## 设计边界

- 快速输入继续只负责写记录。
- 数据管理负责目标、目标模板、主题元数据和诊断。
- 主题仍只作为元数据：路径、图标、启停、继承预览。
- 模板仍由 `Goal × Block` 决定。
- 旧 `ThemeOverride` 不删除，只诊断和 legacy 保留。

## 验证

当前容器已通过以下 gate：

- public-api-gate
- feature-gate
- arch-gate
- core-public-gate
- shared-public-gate
- src-console-gate
- shared-view-export-gate
- shared-view-legacy-forwarder-gate
- shared-internal-alias-gate
- mui-compat-migrated-gate
- di-gate
- settings-persistence-gate
- dual-system-gate
- obsidian-leak-gate
- events-boundary-gate
- core-obsidian-gate
- di-resolve-gate
- modal-promise-gate
- selector-giant-subscription-gate
- theme-tree-recursion-gate
- theme-matrix-legacy-import-gate
- iconaction-gate
- data-store-boundary-gate
- performance-boundary-gate
- timer-view-runtime-boundary-gate
- shared-self-alias-migrated-gate

完整 TypeScript typecheck / build 仍需本地安装依赖后执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 下一步建议

1. 继续拆 `ThemeMetadataManager`，把主题实体编辑、图标继承预览、legacy override 诊断拆开。
2. 给 `GoalDiagnosticsSection` 增加“建议迁移优先级”：优先迁移 override 数量最多的主题/Block。
3. 给 GoalManager 子组件补单元测试或轻量快照测试。
4. 继续清理 legacy export 和旧视图编辑入口。
