/**
 * ThemeMatrix 核心模块导出
 * 
 * 【S6 架构约束 - P0-5 写入口唯一化】
 * - 本模块下的服务（ThemeMatrixService, ThemeScanService）只提供纯读/计算能力
 * - 已移除 writeOps 模式，所有写操作必须通过 useCases.theme.* 执行
 * - 服务通过 getSettings 获取数据，返回计算结果由 useCases 执行写入
 */

// 主题操作相关工具
export * from './themeOperations';

// 主题树构建工具
export * from './themeTreeBuilder';

// 主题路径解析工具
export * from './themePathParser';

// 主题去重算法工具
export * from './themeDeduplication';

// 主题相关类型
export * from './theme.types';

// 批量操作相关类型（排除与 ThemeMatrixService 冲突的 BatchOperationResult）
export {
  type BatchOperationType,
  type BatchOperationParams,
  type BatchOperationResult,
  type BatchOperationConfig,
  BATCH_OPERATION_CONFIGS,
  getAvailableOperations,
  isThemeOperation,
  isBlockOperation
} from './batch.types';

// 选择状态相关类型
export * from './selection.types';

// 主题矩阵主要业务服务
// 【P0-5】已移除 ThemeMatrixWriteOps，service 只提供纯读/计算能力
export {
  ThemeMatrixService,
  type ThemeMatrixServiceConfig,
  type AddThemeValidation,
  type UpdateThemeValidation,
  type DeleteThemeComputation
} from './ThemeMatrixService';

// 主题扫描服务
export * from './ThemeScanService';
