// src/core/utils/itemGrouping.ts
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { EMPTY_LABEL } from '@/core/types/constants';
import { getBasePath } from './pathSemantic';
import { getCanonicalFieldKey } from '@/core/fields/FieldRegistry';
import { splitGoalPath } from '@/core/goal/path';
import { createGoalOrderIndex } from '@/core/goal/order';
import type { GoalDefinition } from '@/core/goal/types';

export interface ViewFieldOrderContext {
    goals?: GoalDefinition[];
}

/**
 * 目标字段识别的统一入口。
 *
 * 设计约束：视图自己的“内容排序”只负责同一目标内部的记录顺序；
 * 只要一个视图把目标字段用作分组 / 表格行列 / Excel 展示列，目标之间的顺序就必须来自目标设置。
 */
export function isGoalOrderField(field?: string | null): boolean {
    const canonical = getCanonicalFieldKey(String(field || '').trim());
    return ['goalPath', 'rootGoal', 'leafGoal', 'goalId'].includes(canonical);
}

function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function firstText(value: unknown): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const candidate = firstText(item);
            if (candidate) return candidate;
        }
        return '';
    }
    const text = normalizeText(value);
    if (!text) return '';
    return text.split(/[,，\n]/).map(part => part.trim()).filter(Boolean)[0] || '';
}

function normalizeGoalComparable(value: unknown): string {
    const text = firstText(value);
    if (!text) return '';
    return splitGoalPath(text).goalPath || '';
}

function buildGoalPathById(goals: GoalDefinition[] = []): Map<string, string> {
    const result = new Map<string, string>();
    for (const goal of goals || []) {
        const path = normalizeGoalComparable(goal.goalPath || goal.title || goal.id);
        if (goal.id && path) result.set(goal.id, path);
    }
    return result;
}

function resolveGoalFieldComparable(field: string, rawValue: unknown, context?: ViewFieldOrderContext): string {
    const canonical = getCanonicalFieldKey(String(field || '').trim());
    const goals = context?.goals || [];

    if (canonical === 'goalId') {
        const id = firstText(rawValue);
        return buildGoalPathById(goals).get(id) || id || '';
    }

    return normalizeGoalComparable(rawValue);
}

/**
 * 按字段语义比较两个字段值。
 * 目前核心是目标顺序；普通字段仍保持原有字典序，避免改变内容排序语义。
 */
export function compareFieldValuesByViewOrder(field: string, left: unknown, right: unknown, context?: ViewFieldOrderContext): number {
    if (isGoalOrderField(field)) {
        const goalOrder = createGoalOrderIndex(context?.goals || []);
        const leftGoal = resolveGoalFieldComparable(field, left, context);
        const rightGoal = resolveGoalFieldComparable(field, right, context);
        const byGoal = goalOrder.compareGoalPaths(leftGoal, rightGoal);
        if (byGoal !== 0) return byGoal;
        return leftGoal.localeCompare(rightGoal, 'zh-CN');
    }
    return String(left ?? '').localeCompare(String(right ?? ''), 'zh-CN');
}

function readOrderedFieldValue(item: RecordViewItem, field: string, context?: ViewFieldOrderContext): unknown {
    const canonical = getCanonicalFieldKey(String(field || '').trim());
    if (isGoalOrderField(canonical)) {
        if (canonical === 'goalId') {
            return firstText((item as any)[canonical]) || readField(item, canonical);
        }
        return item.goalPath || readField(item, canonical) || readField(item, 'goalPath');
    }
    return readField(item, canonical);
}

function findFirstGoalOrderField(fields: string[] = []): string | null {
    for (const field of fields || []) {
        if (isGoalOrderField(field)) return getCanonicalFieldKey(field);
    }
    return null;
}

/**
 * Excel / 列表类视图的稳定记录排序：
 * - 只有当显示字段里包含“目标”时才介入；
 * - 只重排目标之间的顺序；
 * - 同一目标内部保留原 items 顺序，让内容排序、时间排序、用户排序继续生效。
 */
export function orderItemsByDisplayedGoalField<T extends RecordViewItem>(items: T[] = [], displayFields: string[] = [], context?: ViewFieldOrderContext): T[] {
    const goalField = findFirstGoalOrderField(displayFields);
    if (!goalField) return items;

    const originalIndex = new Map<T, number>();
    items.forEach((item, index) => originalIndex.set(item, index));

    return [...items].sort((left, right) => {
        const byGoal = compareFieldValuesByViewOrder(
            goalField,
            readOrderedFieldValue(left, goalField, context),
            readOrderedFieldValue(right, goalField, context),
            context,
        );
        if (byGoal !== 0) return byGoal;
        return (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0);
    });
}

/**
 * 按单个字段对 items 进行分组
 */
function normalizeGroupKeys(value: unknown, defaultLabel: string): string[] {
    if (Array.isArray(value)) {
        const keys = value.map(v => String(v ?? '').trim()).filter(Boolean);
        return keys.length ? Array.from(new Set(keys)) : [defaultLabel];
    }
    const text = String(value ?? '').trim();
    return text ? [text] : [defaultLabel];
}

export function groupItemsByField(items: RecordViewItem[], groupField: string, defaultLabel: string = '(未分类)'): Record<string, RecordViewItem[]> {
    const grouped: Record<string, RecordViewItem[]> = {};
    
    for (const item of items) {
        const keys = normalizeGroupKeys(readField(item, groupField), defaultLabel);
        for (const key of keys) {
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        }
    }
    
    return grouped;
}

/**
 * 获取分组后的排序键值列表
 */
export function getSortedGroupKeys(grouped: Record<string, RecordViewItem[]>, field?: string, context?: ViewFieldOrderContext): string[] {
    const keys = Object.keys(grouped);
    if (field && isGoalOrderField(field)) {
        return keys.sort((a, b) => compareFieldValuesByViewOrder(field, a, b, context));
    }
    return keys.sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 多字段层级分组用的节点结构
 */
export interface GroupNode {
    key: string;
    label?: string;           // 当前层的分组 key（字段值）
    field: string;         // 当前层使用的字段名
    items?: RecordViewItem[];        // 叶子节点：具体 items
    children?: GroupNode[];// 中间节点：子分组
}

/**
 * 按多个字段做层级分组，按 fields 的顺序依次分组：
 *  例如 ['A','B','C'] => A 层 -> B 层 -> C 层 -> items
 * 每一层复用 groupItemsByField + getSortedGroupKeys 的逻辑。
 */
export function groupItemsByFields(items: RecordViewItem[], fields: string[], context?: ViewFieldOrderContext): GroupNode[] {
    if (!fields || fields.length === 0) {
        // 不分组时，返回一个虚拟根节点，方便视图统一处理
        return [{
            key: '__all__',
            label: '__all__',
            field: '__all__',
            items,
        }];
    }

    const groupLevel = (levelItems: RecordViewItem[], level: number): GroupNode[] => {
        const field = fields[level];

        // 复用单字段分组逻辑（包括 defaultLabel 行为）
        const grouped = groupItemsByField(levelItems, field);
        const keys = getSortedGroupKeys(grouped, field, context);

        return keys.map(key => {
            const bucket = grouped[key];
            if (level === fields.length - 1) {
                // 最后一层：叶子节点，挂 items
                return {
                    key,
                    label: key,
                    field,
                    items: bucket,
                } as GroupNode;
            } else {
                // 中间层：子节点继续按下一字段分组
                return {
                    key,
                    label: key,
                    field,
                    children: groupLevel(bucket, level + 1),
                } as GroupNode;
            }
        });
    };

    return groupLevel(items, 0);
}

/**
 * 构建表格矩阵数据结构
 */
export interface TableMatrix {
    matrix: Record<string, Record<string, RecordViewItem[]>>;
    sortedRows: string[];
    sortedCols: string[];
}

export function buildTableMatrix(items: RecordViewItem[], rowField: string, colField: string, context?: ViewFieldOrderContext): TableMatrix {
    const rowVals: Set<string> = new Set();
    const colVals: Set<string> = new Set();
    const matrix: Record<string, Record<string, RecordViewItem[]>> = {};

    items.forEach(item => {
        const rows = normalizeGroupKeys(readField(item, rowField), EMPTY_LABEL);
        const cols = normalizeGroupKeys(readField(item, colField), EMPTY_LABEL);
        rows.forEach(r => {
            cols.forEach(c => {
                rowVals.add(r);
                colVals.add(c);
                if (!matrix[r]) matrix[r] = {};
                if (!matrix[r][c]) matrix[r][c] = [];
                matrix[r][c].push(item);
            });
        });
    });

    const sortedRows = Array.from(rowVals).sort((a, b) => compareFieldValuesByViewOrder(rowField, a, b, context));
    const sortedCols = Array.from(colVals).sort((a, b) => compareFieldValuesByViewOrder(colField, a, b, context));

    return { matrix, sortedRows, sortedCols };
}

/**
 * 提取 categoryKey 的基础分类（第一级路径）
 */
export function getBaseCategory(categoryKey?: string): string {
    return getBasePath(categoryKey);
}

/**
 * 从 items 中收集所有基础分类
 */
export function collectBaseCategories(items: RecordViewItem[]): string[] {
    const categorySet = new Set<string>();
    items.forEach(item => {
        const baseCategory = getBaseCategory(item.categoryKey);
        if (baseCategory) {
            categorySet.add(baseCategory);
        }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 从视图实例中收集所有可用的分类名称
 */
export function collectCategoriesFromViews(
    viewInstances: any[], 
    predefinedCategories: string[] = []
): string[] {
    const categorySet = new Set<string>();
    
    // 从视图实例中收集分类
    viewInstances.forEach(view => {
        if (view.viewType === 'StatisticsView' && view.viewConfig?.categories) {
            view.viewConfig.categories.forEach((cat: any) => {
                if (cat.name) {
                    categorySet.add(getBasePath(cat.name) || cat.name);
                }
            });
        }
    });

    // 从预定义分类中收集
    predefinedCategories.forEach((cat: string) => categorySet.add(cat));

    return Array.from(categorySet).sort();
}
