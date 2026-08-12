import { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import type { RecordViewItem } from '@core/types/public';
import type { QuickInputApp } from './recordCreate/types';

export interface EditFromItemParams {
  app: QuickInputApp;
  item: RecordViewItem;
  openedFrom?: 'list' | 'detail' | 'search' | 'timeline' | 'quickinput' | 'timer' | 'unknown';
}


type EditableItemSource = RecordViewItem & { path?: string; file?: { path?: string }; line?: number; lineNumber?: number };

function deriveEntryContext(item: RecordViewItem, openedFrom: EditFromItemParams['openedFrom'] = 'unknown') {
  const source = item as EditableItemSource;
  const sourcePath = source.path || source.file?.path || null;
  const sourceLine = typeof source.line === 'number'
    ? source.line
    : typeof source.lineNumber === 'number'
      ? source.lineNumber
      : null;
  return {
    entryKind: item.coreBlock === 'task' ? 'task' : 'block',
    entryId: item.id,
    sourcePath,
    sourceLine,
    templateId: item.templateId || null,
    categoryKey: item.categoryKey || null,
    openedFrom: openedFrom || 'unknown',
  };
}

export function openEditFromItem(params: EditFromItemParams): boolean {
  const editContext = {
    __recordUiContext: {
      kind: 'entry_edit',
      entry: deriveEntryContext(params.item, params.openedFrom ?? 'unknown'),
    },
  };

  const modalApp = params.app as ConstructorParameters<typeof QuickInputModal>[0];
  new QuickInputModal(modalApp, params.item.templateId || params.item.categoryKey || '', editContext, undefined, undefined, false, {
    mode: 'edit',
    editItem: params.item,
  }).open();
  return true;
}
