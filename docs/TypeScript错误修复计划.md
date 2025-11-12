# TypeScript 错误修复计划

> **创建日期**: 2025-10-25  
> **优先级**: P0 - 高优先级  
> **预计时长**: 3-5 天

---

## 📊 错误概览

**总错误数**: 1,661 个  
**影响文件**: 64 个  
**构建状态**: ✅ Vite 构建成功 | ⚠️ TypeScript 检查失败

### 错误分类（按优先级）

| 类别 | 错误数 | 优先级 | 预计工作量 |
|------|--------|--------|------------|
| DataSource 移除相关 | ~400 | P0 | 2-3天 |
| MUI + Preact 类型冲突 | ~150 | P2 | 1天（临时方案）<br>2周（永久方案） |
| 测试文件类型错误 | ~1,100 | P3 | 0.5天 |
| 其他小错误 | ~11 | P1 | 0.5天 |

---

## 🎯 Phase 1: 修复 DataSource 移除相关错误 (P0)

### 背景

DataSource 已从系统中移除，其功能整合到 ViewInstance 中。但代码中仍有大量引用。

### 影响范围

1. **类型定义** (1个文件)
   - `src/lib/types/domain/schema.ts` - 导出 DataSource 类型

2. **AppStore** (1个文件, 25个错误)
   - `src/store/AppStore.ts` - 所有 DataSource 相关操作

3. **Settings UI** (约10个文件, ~100个错误)
   - `src/views/Settings/ui/DataSourceSettings.tsx`
   - `src/views/Settings/ui/ViewInstanceSettings.tsx`
   - 其他 Settings 组件

4. **其他业务代码** (约50个文件, ~275个错误)
   - 各种引用 DataSource 的地方

### 修复策略

#### 策略 A: 完全移除 DataSource（推荐）

**优点**:
- 彻底解决问题
- 代码更清晰
- 符合新架构

**缺点**:
- 工作量大
- 需要全面测试

**执行步骤**:

1. **Day 1: 核心类型和 Store 修复**
   
   ```typescript
   // src/store/AppStore.ts
   
   // ❌ 移除所有 DataSource 相关方法
   // - addDataSource()
   // - updateDataSource()
   // - deleteDataSource()
   // - moveDataSource()
   // - duplicateDataSource()
   
   // ❌ 移除 DataSource 导入
   import type { ThinkSettings, DataSource, ... } from '...';
   // ↓
   import type { ThinkSettings, ... } from '...';
   
   // ❌ 移除 settings.dataSources 所有引用
   // 替换为使用 viewInstances
   ```

2. **Day 2: Settings UI 修复**
   
   ```typescript
   // src/views/Settings/ui/DataSourceSettings.tsx
   
   // ❌ 完全移除此文件（或重命名为 ViewDataSettings.tsx）
   
   // ✅ 在 ViewInstanceSettings.tsx 中整合数据源配置
   // ViewInstance 已包含 filters 和 sort 字段
   ```

3. **Day 3: 其他业务代码修复**
   
   - 搜索所有 `dataSources` 引用
   - 替换为 `viewInstances`
   - 更新相关逻辑

#### 策略 B: 保留 DataSource 类型定义（临时方案）

**优点**:
- 快速修复类型错误
- 暂时不破坏代码

**缺点**:
- 技术债务
- 未来仍需清理

**执行步骤**:

```typescript
// src/lib/types/domain/schema.ts

// 保留 DataSource 类型定义（标记为 deprecated）
/**
 * @deprecated DataSource 已移除，请使用 ViewInstance
 * 此类型仅为向后兼容保留
 */
export interface DataSource extends Groupable {
  id: string;
  name: string;
  filters: FilterRule[];
  sort: SortRule[];
  parentId: string | null;
}

// src/lib/types/domain/index.ts
export type { DataSource } from './schema';
```

### 推荐方案

**采用策略 A**，原因：
1. 符合架构演进方向
2. 减少技术债务
3. 虽然工作量大但一次性解决

---

## 🎯 Phase 2: 修复其他小错误 (P1)

### 2.1 VaultWatcher 事件类型错误

**文件**: `src/lib/logic/VaultWatcher.ts`

**错误**:
```typescript
// ❌ 错误的事件类型
vault.on('modify', this.handleFileChange)
vault.on('create', this.handleFileChange)
```

**修复**:
```typescript
// ✅ 正确的事件类型
vault.on('modify', (file: TAbstractFile) => this.handleFileChange(file))
vault.on('create', (file: TAbstractFile) => this.handleFileChange(file))
```

**预计时间**: 10分钟

### 2.2 moment 导入问题

**文件**: `src/lib/utils/core/templateUtils.ts`

**错误**:
```typescript
// ❌ moment 是 namespace import，不能直接调用
import * as Moment from 'moment';
result = moment().format(format);
```

**修复**:
```typescript
// ✅ 使用正确的导入方式
import moment from 'moment';
result = moment().format(format);
```

**预计时间**: 5分钟

### 2.3 timing 函数 this 类型

**文件**: `src/lib/utils/core/timing.ts`

**错误**:
```typescript
// ❌ this 类型不明确
fn.apply(this, args);
```

**修复**:
```typescript
// ✅ 明确 this 类型
fn.apply(this as any, args);
// 或使用箭头函数避免 this 问题
```

**预计时间**: 10分钟

### 2.4 types.ts 导入错误

**文件**: `src/lib/services/core/types.ts`

**错误**:
```typescript
// ❌ 错误的导入路径
import type { ThinkSettings } from '../../domain';
```

**修复**:
```typescript
// ✅ 正确的导入路径
import type { ThinkSettings } from '../../types/domain/schema';
```

**预计时间**: 2分钟

---

## 🎯 Phase 3: 修复测试文件类型错误 (P3)

### 问题分析

测试文件缺少类型定义，导致 `describe`、`test`、`expect` 等全局函数未定义。

### 解决方案

#### 方案 A: 安装 Jest 类型定义（推荐）

```bash
npm install --save-dev @types/jest
```

**tsconfig.json 配置**:
```json
{
  "compilerOptions": {
    "types": ["vite/client", "preact", "jest"]
  }
}
```

#### 方案 B: 排除测试文件

如果暂时不需要测试文件的类型检查：

**tsconfig.json 配置**:
```json
{
  "exclude": ["node_modules", "dist", "test"]
}
```

### 推荐

**Phase 1 完成后执行方案 A**，确保测试代码的类型安全。

**预计时间**: 30分钟

---

## 🎯 Phase 4: 处理 MUI + Preact 类型冲突 (P2)

### 临时方案（快速修复）

在受影响的文件顶部添加类型忽略：

```typescript
// 文件顶部添加
// @ts-nocheck
// 或针对特定行
// @ts-ignore
```

**影响文件** (~20个):
- Dialog 组件
- Form 组件
- Settings 组件

**预计时间**: 1小时

### 长期方案（完整解决）

参考 `计划.md` 中的 UI 组件库优化计划：
1. 创建 Preact 原生组件库
2. 逐步替换 MUI 组件
3. 移除 MUI 依赖

**预计时间**: 2-3周（见优化计划）

### 推荐

1. **立即**: 使用临时方案，让项目可以通过类型检查
2. **长期**: 按计划逐步替换 MUI

---

## 📅 执行时间表

### Week 1: 核心错误修复

| 日期 | 任务 | 预计时间 | 负责人 |
|------|------|----------|--------|
| Day 1 | Phase 1.1: AppStore DataSource 清理 | 4h | - |
| Day 1 | Phase 2: 其他小错误修复 | 1h | - |
| Day 2 | Phase 1.2: Settings UI DataSource 清理 | 6h | - |
| Day 2 | Phase 3: 测试文件类型配置 | 0.5h | - |
| Day 3 | Phase 1.3: 其他业务代码 DataSource 清理 | 6h | - |
| Day 3 | Phase 4: MUI 类型冲突临时修复 | 1h | - |
| Day 4 | 全面测试和验证 | 4h | - |
| Day 5 | 文档更新和代码审查 | 2h | - |

### Week 2+: UI 组件库优化（可选）

见 `计划.md` - Phase 1: UI组件库构建

---

## ✅ 验证清单

### Phase 1 完成标准
- [ ] `npx tsc --noEmit` 零错误（DataSource 相关）
- [ ] 所有 Settings UI 功能正常
- [ ] ViewInstance 可以正常创建和编辑
- [ ] 数据持久化正常

### Phase 2 完成标准
- [ ] VaultWatcher 正常监听文件变化
- [ ] moment 相关功能正常
- [ ] timing 函数正常工作

### Phase 3 完成标准
- [ ] 测试文件类型检查通过
- [ ] 测试可以正常运行

### Phase 4 完成标准
- [ ] MUI 组件类型错误被抑制
- [ ] 不影响功能使用

### 最终目标
- [ ] `npx tsc --noEmit` **零错误**
- [ ] `npm run build` 成功
- [ ] 所有核心功能测试通过
- [ ] 在 Obsidian 中实际使用无问题

---

## 🚨 风险评估

### 高风险项

1. **DataSource 移除影响范围大**
   - **风险**: 可能遗漏某些引用点
   - **缓解**: 使用全局搜索，逐一确认
   - **回滚**: Git 分支隔离，可随时回滚

2. **Settings UI 重构**
   - **风险**: 用户界面变化，使用习惯受影响
   - **缓解**: 保持界面一致性，只改底层实现
   - **回滚**: 保留原有界面逻辑

### 中风险项

1. **类型错误修复可能引入新 bug**
   - **风险**: 修改类型声明可能导致运行时错误
   - **缓解**: 充分测试每个修改点
   - **回滚**: 小步提交，便于定位问题

### 低风险项

1. **测试类型配置**
   - **风险**: 最小，只影响开发体验
   - **缓解**: 配置错误易于发现和修复

---

## 📝 检查点文档

### 每日检查点

每天工作结束前记录：
```markdown
## 2025-10-XX 工作记录

### 完成的工作
- [ ] 任务1
- [ ] 任务2

### 遇到的问题
- 问题描述
- 解决方案

### 明天计划
- [ ] 任务1
- [ ] 任务2

### TypeScript 错误统计
- 错误数: XXX → YYY
- 减少: ZZZ 个
```

### Git 提交策略

**分支策略**:
```
main
 └─ fix/typescript-errors  (功能分支)
     ├─ fix/datasource-removal  (子任务分支)
     ├─ fix/minor-errors        (子任务分支)
     └─ fix/test-types          (子任务分支)
```

**提交规范**:
```
fix(types): 移除 AppStore 中的 DataSource 引用

- 删除 addDataSource, updateDataSource 等方法
- 移除 settings.dataSources 引用
- 更新相关类型定义

Closes #XXX
TypeScript 错误: 1661 → 1636 (-25)
```

---

## 🎓 最佳实践

### 1. 渐进式修复

- ✅ **DO**: 每次修复一个文件或一类错误
- ❌ **DON'T**: 一次性修改多个不相关的文件

### 2. 测试驱动

- ✅ **DO**: 修复后立即测试相关功能
- ❌ **DON'T**: 等所有修复完成后再测试

### 3. 文档同步

- ✅ **DO**: 修改代码的同时更新相关文档
- ❌ **DON'T**: 留待最后统一更新文档

### 4. 类型安全优先

- ✅ **DO**: 使用正确的类型，而不是 `any`
- ❌ **DON'T**: 滥用 `@ts-ignore` 绕过类型检查

---

## 📞 相关资源

### 文档
- [TypeScript 错误处理最佳实践](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Preact TypeScript 配置](https://preactjs.com/guide/v10/typescript)
- [Jest TypeScript 配置](https://jestjs.io/docs/getting-started#using-typescript)

### 工具
- [ts-prune](https://github.com/nadeesha/ts-prune) - 查找未使用的导出
- [ts-unused-exports](https://github.com/pzavolinsky/ts-unused-exports) - 查找未使用的导出

### 相关文件
- `docs/refactoring/Vite构建修复总结.md` - 前置工作
- `计划.md` - 渐进式优化总体计划

---

## 🎯 成功指标

### 定量指标

| 指标 | 当前 | 目标 | 衡量方式 |
|------|------|------|----------|
| TypeScript 错误数 | 1,661 | 0 | `npx tsc --noEmit` |
| DataSource 引用数 | ~400 | 0 | 全局搜索 |
| 测试通过率 | 未知 | 100% | `npm test` |
| 构建成功率 | 100% | 100% | `npm run build` |

### 定性指标

- [ ] IDE 无红色波浪线
- [ ] 代码可读性提升
- [ ] 维护性提升
- [ ] 团队信心提升

---

## 📅 下一步行动

1. **立即开始**: 
   - 创建 `fix/typescript-errors` 分支
   - 执行 Phase 2（小错误修复）热身

2. **Day 1 开始**:
   - 执行 Phase 1.1（AppStore DataSource 清理）

3. **持续跟进**:
   - 每日更新检查点文档
   - 每日提交进度到 Git

4. **完成后**:
   - 合并到主分支
   - 更新 README 和 CHANGELOG
   - 开始下一阶段优化（UI 组件库）
