import { useCallback, useMemo, useState } from 'preact/hooks';
import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardPosition, WhiteboardStore } from '@core/whiteboard/public';
import type { WhiteboardAnnotationKind } from '@core/whiteboard/public';
import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import { getWhiteboardWorkbenchItemsForContainer } from './WhiteboardWorkbenchModel';

interface WhiteboardAnnotationControllerInput {
  boardId: string;
  annotations: WhiteboardAnnotation[];
  groups: WhiteboardGroup[];
  activeGroupId: string | null;
  storeReady: boolean;
  whiteboardStore: WhiteboardStore;
  onNotice?: (message: string) => void;
}

export function useWhiteboardAnnotationController({
  boardId, annotations, groups, activeGroupId, storeReady, whiteboardStore, onNotice,
}: WhiteboardAnnotationControllerInput) {
  const [autoEditAnnotationId, setAutoEditAnnotationId] = useState<string | null>(null);
  const visibleAnnotations = useMemo(
    () => getWhiteboardWorkbenchItemsForContainer(annotations, groups, activeGroupId),
    [activeGroupId, annotations, groups],
  );

  const create = useCallback(async (kind: WhiteboardAnnotationKind, point: WhiteboardWorldPoint, text = '') => {
    if (!storeReady) return null;
    try { const created = await whiteboardStore.createAnnotation(boardId, kind, text, { x: point.x, y: point.y }, activeGroupId); setAutoEditAnnotationId(created.id); return created; }
    catch (error) { onNotice?.(`添加白板标注失败：${error instanceof Error ? error.message : String(error)}`); return null; }
  }, [activeGroupId, boardId, onNotice, storeReady, whiteboardStore]);
  const update = useCallback(async (annotationId: string, text: string) => {
    if (!storeReady) return false;
    try { return await whiteboardStore.updateAnnotation(boardId, annotationId, text); }
    catch (error) { onNotice?.(`保存白板标注失败：${error instanceof Error ? error.message : String(error)}`); return false; }
  }, [boardId, onNotice, storeReady, whiteboardStore]);
  const move = useCallback(async (annotationId: string, position: WhiteboardPosition) => {
    if (!storeReady) return false;
    try { return await whiteboardStore.moveAnnotation(boardId, annotationId, position); }
    catch (error) { onNotice?.(`移动白板标注失败：${error instanceof Error ? error.message : String(error)}`); return false; }
  }, [boardId, onNotice, storeReady, whiteboardStore]);
  const remove = useCallback(async (annotationId: string) => {
    if (!storeReady) return false;
    try { return await whiteboardStore.removeAnnotation(boardId, annotationId); }
    catch (error) { onNotice?.(`删除白板标注失败：${error instanceof Error ? error.message : String(error)}`); return false; }
  }, [boardId, onNotice, storeReady, whiteboardStore]);

  const consumeAutoEdit = useCallback((annotationId: string) => setAutoEditAnnotationId((current) => current === annotationId ? null : current), []);
  return { visibleAnnotations, autoEditAnnotationId, consumeAutoEdit, create, update, move, remove };
}
