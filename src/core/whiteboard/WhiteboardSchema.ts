import { z } from 'zod';
import { getWhiteboardGroupDepth, getWhiteboardGroupPathIds, WHITEBOARD_WORKBENCH_MAX_DEPTH } from './WhiteboardGroupTree';

export const WhiteboardItemSchema = z.object({
    id: z.string().min(1),
    recordId: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    zIndex: z.number().finite().optional(),
    groupId: z.string().min(1).optional(),
}).strict();

export const WhiteboardArchivedItemSchema = WhiteboardItemSchema.extend({
    archivedAt: z.number().finite().nonnegative(),
    archiveX: z.number().finite().optional(),
    archiveY: z.number().finite().optional(),
    archiveZIndex: z.number().finite().optional(),
}).strict();

export const WhiteboardEdgeSchema = z.object({
    id: z.string().min(1),
    fromItemId: z.string().min(1),
    toItemId: z.string().min(1),
    label: z.string().max(200).optional(),
}).strict();

export const WhiteboardAnnotationSchema = z.object({
    id: z.string().min(1),
    kind: z.enum(['text', 'sticky']),
    text: z.string().max(4000),
    x: z.number().finite(),
    y: z.number().finite(),
    zIndex: z.number().finite().optional(),
    groupId: z.string().min(1).optional(),
}).strict();

export const WhiteboardGroupSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    collapsed: z.boolean(),
    parentGroupId: z.string().min(1).optional(),
}).strict();

export const WhiteboardBoardSchema = z.object({
    title: z.string().min(1),
    items: z.array(WhiteboardItemSchema),
    edges: z.array(WhiteboardEdgeSchema),
    annotations: z.array(WhiteboardAnnotationSchema).optional(),
    groups: z.array(WhiteboardGroupSchema).optional(),
    archivedItems: z.array(WhiteboardArchivedItemSchema).optional(),
    archivedEdges: z.array(WhiteboardEdgeSchema).optional(),
    modified: z.number().finite().nonnegative(),
}).strict().superRefine((board, ctx) => {
    const groupIds = new Set<string>();
    (board.groups ?? []).forEach((group, index) => {
        if (groupIds.has(group.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groups', index, 'id'], message: '工作台标识必须唯一' });
        groupIds.add(group.id);
    });
    const groups = board.groups ?? [];
    groups.forEach((group, index) => {
        if (group.parentGroupId && !groupIds.has(group.parentGroupId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groups', index, 'parentGroupId'], message: '工作台引用了不存在的父工作台' });
            return;
        }
        if (group.parentGroupId === group.id || getWhiteboardGroupPathIds(groups, group.id).filter((id) => id === group.id).length > 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groups', index, 'parentGroupId'], message: '工作台不能循环嵌套' });
            return;
        }
        const depth = getWhiteboardGroupDepth(groups, group.id);
        if (!Number.isFinite(depth) || depth > WHITEBOARD_WORKBENCH_MAX_DEPTH) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groups', index, 'parentGroupId'], message: `工作台最多嵌套 ${WHITEBOARD_WORKBENCH_MAX_DEPTH} 层` });
        }
    });
    board.items.forEach((item, index) => {
        if (item.groupId && !groupIds.has(item.groupId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'groupId'], message: '卡片引用了不存在的工作台' });
        }
    });
    (board.archivedItems ?? []).forEach((item, index) => {
        if (item.groupId && !groupIds.has(item.groupId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['archivedItems', index, 'groupId'], message: '归档卡片引用了不存在的工作台' });
        }
    });
    (board.annotations ?? []).forEach((annotation, index) => {
        if (annotation.groupId && !groupIds.has(annotation.groupId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['annotations', index, 'groupId'], message: '白板标注引用了不存在的工作台' });
        }
    });
    const projectionIds = new Set<string>();
    const recordIds = new Set<string>();
    [...board.items, ...(board.archivedItems ?? [])].forEach((item, index) => {
        const pathRoot = index < board.items.length ? 'items' : 'archivedItems';
        const pathIndex = index < board.items.length ? index : index - board.items.length;
        if (projectionIds.has(item.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [pathRoot, pathIndex, 'id'], message: '白板投影标识必须唯一' });
        if (recordIds.has(item.recordId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [pathRoot, pathIndex, 'recordId'], message: '同一记录不能同时存在多个白板投影' });
        projectionIds.add(item.id); recordIds.add(item.recordId);
    });
});

export const WhiteboardStoreDataSchema = z.object({
    version: z.literal(1),
    boards: z.record(z.string(), WhiteboardBoardSchema),
}).strict();

export type WhiteboardItem = z.infer<typeof WhiteboardItemSchema>;
export type WhiteboardArchivedItem = z.infer<typeof WhiteboardArchivedItemSchema>;
export type WhiteboardEdge = z.infer<typeof WhiteboardEdgeSchema>;
export type WhiteboardAnnotation = z.infer<typeof WhiteboardAnnotationSchema>;
export type WhiteboardGroup = z.infer<typeof WhiteboardGroupSchema>;
export type WhiteboardBoard = z.infer<typeof WhiteboardBoardSchema>;
export type WhiteboardStoreData = z.infer<typeof WhiteboardStoreDataSchema>;
export type WhiteboardPosition = Pick<WhiteboardItem, 'x' | 'y' | 'zIndex'>;
export type WhiteboardGroupPosition = Pick<WhiteboardGroup, 'x' | 'y'>;
