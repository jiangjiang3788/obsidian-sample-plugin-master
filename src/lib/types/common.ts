// src/lib/types/common.ts
/**
 * 通用类型定义
 * 注意：这是新增文件，不影响现有代码
 */

// 基础类型
export type ID = string;
export type Timestamp = number;

// 通用接口
export interface Identifiable {
    id: ID;
}

export interface Timestamped {
    created: Timestamp;
    modified: Timestamp;
}

export interface Hierarchical {
    parentId: ID | null;
}

// 类型守卫
export function isIdentifiable(obj: any): obj is Identifiable {
    return obj && typeof obj.id === 'string';
}

export function isTimestamped(obj: any): obj is Timestamped {
    return obj && typeof obj.created === 'number' && typeof obj.modified === 'number';
}

export function isHierarchical(obj: any): obj is Hierarchical {
    return obj && ('parentId' in obj);
}
