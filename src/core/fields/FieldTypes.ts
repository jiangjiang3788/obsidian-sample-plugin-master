// src/core/fields/FieldTypes.ts
/**
 * 字段基础类型层
 * -----------------------------------------------------------------------------
 * 对用户可见的字段配置只暴露“字段名称 + 字段类型”。
 *
 * 字段类型同时决定输入控件以及是否多值：
 * - text / path / tag / image 等为单值
 * - multiSelect / multiPath / multiTag / multiImage 等为多值
 *
 * themePath / categoryPath / tags 这类系统语义保留为内部能力，
 * 但不再作为普通字段设置项暴露给用户选择。
 */

export type FieldCategory =
  | 'core'
  | 'file'
  | 'custom';

export type FieldSource = 'item' | 'file' | 'derived' | 'custom' | 'extra' | 'legacy';

export type FieldInputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'radio'
  | 'singleSelect'
  | 'multiSelect'
  | 'path'
  | 'hierarchicalSingleSelect'
  | 'multiPath'
  | 'tag'
  | 'multiTag'
  | 'image'
  | 'multiImage'
  | 'file'
  | 'rating';

export type FieldValueType =
  | 'string'
  | 'number'
  | 'date'
  | 'datetime'
  | 'time'
  | 'boolean'
  | 'tags'
  | 'path'
  | 'image'
  | 'file'
  | 'icon'
  | 'custom';

export type FieldSemantic =
  | 'none'
  | 'id'
  | 'recordType'
  | 'title'
  | 'body'
  | 'categoryPath'
  | 'themePath'
  | 'tags'
  | 'goalId'
  | 'goalPath'
  | 'cycleId'
  | 'coreBlock'
  | 'recordSubtype'
  | 'status'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'duration'
  | 'rating'
  | 'image'
  | 'icon'
  | 'priority'
  | 'recurrence'
  | 'period'
  | 'filePath'
  | 'fileName'
  | 'fileFolder'
  | 'heading';

export type FieldCardinality = 'single' | 'multi';

export type FieldStorageScope = 'core' | 'file' | 'derived' | 'custom' | 'extra' | 'legacy';

export interface FieldStoragePolicy {
  scope: FieldStorageScope;
  /** Markdown 写入时使用的字段名；为空时使用 key。 */
  markdownKey?: string;
  /** 读取旧数据时允许识别的历史字段名。 */
  aliases?: string[];
}

export interface FieldOption {
  value: string;
  label?: string;
  icon?: string;
}
