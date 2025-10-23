# Think OS 插件优化执行计划

## 📌 用户优先级排序

1. 🔴 **修复打卡功能显示问题**（最高优先级）
2. 🔴 **统一Hooks系统**（基础设施）
3. 🔴 **移除MUI，使用自定义UI组件**（去依赖）
4. 🟡 **清理无用代码和文档**（质量提升）
5. 🟡 **功能验证与测试**（质量保障）

---

## 🎯 第一阶段：紧急修复（1天）

### 任务 1.1：修复打卡功能显示问题 ✅ 
**问题分析**：
- TimelineView 组件不响应 DataStore 的数据更新
- 添加新打卡后，UI 没有自动刷新
- 已在代码中看到修复注释 `[核心修改]`

**已完成的修复**：
```typescript
// src/features/dashboard/ui/TimelineView.tsx
// 1. 使用 useState 存储 dataStore 的 items
const [allItems, setAllItems] = useState(() => dataStore?.queryItems() || []);

// 2. 订阅 dataStore 的变化
useEffect(() => {
    if (!dataStore) return;
    const listener = () => {
        setAllItems(dataStore.queryItems());
    };
    dataStore.subscribe(listener);
    return () => dataStore.unsubscribe(listener);
}, []);
```

**验证方法**：
1. 打开 Dashboard 视图（Timeline）
2. 点击某个时间槽位添加打卡
3. 检查是否立即显示新添加的打卡记录
4. 在其他地方修改打卡，检查 Timeline 是否自动更新

**预计时间**：已完成
**状态**：✅ 代码中已有修复

---

### 任务 1.2：检查其他视图的响应式问题
**文件**：
- `src/features/dashboard/ui/TableView.tsx`
- `src/features/dashboard/ui/StatisticsView.tsx`
- `src/features/dashboard/ui/HeatmapView.tsx`
- `src/features/dashboard/ui/ExcelView.tsx`

**检查清单**：
- [ ] 检查每个视图是否订阅了 dataStore
- [ ] 确保使用 `useStore` 或手动订阅机制
- [ ] 统一响应式数据流

**预计时间**：2小时

---

## 🏗️ 第二阶段：统一Hooks系统（2天）

### 任务 2.1：整合现有Hooks ✅
**当前状态**：
- ✅ 已创建 `src/shared/hooks/index.ts`
- ✅ 包含 15+ 常用 Hooks
- ✅ 完整的 TypeScript 类型和文档

**待办**：
- [ ] 审查所有 Feature 中的自定义 Hooks
- [ ] 迁移重复的 Hooks 到 shared
- [ ] 删除本地重复定义

**文件检查清单**：
```
src/features/dashboard/hooks/ ← 检查是否有重复
src/features/timer/hooks/ ← 检查是否有重复
src/features/settings/hooks/ ← 检查是否有重复
```

**预计时间**：4小时

---

### 任务 2.2：创建 useDataStore Hook
**目标**：简化 DataStore 订阅模式

**实现**：
```typescript
// src/shared/hooks/useDataStore.ts
export function useDataStore<T>(
  selector: (items: Item[]) => T
): T {
  const [value, setValue] = useState(() => {
    const items = dataStore?.queryItems() || [];
    return selector(items);
  });

  useEffect(() => {
    if (!dataStore) return;
    
    const listener = () => {
      const items = dataStore.queryItems();
      setValue(selector(items));
    };
    
    dataStore.subscribe(listener);
    return () => dataStore.unsubscribe(listener);
  }, [selector]);

  return value;
}
```

**使用示例**：
```typescript
// 之前
const [allItems, setAllItems] = useState(() => dataStore?.queryItems() || []);
useEffect(() => {
  // 订阅逻辑...
}, []);

// 之后
const allItems = useDataStore(items => items);
```

**预计时间**：2小时

---

### 任务 2.3：统一所有视图使用新Hooks
**迁移清单**：
- [ ] TimelineView.tsx ← 使用 useDataStore
- [ ] TableView.tsx
- [ ] StatisticsView.tsx
- [ ] HeatmapView.tsx
- [ ] ExcelView.tsx
- [ ] TimerView.tsx ← 已使用 useStore，检查是否需要优化

**预计时间**：3小时

---

## 🎨 第三阶段：移除MUI依赖（3-4天）

### 任务 3.1：创建自定义UI组件库
**已完成** ✅：
- Button 组件（多种变体、大小、加载状态）
- Modal 组件（点击外部关闭、ESC关闭）
- LoadingSpinner 组件
- ErrorBoundary 组件

**需要新增**（按优先级）：
```typescript
// 1. 表单组件（高优先级）
- Input / TextInput
- Select / Dropdown
- Checkbox
- Switch / Toggle

// 2. 布局组件（高优先级）
- Box (代替 MUI Box)
- Stack (代替 MUI Stack)
- Paper (代替 MUI Paper)

// 3. 反馈组件（中优先级）
- Tooltip (代替 MUI Tooltip)
- Notice (已有 Obsidian Notice)

// 4. 数据展示（中优先级）
- Typography (文本样式)
- Icon 封装
```

**样式系统**：
```css
/* src/shared/styles/variables.css */
:root {
  /* 使用 Obsidian 的 CSS 变量 */
  --primary-color: var(--interactive-accent);
  --text-normal: var(--text-normal);
  --background-primary: var(--background-primary);
  /* ... */
}
```

**预计时间**：8小时

---

### 任务 3.2：逐步替换MUI组件
**替换策略**：从叶子组件向根组件替换

#### 步骤 1：TimerView.tsx 替换（示例）
```typescript
// 替换前
import { Box, Typography, Button, Paper, Stack, Tooltip } from '@mui/material';

// 替换后
import { Box, Typography, Button, Paper, Stack, Tooltip } from '@shared/components';
```

**组件映射表**：
| MUI 组件 | 自定义组件 | 状态 |
|---------|----------|------|
| Box | Box | 待创建 |
| Stack | Stack | 待创建 |
| Paper | Paper | 待创建 |
| Typography | Typography | 待创建 |
| Button | Button | ✅ 已有 |
| Tooltip | Tooltip | 待创建 |
| Modal | Modal | ✅ 已有 |

**文件清单**（按顺序替换）：
1. [ ] `src/features/timer/ui/TimerView.tsx`
2. [ ] `src/features/timer/ui/TimerRow.tsx`
3. [ ] `src/features/settings/ui/SettingsTab.tsx`
4. [ ] `src/features/dashboard/ui/*.tsx`（所有视图）

**预计时间**：12小时

---

### 任务 3.3：移除MUI依赖
**步骤**：
1. [ ] 确认所有文件不再导入 MUI
2. [ ] 运行全局搜索：`@mui/material`
3. [ ] 卸载依赖：`npm uninstall @mui/material @emotion/react @emotion/styled`
4. [ ] 测试构建：`npm run build`
5. [ ] 检查包体积变化

**预计时间**：2小时

---

## 🧹 第四阶段：清理无用代码和文档（2天）

### 任务 4.1：代码清理
**清理清单**：

#### 1. 未使用的导入
```bash
# 使用工具检测
npx ts-prune
```

#### 2. 注释掉的代码
```bash
# 全局搜索
# TODO
# FIXME
# NOTE
// ...
```

#### 3. 重复代码
**已识别的重复**：
- [ ] 文件操作逻辑（3处）
- [ ] 时间格式化（5处）
- [ ] 错误处理模式（多处）

**提取到**：
```
src/shared/utils/
  ├── fileOperations.ts  ← 统一文件操作
  ├── timeUtils.ts       ← 统一时间处理
  └── errorHandler.ts    ← ✅ 已有
```

**预计时间**：6小时

---

### 任务 4.2：文档整理
**文档清单**：

#### 更新现有文档
- [ ] `ARCHITECTURE.md` ← 反映新的Hooks和组件系统
- [ ] `DEVELOPMENT.md` ← 添加组件开发指南
- [ ] `API.md` ← 更新API文档
- [ ] `README.md` ← 更新功能列表

#### 新增文档
- [ ] `docs/COMPONENTS.md` ← 组件使用文档
- [ ] `docs/HOOKS.md` ← Hooks 使用文档
- [ ] `docs/TESTING.md` ← 测试指南
- [ ] `docs/MIGRATION.md` ← MUI迁移记录

#### 删除过时文档
- [ ] 检查 `docs/` 目录下过时文件

**预计时间**：4小时

---

## ✅ 第五阶段：功能验证与测试（2天）

### 任务 5.1：手动功能测试清单

#### 核心功能测试
```markdown
打卡功能：
- [ ] 添加新打卡
- [ ] 编辑现有打卡
- [ ] 删除打卡
- [ ] 打卡立即显示在Timeline
- [ ] 打卡立即显示在Table
- [ ] 跨天打卡正确分割

计时器功能：
- [ ] 启动新任务计时
- [ ] 暂停/恢复计时
- [ ] 完成并应用到任务
- [ ] 悬浮窗口拖动
- [ ] 悬浮窗口显示/隐藏

视图功能：
- [ ] Timeline视图正常渲染
- [ ] Table视图正常渲染
- [ ] Statistics视图正常渲染
- [ ] Heatmap视图正常渲染
- [ ] Excel视图正常渲染
- [ ] 视图切换流畅
- [ ] 数据过滤正常工作

设置功能：
- [ ] 主题设置正常
- [ ] 数据源配置正常
- [ ] 布局配置正常
- [ ] 设置持久化正常
```

**预计时间**：4小时

---

### 任务 5.2：自动化测试
**测试类型**：

#### 1. 组件测试
```typescript
// test/components/Button.test.ts
describe('Button Component', () => {
  it('renders correctly', () => {
    // ...
  });
  
  it('handles click events', () => {
    // ...
  });
});
```

#### 2. Hooks测试
```typescript
// test/hooks/useDataStore.test.ts
describe('useDataStore Hook', () => {
  it('subscribes to dataStore changes', () => {
    // ...
  });
});
```

#### 3. 集成测试
```typescript
// test/integration/timeline.test.ts
describe('Timeline Feature', () => {
  it('adds and displays new task', () => {
    // ...
  });
});
```

**预计时间**：8小时

---

### 任务 5.3：性能测试
**测试指标**：

```typescript
// 使用已有的性能监控工具
performanceMonitor.track('timeline.render', () => {
  // 渲染 Timeline
});

performanceMonitor.track('dataStore.scan', () => {
  // 数据扫描
});
```

**对比基准**：
- [ ] 启动时间
- [ ] 首次渲染时间
- [ ] 数据扫描时间
- [ ] 包体积大小

**预计时间**：2小时

---

## 📊 进度跟踪表

| 阶段 | 任务 | 优先级 | 预计时间 | 状态 | 完成日期 |
|-----|------|--------|---------|------|---------|
| 1 | 修复打卡功能 | 🔴 | 已完成 | ✅ | - |
| 1 | 检查其他视图 | 🔴 | 2h | ⏳ | - |
| 2 | 整合Hooks | 🔴 | 4h | ⏳ | - |
| 2 | 创建useDataStore | 🔴 | 2h | ⏳ | - |
| 2 | 迁移视图Hooks | 🔴 | 3h | ⏳ | - |
| 3 | 创建UI组件 | 🔴 | 8h | ⏳ | - |
| 3 | 替换MUI | 🔴 | 12h | ⏳ | - |
| 3 | 移除依赖 | 🔴 | 2h | ⏳ | - |
| 4 | 代码清理 | 🟡 | 6h | ⏳ | - |
| 4 | 文档整理 | 🟡 | 4h | ⏳ | - |
| 5 | 功能测试 | 🟡 | 4h | ⏳ | - |
| 5 | 自动化测试 | 🟡 | 8h | ⏳ | - |
| 5 | 性能测试 | 🟡 | 2h | ⏳ | - |

**总预计时间**：57小时（约7-8个工作日）

---

## 🎯 如何确保功能统一性

### 1. 功能对比检查表
在每个改动后，使用此检查表验证：

```markdown
## 功能完整性检查

### 打卡功能
- [ ] 添加打卡 - 改前 ✅ | 改后 ⬜
- [ ] 编辑打卡 - 改前 ✅ | 改后 ⬜
- [ ] 删除打卡 - 改前 ✅ | 改后 ⬜
- [ ] 实时更新 - 改前 ✅ | 改后 ⬜

### 计时器功能
- [ ] 启动计时 - 改前 ✅ | 改后 ⬜
- [ ] 暂停计时 - 改前 ✅ | 改后 ⬜
- [ ] 完成计时 - 改前 ✅ | 改后 ⬜

### 视图功能
- [ ] Timeline - 改前 ✅ | 改后 ⬜
- [ ] Table - 改前 ✅ | 改后 ⬜
- [ ] Statistics - 改前 ✅ | 改后 ⬜
- [ ] Heatmap - 改前 ✅ | 改后 ⬜
```

### 2. 视觉对比验证
**方法**：
1. 改动前截图保存到 `test/screenshots/before/`
2. 改动后截图保存到 `test/screenshots/after/`
3. 逐一对比UI是否一致

**检查点**：
- [ ] 颜色主题一致
- [ ] 布局间距一致
- [ ] 字体大小一致
- [ ] 交互反馈一致
- [ ] 动画效果一致

### 3. E2E测试录制
**工具**：使用浏览器录屏

**流程**：
1. 录制当前功能操作视频（改前）
2. 实施改动
3. 录制相同操作视频（改后）
4. 对比两个视频，确保行为一致

### 4. 数据兼容性测试
**测试数据集**：
```json
// test/fixtures/test-data.json
{
  "tasks": [...],
  "timers": [...],
  "settings": {...}
}
```

**验证**：
- [ ] 导入测试数据
- [ ] 运行所有功能
- [ ] 检查数据完整性
- [ ] 检查数据正确性

---

## 🚀 执行建议

### 每日工作流
```markdown
1. 选择一个任务
2. 创建功能分支：`git checkout -b feature/task-name`
3. 实施改动
4. 运行检查清单
5. 提交代码：`git commit -m "feat: description"`
6. 合并到主分支：`git merge feature/task-name`
7. 更新进度表
8. 继续下一个任务
```

### 风险控制
1. **每个改动都要测试**：不要积累太多改动再测试
2. **保持可回滚**：使用 Git 分支，随时可以回退
3. **增量发布**：完成一个阶段就可以发布一个版本
4. **备份数据**：测试前备份 `.obsidian/plugins/` 目录

### 优先级调整
如果时间紧张，可以调整为：
1. 🔴 第一阶段（必须）
2. 🔴 第二阶段任务2.2和2.3（必须）
3. 🔴 第三阶段（必须）
4. 🟡 第四阶段（推荐）
5. 🟡 第五阶段（推荐）

---

## 📈 预期收益

### 代码质量
- 代码量减少 20-30%
- 消除 MUI 依赖（减少包体积 ~200KB）
- 统一 Hooks 模式（减少重复代码）

### 性能提升
- 启动速度提升 15-20%（移除 MUI）
- 渲染性能提升 30-40%（优化响应式）
- 打包体积减少 25-30%

### 开发体验
- 自定义组件更易维护
- 统一的开发模式
- 完善的文档

---

## ❓ 常见问题

### Q1: 如何验证打卡功能修复？
**A**: 
1. 打开 Obsidian
2. 打开 Think 插件的 Dashboard
3. 切换到 Timeline 视图
4. 点击任意时间槽添加新打卡
5. 观察是否立即显示（无需刷新）

### Q2: 如何确保MUI替换后UI一致？
**A**:
1. 使用相同的 CSS 变量（Obsidian主题）
2. 保持相同的布局结构
3. 复用相同的样式类名
4. 截图对比验证

### Q3: 如果出现问题怎么办？
**A**:
1. 使用 Git 回退到上一个稳定版本
2. 检查浏览器控制台错误信息
3. 查看 Obsidian 开发者工具
4. 参考 `TROUBLESHOOTING.md`（待创建）

---

**准备好了吗？让我们从第一阶段任务1.2开始执行！**

*文档版本：1.0.0*  
*创建日期：2025年10月23日*  
*预计完成：2025年11月1日*
