import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import { getWhiteboardWorkbenchFrame } from './WhiteboardWorkbenchModel';

export interface WhiteboardBatchRecordPlacement {
  recordId: string;
  position: WhiteboardPosition;
}

const WHITEBOARD_BATCH_GAP_PX = 24;
const WHITEBOARD_BATCH_MAX_COLUMNS = 8;

/** 1.1.6：批量落点从用户 drop world 点开始向右下网格展开，避免卡片完全重叠。 */
export function resolveWhiteboardBatchPlacements(
  recordIds: readonly string[],
  anchor: WhiteboardWorldPoint,
  startZIndex: number,
): WhiteboardBatchRecordPlacement[] {
  if (recordIds.length === 0) return [];
  const columns = Math.min(WHITEBOARD_BATCH_MAX_COLUMNS, Math.max(1, Math.ceil(Math.sqrt(recordIds.length))));
  const stepX = WHITEBOARD_CARD_WIDTH_PX + WHITEBOARD_BATCH_GAP_PX;
  const stepY = WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX + WHITEBOARD_BATCH_GAP_PX;
  return recordIds.map((recordId, index) => ({
    recordId,
    position: {
      x: anchor.x + (index % columns) * stepX,
      y: anchor.y + Math.floor(index / columns) * stepY,
      zIndex: startZIndex + index,
    },
  }));
}

/** “回到画布中心”按当前可见卡片 + Workbench frame 的包围盒；空白板回 world 原点。 */
export function getWhiteboardBoardContentCenter(
  items: readonly WhiteboardItem[],
  groups: readonly WhiteboardGroup[] = [],
  annotations: readonly WhiteboardAnnotation[] = [],
): WhiteboardWorldPoint {
  if (items.length === 0 && groups.length === 0 && annotations.length === 0) return { x: 0, y: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const collapsedGroupIds = new Set(groups.filter((group) => group.collapsed).map((group) => group.id));
  items.forEach((item) => {
    if (item.groupId && collapsedGroupIds.has(item.groupId)) return;
    minX = Math.min(minX, item.x); minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + WHITEBOARD_CARD_WIDTH_PX); maxY = Math.max(maxY, item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX);
  });
  groups.forEach((group) => {
    const frame = getWhiteboardWorkbenchFrame(group, items, groups);
    minX = Math.min(minX, frame.x); minY = Math.min(minY, frame.y);
    maxX = Math.max(maxX, frame.right); maxY = Math.max(maxY, frame.bottom);
  });
  annotations.forEach((annotation) => { minX = Math.min(minX, annotation.x); minY = Math.min(minY, annotation.y); maxX = Math.max(maxX, annotation.x + 260); maxY = Math.max(maxY, annotation.y + (annotation.kind === 'sticky' ? 132 : 48)); });
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}
