import { useCallback, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardGroup, WhiteboardItem, WhiteboardStore } from '@core/whiteboard/public';
import { screenToWhiteboardWorld, type WhiteboardCamera } from './WhiteboardCameraModel';
import { resolveWhiteboardBatchPlacements } from './WhiteboardBatchPlacementModel';
import { getNextWhiteboardZIndex, WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import { getDefaultWhiteboardPosition } from './WhiteboardRecordPresentation';
import { getWhiteboardWorkbenchPointHitTargetId } from './WhiteboardWorkbenchModel';
import {
  isWhiteboardClientPointInsideRect,
  resolveWhiteboardCanvasDropPosition,
  type WhiteboardClientPoint,
} from './WhiteboardTransferModel';

interface WhiteboardRecordTransferControllerInput {
  boardId: string;
  items: WhiteboardItem[];
  groups: WhiteboardGroup[];
  boardRecordIds: ReadonlySet<string>;
  storeReady: boolean;
  whiteboardStore: WhiteboardStore;
  viewportRef: { current: HTMLDivElement | null };
  camera: WhiteboardCamera;
  zoom: number;
  activeGroupId?: string | null;
  onNotice?: (message: string) => void;
}

function elementRect(element: Element): { left: number; top: number; right: number; bottom: number } {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

export function useWhiteboardRecordTransferController({
  boardId,
  items,
  groups,
  boardRecordIds,
  storeReady,
  whiteboardStore,
  viewportRef,
  camera,
  zoom,
  activeGroupId = null,
  onNotice,
}: WhiteboardRecordTransferControllerInput) {
  const [addingRecordIds, setAddingRecordIds] = useState<ReadonlySet<string>>(() => new Set());
  const busyRef = useRef(false);

  const beginBusy = useCallback((recordIds: string[]): boolean => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setAddingRecordIds(new Set(recordIds));
    return true;
  }, []);
  const endBusy = useCallback(() => {
    busyRef.current = false;
    setAddingRecordIds(new Set());
  }, []);

  const addRecord = useCallback(async (record: RecordViewItem) => {
    if (!storeReady || !beginBusy([record.id])) return;
    try {
      const viewport = viewportRef.current;
      const position = activeGroupId && viewport ? {
        x: camera.x + viewport.clientWidth / (2 * zoom) - WHITEBOARD_CARD_WIDTH_PX / 2,
        y: camera.y + viewport.clientHeight / (2 * zoom) - WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2,
        zIndex: getNextWhiteboardZIndex(items),
      } : getDefaultWhiteboardPosition(items.length);
      await whiteboardStore.addRecord(boardId, record.id, position, activeGroupId);
    } catch (error) {
      onNotice?.(`加入白板失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      endBusy();
    }
  }, [activeGroupId, beginBusy, boardId, camera.x, camera.y, endBusy, items, onNotice, storeReady, viewportRef, whiteboardStore, zoom]);

  const resolveDropTargetGroupId = useCallback((point: WhiteboardClientPoint): string | null => {
    const viewport = viewportRef.current;
    if (!viewport || !isWhiteboardClientPointInsideRect(point, elementRect(viewport))) return null;
    const rect = viewport.getBoundingClientRect();
    const worldPoint = screenToWhiteboardWorld(point, { left: rect.left, top: rect.top }, camera, zoom);
    return getWhiteboardWorkbenchPointHitTargetId(groups, items, worldPoint, activeGroupId) ?? activeGroupId;
  }, [activeGroupId, camera, groups, items, viewportRef, zoom]);

  const dropRecords = useCallback(async (records: RecordViewItem[], point: WhiteboardClientPoint) => {
    const viewport = viewportRef.current;
    if (!viewport || !storeReady || busyRef.current || records.length === 0) return;
    if (!isWhiteboardClientPointInsideRect(point, elementRect(viewport))) return;
    const candidates = records.filter((record) => !boardRecordIds.has(record.id));
    if (candidates.length === 0) {
      onNotice?.(records.length === 1 ? '这条记录已经在当前白板' : '这些记录已经在当前白板');
      return;
    }
    if (!beginBusy(candidates.map((record) => record.id))) return;

    try {
      const viewportRect = viewport.getBoundingClientRect();
      const startZIndex = getNextWhiteboardZIndex(items);
      const anchor = resolveWhiteboardCanvasDropPosition({
        point,
        viewport: {
          left: viewportRect.left,
          top: viewportRect.top,
          right: viewportRect.right,
          bottom: viewportRect.bottom,
          camera,
        },
        zIndex: startZIndex,
        zoom,
      });
      const targetGroupId = resolveDropTargetGroupId(point);
      const placements = resolveWhiteboardBatchPlacements(
        candidates.map((record) => record.id),
        { x: anchor.x, y: anchor.y },
        startZIndex,
      ).map((entry) => targetGroupId ? { ...entry, groupId: targetGroupId } : entry);
      await whiteboardStore.addRecords(boardId, placements);
    } catch (error) {
      onNotice?.(`批量拖入白板失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      endBusy();
    }
  }, [beginBusy, boardId, boardRecordIds, camera, endBusy, items, onNotice, resolveDropTargetGroupId, storeReady, viewportRef, whiteboardStore, zoom]);

  return { addingRecordIds, addRecord, dropRecords, resolveDropTargetGroupId };
}
