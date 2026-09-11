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
  const [records, setRecords] = useState<RecordViewItem[]>(() => dataStore.queryRecords());

  useEffect(() => {
    const sync = () => setRecords(dataStore.queryRecords());
    dataStore.subscribe(sync);
    sync();
    return () => dataStore.unsubscribe(sync);
  }, [dataStore]);

  const onOpenRecord = useCallback((item: RecordViewItem) => {
    const canonical = dataStore.getRecordById(item.id);
    openEditFromItem({ app, item: mergeRecordItemForEdit(canonical, item) });
  }, [app, dataStore]);

  const onOpenRecordOrigin = useCallback((item: RecordViewItem) => {
    openRecordOrigin({ app, item: dataStore.getRecordById(item.id) ?? item });
  }, [app, dataStore]);

  return (
    <div class="think-os think-os--whiteboard">
      <WhiteboardWorkspace
        records={records}
        whiteboardStore={whiteboardStore}
        onOpenRecord={onOpenRecord}
        onOpenRecordOrigin={onOpenRecordOrigin}
        onNotice={(message) => ui.notice(message)}
      />
    </div>
  );
}
