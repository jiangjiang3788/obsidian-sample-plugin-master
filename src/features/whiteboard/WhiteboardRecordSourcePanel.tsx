/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import { ThinkButton, ThinkCheckbox, ThinkInput } from '@shared/ui/public';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';
import { WhiteboardRecordFilters } from './WhiteboardRecordFilters';
import {
  collectWhiteboardGoalTree,
  collectWhiteboardRecordTypeOptions,
  queryWhiteboardRecordSource,
  type WhiteboardRecordSourceState,
} from './WhiteboardRecordSourceQuery';
import {
  pruneWhiteboardRecordSelection,
  resolveWhiteboardSourceDragRecords,
  selectAllWhiteboardRecordIds,
  toggleWhiteboardRecordSelection,
} from './WhiteboardRecordSelectionModel';
import {
  createWhiteboardSourceDragSession,
  isWhiteboardSourceDragActivated,
  type WhiteboardClientPoint,
  type WhiteboardSourceDragSession,
} from './WhiteboardTransferModel';

export interface WhiteboardRecordSourcePanelProps {
  records: RecordViewItem[];
  boardRecordIds: ReadonlySet<string>;
  onAdd: (record: RecordViewItem) => void | Promise<void>;
  onDropRecords?: (records: RecordViewItem[], point: WhiteboardClientPoint) => void | Promise<void>;
  onDragRecordPreview?: (preview: { records: RecordViewItem[]; point: WhiteboardClientPoint } | null) => void;
  onSourceElementChange?: (element: HTMLElement | null) => void;
  addingRecordIds?: ReadonlySet<string>;
  removalDropActive?: boolean;
}

interface ActiveSourceDrag {
  originRecordId: string;
  records: RecordViewItem[];
  session: WhiteboardSourceDragSession;
  active: boolean;
  target: HTMLElement | null;
}

const EMPTY_SOURCE_STATE: WhiteboardRecordSourceState = {
  keyword: '',
  recordTypes: [],
  goalPaths: [],
  time: null,
};

/** 1.1.6：左侧查询结果支持多选、全选当前结果，并保持 1.1.2 Pointer drag 语义。 */
export function WhiteboardRecordSourcePanel({
  records,
  boardRecordIds,
  onAdd,
  onDropRecords,
  onDragRecordPreview,
  onSourceElementChange,
  addingRecordIds = new Set(),
  removalDropActive = false,
}: WhiteboardRecordSourcePanelProps) {
  const [sourceState, setSourceState] = useState<WhiteboardRecordSourceState>(EMPTY_SOURCE_STATE);
  const [selectedRecordIds, setSelectedRecordIds] = useState<ReadonlySet<string>>(() => new Set());
  const [draggingRecordId, setDraggingRecordId] = useState<string | null>(null);
  const dragRef = useRef<ActiveSourceDrag | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const recordTypeOptions = useMemo(() => collectWhiteboardRecordTypeOptions(records), [records]);
  const goalTree = useMemo(() => collectWhiteboardGoalTree(records), [records]);
  const queryResult = useMemo(
    () => queryWhiteboardRecordSource(records, sourceState, boardRecordIds),
    [boardRecordIds, records, sourceState],
  );
  const selectionBusy = addingRecordIds.size > 0;
  const allResultsSelected = queryResult.matchedItems.length > 0
    && queryResult.matchedItems.every((record) => selectedRecordIds.has(record.id));

  useEffect(() => {
    setSelectedRecordIds((current) => pruneWhiteboardRecordSelection(current, queryResult.matchedItems));
  }, [queryResult.matchedItems]);

  const clearSourceDragListeners = () => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
  };

  const finishSourceDrag = (event: PointerEvent, cancelled = false) => {
    const current = dragRef.current;
    if (!current || current.session.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    clearSourceDragListeners();
    try { current.target?.releasePointerCapture?.(event.pointerId); } catch { /* host may already release capture */ }
    setDraggingRecordId(null);
    onDragRecordPreview?.(null);

    if (cancelled || !current.active) return;
    event.preventDefault();
    const point = { clientX: event.clientX, clientY: event.clientY };
    void Promise.resolve(onDropRecords?.(current.records, point)).catch(() => undefined);
  };

  const moveSourceDrag = (event: PointerEvent) => {
    const current = dragRef.current;
    if (!current || current.session.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const point = { clientX: event.clientX, clientY: event.clientY };
    if (!current.active && !isWhiteboardSourceDragActivated(current.session, point)) return;
    event.preventDefault();
    current.active = true;
    setDraggingRecordId(current.originRecordId);
    onDragRecordPreview?.({ records: current.records, point });
  };

  const beginSourceDrag = (record: RecordViewItem, disabled: boolean, event: PointerEvent) => {
    if (disabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const targetElement = event.target as Element | null;
    if (targetElement?.closest('button, input, select, textarea, a')) return;

    event.stopPropagation();
    clearSourceDragListeners();
    const target = event.currentTarget as HTMLElement;
    dragRef.current = {
      originRecordId: record.id,
      records: resolveWhiteboardSourceDragRecords(record, selectedRecordIds, queryResult.matchedItems),
      session: createWhiteboardSourceDragSession(event.pointerId, event.clientX, event.clientY),
      active: false,
      target,
    };
    try { target.setPointerCapture?.(event.pointerId); } catch { /* optional in host */ }

    const move = (nextEvent: PointerEvent) => moveSourceDrag(nextEvent);
    const up = (nextEvent: PointerEvent) => finishSourceDrag(nextEvent, false);
    const cancel = (nextEvent: PointerEvent) => finishSourceDrag(nextEvent, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
  };

  useEffect(() => () => {
    clearSourceDragListeners();
    dragRef.current = null;
    onDragRecordPreview?.(null);
  }, [onDragRecordPreview]);

  return (
    <aside
      class={`think-whiteboard-source${removalDropActive ? ' is-remove-drop-target' : ''}`}
      aria-label="搜索记录"
      data-whiteboard-source-dropzone="true"
      ref={(element) => onSourceElementChange?.(element)}
    >
      <div class="think-whiteboard-source__search-zone" role="search" aria-label="搜索全部记录">
        <ThinkInput
          className="think-whiteboard-source__search"
          value={sourceState.keyword}
          placeholder="搜索记录"
          aria-label="搜索记录"
          onInput={(event: Event) => setSourceState((current) => ({
            ...current,
            keyword: (event.currentTarget as HTMLInputElement).value,
          }))}
        />
      </div>

      <WhiteboardRecordFilters
        recordTypeOptions={recordTypeOptions}
        selectedRecordTypes={sourceState.recordTypes}
        onRecordTypesChange={(recordTypes) => setSourceState((current) => ({ ...current, recordTypes }))}
        goalTree={goalTree}
        selectedGoalPaths={sourceState.goalPaths}
        onGoalPathsChange={(goalPaths) => setSourceState((current) => ({ ...current, goalPaths }))}
        time={sourceState.time}
        onTimeChange={(time) => setSourceState((current) => ({ ...current, time }))}
        dateError={queryResult.dateError}
      />

      <div class="think-whiteboard-source__selection-bar" aria-label="记录批量选择">
        <ThinkButton
          size="sm"
          variant="secondary"
          disabled={queryResult.matchedItems.length === 0 || selectionBusy}
          onClick={() => setSelectedRecordIds(allResultsSelected ? new Set() : selectAllWhiteboardRecordIds(queryResult.matchedItems))}
        >{allResultsSelected ? '取消全选' : '全选结果'}</ThinkButton>
        <span class="think-whiteboard-source__selection-count" aria-live="polite">已选 {selectedRecordIds.size}</span>
        {selectedRecordIds.size > 0 && (
          <ThinkButton size="sm" variant="ghost" disabled={selectionBusy} onClick={() => setSelectedRecordIds(new Set())}>清空</ThinkButton>
        )}
      </div>

      <div class="think-whiteboard-source__results">
        {queryResult.visibleItems.map((record) => {
          const presentation = buildWhiteboardRecordPresentation(record);
          const adding = addingRecordIds.has(record.id);
          const selected = selectedRecordIds.has(record.id);
          const isDragging = draggingRecordId === record.id;
          return (
            <div
              class={`think-whiteboard-source__row${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
              key={record.id}
              data-record-type={record.coreBlock}
              data-whiteboard-source-record-id={record.id}
              data-whiteboard-source-selected={selected ? 'true' : 'false'}
              data-whiteboard-source-draggable={selectionBusy ? 'false' : 'true'}
              title={selected ? '拖动这一条即可把全部已选记录一起加入白板' : '拖到右侧白板指定位置加入；也可以点击加入'}
              onPointerDown={((event: PointerEvent) => beginSourceDrag(record, selectionBusy, event)) as never}
            >
              <div class="think-whiteboard-source__select" onPointerDown={((event: PointerEvent) => event.stopPropagation()) as never}>
                <ThinkCheckbox
                  compact
                  label=""
                  aria-label={`选择 ${presentation.primaryText}`}
                  checked={selected}
                  disabled={selectionBusy}
                  onChange={() => setSelectedRecordIds((current) => toggleWhiteboardRecordSelection(current, record.id))}
                />
              </div>
              <div class="think-whiteboard-source__row-main">
                <div class="think-whiteboard-source__row-heading">
                  <span class="think-whiteboard-source__type">{presentation.typeLabel}</span>
                  <span class="think-whiteboard-source__row-title">{presentation.primaryText}</span>
                </div>
                <div class="think-whiteboard-source__row-meta">
                  {[presentation.temporalLabel, presentation.goalLabel, ...presentation.detailLabels].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div class="think-whiteboard-source__row-action" onPointerDown={((event: PointerEvent) => event.stopPropagation()) as never}>
                <ThinkButton size="sm" variant="secondary" disabled={selectionBusy} onClick={() => void onAdd(record)}>
                  {adding ? '加入中…' : '加入'}
                </ThinkButton>
              </div>
            </div>
          );
        })}
      </div>

      {removalDropActive && (
        <div class="think-whiteboard-source__remove-drop-overlay" aria-hidden="true">
          <strong>← 松开移出白板</strong>
          <span>原 Record / Markdown 不会删除</span>
        </div>
      )}
    </aside>
  );
}
