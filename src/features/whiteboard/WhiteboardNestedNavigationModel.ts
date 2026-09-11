import type { WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import { getWhiteboardGroupPathIds } from '@core/whiteboard/public';

export type WhiteboardCanvasTarget = string | null;

export interface WhiteboardCanvasNavigationHistory {
  entries: WhiteboardCanvasTarget[];
  index: number;
}

export const WHITEBOARD_CANVAS_HISTORY_LIMIT = 100;

export function createWhiteboardCanvasNavigationHistory(initial: WhiteboardCanvasTarget = null): WhiteboardCanvasNavigationHistory {
  return { entries: [initial], index: 0 };
}

export function pushWhiteboardCanvasNavigation(
  history: WhiteboardCanvasNavigationHistory,
  target: WhiteboardCanvasTarget,
): WhiteboardCanvasNavigationHistory {
  if (history.entries[history.index] === target) return history;
  const entries = [...history.entries.slice(0, history.index + 1), target].slice(-WHITEBOARD_CANVAS_HISTORY_LIMIT);
  return { entries, index: entries.length - 1 };
}

export function stepWhiteboardCanvasNavigation(
  history: WhiteboardCanvasNavigationHistory,
  delta: -1 | 1,
): WhiteboardCanvasNavigationHistory {
  const index = Math.max(0, Math.min(history.entries.length - 1, history.index + delta));
  return index === history.index ? history : { entries: history.entries, index };
}

export function getWhiteboardCanvasNavigationTarget(history: WhiteboardCanvasNavigationHistory): WhiteboardCanvasTarget {
  return history.entries[history.index] ?? null;
}

export function getWhiteboardItemPathLabel(item: WhiteboardItem | null, groups: readonly WhiteboardGroup[]): string {
  if (!item?.groupId) return '白板';
  const byId = new Map(groups.map((group) => [group.id, group]));
  const titles = getWhiteboardGroupPathIds(groups, item.groupId)
    .map((id) => byId.get(id)?.title)
    .filter((title): title is string => Boolean(title));
  return ['白板', ...titles].join(' › ');
}
