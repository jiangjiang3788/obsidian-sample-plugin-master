/**
 * ThemeMatrix 核心模块导出
 * 
 * 【S6 架构约束】
 * - 本模块下的服务（ThemeMatrixService, ThemeScanService）已完成 AppStore 解耦
 * - 服务通过配置注入模式（getSettings + writeOps）获取数据和执行写操作
 * - 写操作最终通过 useCases.theme.* 调用
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

// 主题矩阵主要业务服务（排除重复的 BatchOperationResult）
export {
  ThemeMatrixService,
  type ThemeMatrixWriteOps,
  type ThemeMatrixServiceConfig
} from './ThemeMatrixService';

// 主题扫描服务
export * from './ThemeScanService';
