/**
 * ThemeMatrix 核心模块导出
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

// 批量操作相关类型  
export * from './batch.types';

// 选择状态相关类型
export * from './selection.types';


// 主题矩阵主要业务服务
export * from './ThemeMatrixService';

// 主题扫描服务
export * from './ThemeScanService';

// NOTE: BatchOperationService 已从此处移除导出
// 原因：该服务依赖 AppStore 和 ThemeManager（features层），违反 core 层边界约束
// 如需使用 BatchOperationService，请直接从 '@core/theme-matrix/BatchOperationService' 导入
// 迁移完成后可将其迁移到 features 层或重构其依赖
