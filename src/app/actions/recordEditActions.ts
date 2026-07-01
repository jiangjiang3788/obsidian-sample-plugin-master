import { QuickInputModal } from '@/app/public';
import type { Item } from '@core/types/public';

export interface EditFromItemParams {
  app: any;
  item: Item;
  openedFrom?: 'list' | 'detail' | 'search' | 'timeline' | 'quickinput' | 'timer' | 'unknown';
}

function supportsTaskTimeEditing(item: Item): boolean {
  return item.type === 'task' || !!(item.startTime || item.endTime || item.duration != null);
}

type EditableItemSource = Item & { path?: string; file?: { path?: string }; line?: number; lineNumber?: number };

function deriveEntryContext(item: Item, openedFrom: EditFromItemParams['openedFrom'] = 'unknown') {
  const source = item as EditableItemSource;
  const sourcePath = source.path || source.file?.path || null;
  const sourceLine = typeof source.line === 'number'
    ? source.line
    : typeof source.lineNumber === 'number'
      ? source.lineNumber
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
