import { generateId } from '../utils/id';
import { WhiteboardAnnotationSchema, type WhiteboardAnnotation, type WhiteboardBoard, type WhiteboardPosition } from './WhiteboardSchema';

export type WhiteboardAnnotationKind = WhiteboardAnnotation['kind'];

export function createWhiteboardAnnotation(
    board: WhiteboardBoard,
    kind: WhiteboardAnnotationKind,
    text: string,
    position: WhiteboardPosition,
    groupId?: string | null,
): WhiteboardAnnotation {
    if (groupId && !board.groups?.some((group) => group.id === groupId)) throw new Error('目标工作台不存在');
    const annotation = WhiteboardAnnotationSchema.parse({ id: generateId('whiteboard-annotation'), kind, text, x: position.x, y: position.y,
        ...(position.zIndex === undefined ? {} : { zIndex: position.zIndex }), ...(groupId ? { groupId } : {}) });
    (board.annotations ?? (board.annotations = [])).push(annotation);
    return annotation;
}

export function updateWhiteboardAnnotation(board: WhiteboardBoard, annotationId: string, text: string): boolean {
    const annotation = board.annotations?.find((candidate) => candidate.id === annotationId); if (!annotation) return false;
    const next = text.slice(0, 4000); if (annotation.text === next) return false; annotation.text = next; return true;
}

export function moveWhiteboardAnnotation(board: WhiteboardBoard, annotationId: string, position: WhiteboardPosition): boolean {
    const annotation = board.annotations?.find((candidate) => candidate.id === annotationId); if (!annotation) return false;
    if (annotation.x === position.x && annotation.y === position.y && (position.zIndex === undefined || annotation.zIndex === position.zIndex)) return false;
    annotation.x = position.x; annotation.y = position.y; if (position.zIndex !== undefined) annotation.zIndex = position.zIndex; return true;
}

export function removeWhiteboardAnnotation(board: WhiteboardBoard, annotationId: string): boolean {
    if (!board.annotations) return false; const before = board.annotations.length;
    board.annotations = board.annotations.filter((candidate) => candidate.id !== annotationId);
    if (board.annotations.length === before) return false; if (board.annotations.length === 0) delete board.annotations; return true;
}
