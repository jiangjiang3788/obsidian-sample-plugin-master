# 🧹 文件清理计划

## ✅ 已完成的清理

### 重复文件删除（第一阶段）
- ✅ 删除 `src/lib/services/core/` 整个目录及所有文件
- ✅ 删除 `src/lib/services/index.ts` （无效引用）
- ✅ 验证构建成功，无破坏性影响

### lib/types/domain/ 迁移（第二阶段）
- ✅ 成功迁移 `src/lib/types/domain/` → `src/core/types/domain/`
- ✅ 迁移了7个文件：cache.ts, constants.ts, definitions.ts, fields.ts, schema.ts, theme.ts, index.ts
- ✅ 更新 `src/core/types/index.ts` 导出域类型
- ✅ 批量替换了80处导入路径引用（62个文件）
- ✅ 删除原有的 `src/lib/types/domain/` 和 `src/lib/types/` 目录
- ✅ 修复 main.ts 和 storeRegistry.ts 中的导入路径冲突
- ✅ 验证构建成功，无破坏性影响

### lib/utils/ 迁移（第三阶段）
- ✅ 成功迁移 `src/lib/utils/core/` → `src/core/utils/`
- ✅ 成功迁移 `src/lib/utils/shared/` → `src/shared/utils/`
- ✅ 成功迁移 `src/lib/utils/array.ts` → `src/shared/utils/array.ts`
- ✅ 迁移了20个文件（17个core工具文件 + 3个shared工具文件）
- ✅ 批量替换了66处导入路径引用（40个文件）
- ✅ 处理了所有相对路径和别名路径导入
- ✅ 删除原有的 `src/lib/utils/` 目录
- ✅ 验证构建成功，无破坏性影响

## 📋 当前项目结构分析

### 目标架构
```
src/
├── core/           # ✅ 已有 - 核心基础设施
├── features/       # ✅ 已有 - 功能模块  
├── shared/         # ✅ 已有 - 共享资源
├── views/          # ✅ 保留 - 视图组件
├── platform/       # ✅ 保留 - 平台相关
└── main.ts         # ✅ 保留 - 入口文件
```

### 需要清理的目录
```
src/
├── lib/            # 🔄 需要整理和迁移
├── store/          # 🤔 考虑迁移到 core/stores
├── types/          # 🤔 考虑整合到 core/types
├── hooks/          # 🤔 考虑迁移到 shared/hooks  
├── ui/             # 🤔 考虑迁移到 shared/components
├── constants/      # 🤔 考虑迁移到 shared/constants
```

## 🎯 第二阶段清理计划

### 1. lib/ 目录内容迁移

#### src/lib/types/domain/ → src/core/types/
```bash
# 迁移核心类型定义
移动: src/lib/types/domain/*.ts → src/core/types/domain/
包含: cache.ts, constants.ts, definitions.ts, fields.ts, schema.ts, theme.ts
```

#### src/lib/utils/ → 分类迁移
```bash
# 核心工具
src/lib/utils/core/ → src/core/utils/
# 共享工具  
src/lib/utils/shared/ → src/shared/utils/
# 通用工具
src/lib/utils/array.ts → src/shared/utils/
```

#### src/lib/patterns/ → src/shared/patterns/
```bash
# 设计模式和通用逻辑
移动: src/lib/patterns/ → src/shared/patterns/
```

#### src/lib/migration/ → src/core/migration/ 
```bash
# 迁移脚本保留在核心
移动: src/lib/migration/ → src/core/migration/
```

#### src/lib/logic/ → 根据内容分类
```bash
# 需要分析内容后决定迁移位置
检查内容 → 迁移到对应的 features/ 或 core/
```

### 2. 其他目录整合

#### store/ → core/stores/
```bash
# 如果 store/ 主要是状态管理
考虑: src/store/ → src/core/stores/
# 但需要检查是否与现有 core/stores 冲突
```

#### types/ → core/types/
```bash
# 整合类型定义
整合: src/types/ + src/lib/types/ → src/core/types/
```

#### hooks/ → shared/hooks/
```bash
# 共享的 React/Preact hooks
移动: src/hooks/ → src/shared/hooks/
```

## ⚠️ 迁移注意事项

### 需要同步更新的配置
1. **路径别名**：tsconfig.json & vite.config.ts
2. **导入路径**：所有相关文件的 import 语句
3. **测试文件**：Jest 配置和测试用例路径

### 迁移顺序建议
1. **lib/types/** → core/types/ （核心类型，影响面广）
2. **lib/utils/** → 分类迁移（工具函数）
3. **lib/patterns/** → shared/patterns/ （设计模式）
4. **lib/migration/** → core/migration/ （迁移脚本）
5. **其他目录** → 根据实际需要

## 🚀 执行建议

### 立即可执行（安全）
- 迁移 `src/lib/types/domain/` 到 `src/core/types/domain/`
- 迁移 `src/lib/utils/` 到对应位置
- 更新相关的导入路径

### 需要谨慎分析  
- `src/store/` 的内容和作用
- `src/lib/logic/` 的具体内容
- 是否有其他地方引用了这些目录

您希望从哪个部分开始继续清理？我建议先从 lib/types/ 开始，因为类型定义是基础，迁移后影响最小。
