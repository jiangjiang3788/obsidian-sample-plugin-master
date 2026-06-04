import { QuickInputModal } from '@/app/public';
import type { Item } from '@core/public';

export interface EditFromItemParams {
  app: any;
  item: Item;
  openedFrom?: 'list' | 'detail' | 'search' | 'timeline' | 'quickinput' | 'timer' | 'unknown';
}

function supportsTaskTimeEditing(item: Item): boolean {
  return item.type === 'task' || !!(item.startTime || item.endTime || item.duration != null);
}

function deriveEntryContext(item: Item, openedFrom: EditFromItemParams['openedFrom'] = 'unknown') {
  const sourcePath = (item as any).path || (item as any).file?.path || null;
  const sourceLine = typeof (item as any).line === 'number'
    ? (item as any).line
    : typeof (item as any).lineNumber === 'number'
      ? (item as any).lineNumber
      : null;
  return {
    entryKind: item.type === 'task' ? 'task' : 'block',
    entryId: item.id,
    sourcePath,
    sourceLine,
    templateId: item.templateId || null,
    categoryKey: item.categoryKey || null,
    openedFrom: openedFrom || 'unknown',
    supportsTaskTimeEditing: supportsTaskTimeEditing(item),
  };
}

export function openEditFromItem(params: EditFromItemParams): boolean {
  const editContext = {
    __recordUiContext: {
      kind: 'entry_edit',
      entry: deriveEntryContext(params.item, params.openedFrom ?? 'unknown'),
    },
  };

  new QuickInputModal(params.app, params.item.templateId || params.item.categoryKey || '', editContext, undefined, undefined, false, {
    mode: 'edit',
    editItem: params.item,
  }).open();
  return true;
}
