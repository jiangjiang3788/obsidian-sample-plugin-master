import { useCallback, useState } from 'preact/hooks';
import type { WhiteboardItem, WhiteboardStore } from '@core/whiteboard/public';

export interface WhiteboardArchiveController {
  open: boolean;
  setOpen: (open: boolean) => void;
  archivingItemIds: ReadonlySet<string>;
  restoringItemIds: ReadonlySet<string>;
  archiveItems: (itemIds: readonly string[]) => Promise<boolean>;
  restoreItem: (itemId: string) => Promise<WhiteboardItem | null>;
  moveArchivedItems: (moves: readonly { itemId: string; archiveX: number; archiveY: number; archiveZIndex?: number }[]) => Promise<boolean>;
}

export function useWhiteboardArchiveController(input: {
  boardId: string;
  storeReady: boolean;
  whiteboardStore: WhiteboardStore;
  onNotice?: (message: string) => void;
}): WhiteboardArchiveController {
  const { boardId, storeReady, whiteboardStore, onNotice } = input;
  const [open, setOpen] = useState(false);
  const [archivingItemIds, setArchivingItemIds] = useState<ReadonlySet<string>>(() => new Set());
  const [restoringItemIds, setRestoringItemIds] = useState<ReadonlySet<string>>(() => new Set());

  const archiveItems = useCallback(async (itemIds: readonly string[]) => {
    const ids = [...new Set(itemIds.filter((id) => id.trim()))];
    if (!storeReady || ids.length === 0 || archivingItemIds.size > 0) return false;
    setArchivingItemIds(new Set(ids));
    try {
      const archived = await whiteboardStore.archiveItems(boardId, ids);
      if (!archived) onNotice?.('要归档的白板卡片已不存在');
      return archived;
    } catch (error) {
      onNotice?.(`归档白板卡片失败：${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setArchivingItemIds(new Set());
    }
  }, [archivingItemIds.size, boardId, onNotice, storeReady, whiteboardStore]);

  const restoreItem = useCallback(async (itemId: string) => {
    if (!storeReady || restoringItemIds.size > 0) return null;
    setRestoringItemIds(new Set([itemId]));
    try {
      const restored = await whiteboardStore.restoreArchivedItem(boardId, itemId);
      if (!restored) onNotice?.('归档卡片已不存在');
      return restored;
    } catch (error) {
      onNotice?.(`恢复归档卡片失败：${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      setRestoringItemIds(new Set());
    }
  }, [boardId, onNotice, restoringItemIds.size, storeReady, whiteboardStore]);


  const moveArchivedItems = useCallback(async (moves: readonly { itemId: string; archiveX: number; archiveY: number; archiveZIndex?: number }[]) => {
    if (!storeReady || moves.length === 0) return false;
    try { return await whiteboardStore.moveArchivedItems(boardId, moves); }
    catch (error) { onNotice?.(`移动归档卡片失败：${error instanceof Error ? error.message : String(error)}`); return false; }
  }, [boardId, onNotice, storeReady, whiteboardStore]);

  return { open, setOpen, archivingItemIds, restoringItemIds, archiveItems, restoreItem, moveArchivedItems };
}
