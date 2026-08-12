# ProgressView Theme Records + Compact List UI

## 本轮收敛

### 1. 记录归属改为主题
- 删除目标级 `recentRecords`。
- `ProgressViewModel` 为每个主题建立 `themeRecentRecords`。
- `ProgressSkillRowModel` 直接携带该主题自己的最近记录。
- 目标只负责总进度、等级和 Block 构成。
- 点击主题行后才展开该主题记录，再点击收起。

### 2. 小屏优先保持单行
- 目标行保持：展开符 / 图标 / 目标 / Lv / 总进度。
- 主题行保持：主题 / Lv / 进度 / XP+记录数 / 展开符。
- 窄屏先压缩 icon、gap、font 和低优先级等级称号，不主动把核心字段拆成多行。
- 主题记录使用紧凑子列表，不创建卡片墙。

### 3. 不建立新的视图系统
- 继续使用现有 `ProgressView`。
- 不新增 ViewName。
- 不新增内部时间周期、筛选器或页面头。
- 继续复用外部视图控制和 `onOpenRecord` 接口。

## 主要文件
- `src/features/views/runtime/ProgressViewModel.ts`
- `src/features/views/runtime/ProgressGoalCard.tsx`
- `src/styles/features/progress.css`
- `test/unit/progressViewModel.test.ts`

## 已执行架构验证
- architecture gate: PASS
- product gate: PASS
- records gate: PASS
- task-session gate: PASS
- energy gate: PASS
- ui-runtime gate: PASS
- quality gate: PASS
- stability gate: PASS

完整 Jest / TypeScript 仍需要在带完整 npm dependencies 的本地环境执行。
