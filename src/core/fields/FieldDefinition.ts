// src/core/fields/FieldDefinition.ts
import type {
  FieldCardinality,
  FieldCategory,
  FieldInputType,
  FieldOption,
  FieldSemantic,
  FieldSource,
  FieldStoragePolicy,
  FieldValueType,
} from './FieldTypes';

/**
 * 统一字段定义。
 *
 * - key：稳定存储键。
 * - label：界面展示名，可自由改。
 * - type/inputType：值结构与输入能力，同时决定单值/多值。
 * - semantic：仅供插件内置核心字段和历史数据内部使用，不作为普通设置项暴露。
 */
export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldValueType;
  inputType?: FieldInputType;
  semantic?: FieldSemantic;
  category: FieldCategory;
  source: FieldSource;
  cardinality?: FieldCardinality;
  hierarchical?: boolean;
  options?: FieldOption[];
  aliases?: string[];
  storage?: FieldStoragePolicy;
  description?: string;
  deprecated?: boolean;
  hiddenByDefault?: boolean;
  formatter?: (value: unknown, item?: unknown) => string;
}
