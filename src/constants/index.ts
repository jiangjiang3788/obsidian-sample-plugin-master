// =================================================================================
//
//  全局常量库
//
//  此文件旨在集中管理整个应用中的共享常量，以消除魔法字符串和数字，
//  并确保代码的一致性和可维护性。
//
// =================================================================================

import type { ActiveStatus, SourceType, BatchOperationType } from '@/types/commontypes/common';

/**
 * 实体激活状态常量
 */
export const STATUS: { [key: string]: ActiveStatus } = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

/**
 * 数据来源类型常量
 */
export const SOURCE: { [key: string]: SourceType } = {
  PREDEFINED: 'predefined',
  DISCOVERED: 'discovered',
};

/**
 * 批量操作类型常量
 */
export const BATCH_OPERATIONS: { [key: string]: BatchOperationType } = {
  ACTIVATE: 'activate',
  ARCHIVE: 'archive',
  DELETE: 'delete',
  SET_ICON: 'setIcon',
  SET_INHERIT: 'setInherit',
  SET_OVERRIDE: 'setOverride',
  SET_DISABLED: 'setDisabled',
  APPLY_TEMPLATE: 'applyTemplate',
  EDIT_MODE: 'editMode',
  TOGGLE_EDIT: 'toggleEdit',
};
