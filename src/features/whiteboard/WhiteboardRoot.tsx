/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import { useDataStore, useUiPort, useWhiteboardStore } from '@/app/public';
import { mergeRecordItemForEdit, openEditFromItem, openRecordOrigin } from '@/app/public';
import { WhiteboardWorkspace } from './WhiteboardWorkspace';

type WhiteboardHostApp = Parameters<typeof openEditFromItem>[0]['app'];

export function WhiteboardRoot({ app }: { app: WhiteboardHostApp }) {
  const dataStore = useDataStore();
  const whiteboardStore = useWhiteboardStore();
  const ui = useUiPort();
  const [records, setRecords] = useState<RecordViewItem[]>(() => dataStore.queryItems());
  const [sourceRecords, setSourceRecords] = useState<RecordViewItem[]>(() => dataStore.queryRecords());

  useEffect(() => {
    let normalizing = false;
    const sync = () => {
      setRecords(dataStore.queryItems());
      setSourceRecords(dataStore.queryRecords());
      if (normalizing || whiteboardStore.getStatus().state !== 'ready') return;
      const replacements: Record<string, string> = {};
      const allRecords = dataStore.queryRecords();
      const byId = new Map(allRecords.map((record) => [record.id, record]));
      for (const record of allRecords) {
        const targetId = record.recordType === 'task-session'
          ? String(record.taskId || '').trim()
          : record.recordType === 'task-series'
            ? String(record.currentTaskId || '').trim()
            : '';
        if (!targetId || byId.get(targetId)?.recordType !== 'task') continue;
        replacements[record.id] = targetId;
      }
      if (Object.keys(replacements).length === 0) return;
      normalizing = true;
      void whiteboardStore.normalizeRecordReferences(replacements)
        .finally(() => { normalizing = false; });
    };
    dataStore.subscribe(sync);
    const unsubscribeWhiteboard = whiteboardStore.subscribe(sync);
    sync();
    return () => { dataStore.unsubscribe(sync); unsubscribeWhiteboard(); };
  }, [dataStore, whiteboardStore]);

  const onOpenRecord = useCallback((item: RecordViewItem) => {
    const canonical = dataStore.getRecordById(item.id);
    openEditFromItem({ app, item: mergeRecordItemForEdit(canonical, item), resolveRecordById: (id) => dataStore.getRecordById(id) });
  }, [app, dataStore]);

  const onOpenRecordOrigin = useCallback((item: RecordViewItem) => {
    openRecordOrigin({ app, item: dataStore.getRecordById(item.id) ?? item });
  }, [app, dataStore]);

  return (
    <div class="think-os think-os--whiteboard">
      <WhiteboardWorkspace
        records={records}
        sourceRecords={sourceRecords}
        whiteboardStore={whiteboardStore}
        onOpenRecord={onOpenRecord}
        onOpenRecordOrigin={onOpenRecordOrigin}
        onNotice={(message) => ui.notice(message)}
      />
    </div>
  );
}
