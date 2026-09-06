import { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import type { RecordViewItem } from '@core/types/public';
import type { QuickInputApp } from './recordCreate/types';

export interface EditFromItemParams {
  app: QuickInputApp;
  item: RecordViewItem;
  openedFrom?: 'list' | 'detail' | 'search' | 'timeline' | 'quickinput' | 'timer' | 'unknown';
}


type EditableItemSource = RecordViewItem & { path?: string; file?: { path?: string }; line?: number; lineNumber?: number };


function firstNonBlank(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

/**
 * Merge a canonical datastore Record with the projection a View rendered.
 *
 * Matrix/Table and other projections are allowed to be lean, but the edit
 * boundary must always hand QuickInput a semantically complete Record.  In
 * particular, historical Task projections may display content that is absent
 * from a stale canonical cache entry; editing should never open an empty form
 * merely because one projection omitted the body text.
 */
export function mergeRecordItemForEdit(
  canonical: RecordViewItem | null | undefined,
  rendered: RecordViewItem,
): RecordViewItem {
  const primary = canonical ?? rendered;
  const extra = { ...(rendered.extra || {}), ...(primary.extra || {}) };
  const editableText = firstNonBlank(
    primary.editableText,
    primary.content,
    rendered.editableText,
    rendered.content,
    rendered.title,
    primary.title,
    extra['正文'],
    extra['内容'],
  );
  const content = firstNonBlank(
    primary.content,
    primary.editableText,
    rendered.content,
    rendered.editableText,
    rendered.title,
    primary.title,
    extra['内容'],
    extra['正文'],
  );
  const title = firstNonBlank(primary.title, rendered.title, content, editableText) ?? '';

  return {
    ...rendered,
    ...primary,
    coreBlock: primary.coreBlock || rendered.coreBlock,
    categoryKey: primary.categoryKey || rendered.categoryKey,
    goalPath: primary.goalPath || rendered.goalPath,
    title,
    ...(content ? { content } : null),
    ...(editableText ? { editableText } : null),
    extra,
  };
}

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
    categoryKey: item.categoryKey || null,
    openedFrom: openedFrom || 'unknown',
  };
}

export function openEditFromItem(params: EditFromItemParams): boolean {
  const item = mergeRecordItemForEdit(undefined, params.item);
  const editContext = {
    __recordUiContext: {
      kind: 'entry_edit',
      entry: deriveEntryContext(item, params.openedFrom ?? 'unknown'),
    },
  };

  const modalApp = params.app as ConstructorParameters<typeof QuickInputModal>[0];
  const blockId = item.coreBlock ? `core.${String(item.coreBlock).replace(/^core\./, '')}` : '';
  new QuickInputModal(modalApp, blockId, editContext, undefined, false, {
    mode: 'edit',
    editItem: item,
  }).open();
  return true;
}
