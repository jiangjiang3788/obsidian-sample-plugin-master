import { useCallback, useEffect } from 'preact/hooks';
import { isWhiteboardClientPointInsideRect, type WhiteboardClientPoint } from './WhiteboardTransferModel';

interface WhiteboardSemanticSourceDropControllerInput {
  sourceCollapsed: boolean;
  sourceElementRef: { current: HTMLElement | null };
  onDropActiveChange: (active: boolean) => void;
  onDropItems: (itemIds: readonly string[]) => Promise<boolean>;
}

function elementRect(element: Element): { left: number; top: number; right: number; bottom: number } {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

export function useWhiteboardSemanticSourceDropController({
  sourceCollapsed, sourceElementRef, onDropActiveChange, onDropItems,
}: WhiteboardSemanticSourceDropControllerInput) {
  useEffect(() => {
    if (sourceCollapsed) onDropActiveChange(false);
  }, [onDropActiveChange, sourceCollapsed]);

  const handleSemanticItemDragPointerChange = useCallback((_itemIds: readonly string[], point: WhiteboardClientPoint | null) => {
    if (sourceCollapsed) { onDropActiveChange(false); return; }
    const sourceElement = sourceElementRef.current;
    onDropActiveChange(Boolean(point && sourceElement && isWhiteboardClientPointInsideRect(point, elementRect(sourceElement))));
  }, [onDropActiveChange, sourceCollapsed, sourceElementRef]);

  const handleSemanticItemDrop = useCallback(async (itemIds: readonly string[], point: WhiteboardClientPoint): Promise<boolean> => {
    if (sourceCollapsed) return false;
    const sourceElement = sourceElementRef.current;
    const consumed = Boolean(sourceElement && isWhiteboardClientPointInsideRect(point, elementRect(sourceElement)));
    onDropActiveChange(false);
    if (!consumed) return false;
    await onDropItems(itemIds);
    return true;
  }, [onDropActiveChange, onDropItems, sourceCollapsed, sourceElementRef]);

  return { handleSemanticItemDragPointerChange, handleSemanticItemDrop };
}
