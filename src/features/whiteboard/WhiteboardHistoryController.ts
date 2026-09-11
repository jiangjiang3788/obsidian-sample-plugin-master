import { useCallback } from 'preact/hooks';
import type { WhiteboardStore } from '@core/whiteboard/public';

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
}

export function useWhiteboardHistoryController(whiteboardStore: WhiteboardStore, onNotice?: (message: string) => void) {
  const canUndo = typeof whiteboardStore.canUndo === 'function' ? whiteboardStore.canUndo() : false;
  const canRedo = typeof whiteboardStore.canRedo === 'function' ? whiteboardStore.canRedo() : false;
  const undo = useCallback(async () => {
    if (typeof whiteboardStore.undo !== 'function') return false;
    try { return await whiteboardStore.undo(); }
    catch (error) { onNotice?.(`撤销失败：${error instanceof Error ? error.message : String(error)}`); return false; }
  }, [onNotice, whiteboardStore]);
  const redo = useCallback(async () => {
    if (typeof whiteboardStore.redo !== 'function') return false;
    try { return await whiteboardStore.redo(); }
    catch (error) { onNotice?.(`重做失败：${error instanceof Error ? error.message : String(error)}`); return false; }
  }, [onNotice, whiteboardStore]);
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isEditableTarget(event.target) || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
    event.preventDefault(); event.stopPropagation();
    void (event.shiftKey ? redo() : undo());
  }, [redo, undo]);
  return { canUndo, canRedo, undo, redo, handleKeyDown };
}
