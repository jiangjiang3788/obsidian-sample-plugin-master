// =================================================================================
//
//  统一类型定义库 (Single Source of Truth)
//
//  此文件旨在集中管理整个应用中的共享类型，以消除重复定义并提高可维护性。
//  所有在此处定义的类型都应具有通用性，并可在多个模块之间共享。
//
// =================================================================================

// ---------------------------------------------------------------------------------
// 基础类型 (Primitives)
// ---------------------------------------------------------------------------------

/** 唯一的实体标识符，通常为字符串格式 */
export type ID = string;

/** Unix 时间戳 (毫秒) */
export type Timestamp = number;

// ---------------------------------------------------------------------------------
// 时间与周期 (Time & Period)
// ---------------------------------------------------------------------------------

/**
 * 定义了应用中所有与时间周期相关的视图粒度。
 * '年', '季', '月', '周', '天'
 */
export type PeriodType = '年' | '季' | '月' | '周' | '天';

/** `PeriodType` 的别名，用于表示当前视图的显示粒度，以增强代码可读性 */
export type CurrentView = PeriodType;

// ---------------------------------------------------------------------------------
// 通用状态 (Generic Statuses)
// ---------------------------------------------------------------------------------

/** 表示实体是否处于激活状态 */
export type ActiveStatus = 'active' | 'inactive';

/** 计时器的运行状态 */
export type TimerStatus = 'running' | 'paused';

/**
 * 定义了配置或样式的覆盖状态。
 * - `inherit`: 继承上级或默认设置
 * - `override`: 使用当前实体的特定设置
 * - `disabled`: 禁用此项设置
 */
export type OverrideStatus = 'inherit' | 'override' | 'disabled';

/** 通用的编辑模式，用于区分查看和编辑状态 */
export type EditMode = 'view' | 'edit';

// ---------------------------------------------------------------------------------
// 方向与排序 (Direction & Sorting)
// ---------------------------------------------------------------------------------

/** 表示在列表或数组中移动项目的方向 */
export type Direction = 'up' | 'down';

/** 排序方向 */
export type SortDirection = 'asc' | 'desc';

// ---------------------------------------------------------------------------------
// UI 交互 (UI Interaction)
// ---------------------------------------------------------------------------------

/**
 * ThemeMatrix 或类似组件中的选择模式。
 * - `theme`: 按主题进行选择
 * - `block`: 按块进行选择
 * - `cell`: 按单元格进行选择
 */
export type SelectionMode = 'theme' | 'block' | 'cell';

/**
 * 表示当前选择的实体类型。
 * - `none`: 当前无任何选择
 * - `theme`: 选择了主题
 * - `block`: 选择了块
 */
export type SelectionType = 'none' | 'theme' | 'block';

/** 核心数据实体的类型 */
export type ItemType = 'task' | 'block';

// ---------------------------------------------------------------------------------
// 数据字段与操作 (Data Fields & Operations)
// ---------------------------------------------------------------------------------

/** 模板或表单中可用字段的类型 */
export type FieldType = 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio' | 'number' | 'rating';

/** 过滤规则中使用的操作符 */
export type OperatorType = '=' | '!=' | 'includes' | 'regex' | '>' | '<';

/** 复合过滤规则之间的逻辑关系 */
export type LogicType = 'and' | 'or';

/** 任务或项目的优先级等级 */
export type PriorityLevel = 'lowest' | 'low' | 'medium' | 'high' | 'highest';

/**
 * 定义了所有可用的批量操作。
 * 此类型合并了主题、块和单元格级别的所有操作。
 */
export type BatchOperationType =
  | 'activate'
  | 'archive'
  | 'delete'
  | 'setIcon'
  | 'setInherit'
  | 'setOverride'
  | 'setDisabled'
  | 'applyTemplate'
  | 'editMode'
  | 'toggleEdit';

// ---------------------------------------------------------------------------------
// 领域特定类型 (Domain-Specific)
// ---------------------------------------------------------------------------------

/**
 * 主题或数据的来源类型。
 * - `predefined`: 在设置中预先定义
 * - `discovered`: 从现有数据中扫描发现
 */
export type SourceType = 'predefined' | 'discovered';

/**
 * 可分组实体的类型。
 * - `viewInstance`: 视图实例
 * - `layout`: 布局
 */
export type GroupType = 'viewInstance' | 'layout';

// ---------------------------------------------------------------------------------
// 通用接口 (Generic Interfaces)
// ---------------------------------------------------------------------------------

/** 具有唯一 ID 的实体 */
export interface Identifiable {
    id: ID;
}

/** 具有创建和修改时间戳的实体 */
export interface Timestamped {
    created: Timestamp;
    modified: Timestamp;
}

/** 可分层级的实体 */
export interface Hierarchical {
    parentId: ID | null;
}

// ---------------------------------------------------------------------------------
// 类型守卫 (Type Guards)
// ---------------------------------------------------------------------------------

/** 检查对象是否实现了 Identifiable 接口 */
export function isIdentifiable(obj: any): obj is Identifiable {
    return obj && typeof obj.id === 'string';
}

/** 检查对象是否实现了 Timestamped 接口 */
export function isTimestamped(obj: any): obj is Timestamped {
    return obj && typeof obj.created === 'number' && typeof obj.modified === 'number';
}

/** 检查对象是否实现了 Hierarchical 接口 */
export function isHierarchical(obj: any): obj is Hierarchical {
    return obj && ('parentId' in obj);
}
