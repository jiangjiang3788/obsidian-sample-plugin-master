/** @jsxImportSource preact */
import { Fragment, h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import { TaskRow } from './components/items/TaskRow';
import { BlockItem } from './components/items/BlockItem';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { findBlockViewTimer } from './BlockViewModel';

export interface BlockViewItemListProps {
  items: RecordViewItem[];
  fields: string[];
  resolveResourcePath?: ResolveResourcePathHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  messageRenderPort?: MessageRenderPort;
  onMarkDone: (id: string) => void;
  timerService: TimerController;
  timers: any[];
  onOpenRecord?: OpenRecordHandler;
}

export function BlockViewItemList(props: BlockViewItemListProps) {
  const {
    items,
    fields,
    resolveResourcePath,
    onOpenRecordOrigin,
    messageRenderPort,
    onMarkDone,
    timerService,
    timers,
    onOpenRecord,
  } = props;

  return (
    <Fragment>
      {items.map(item => {
        if (item.coreBlock === 'task') {
          return (
            <TaskRow
              key={item.id}
              item={item}
              onMarkDone={onMarkDone}
              resolveResourcePath={resolveResourcePath}
              onOpenRecordOrigin={onOpenRecordOrigin}
              timerService={timerService}
              timer={findBlockViewTimer(timers, item.id)}
              onOpenRecord={onOpenRecord}
              showFields={[]}
              compact
              listRow
            />
          );
        }

        return (
          <BlockItem
            key={item.id}
            item={item}
            fields={fields}
            resolveResourcePath={resolveResourcePath}
            onOpenRecordOrigin={onOpenRecordOrigin}
            messageRenderPort={messageRenderPort}
            onOpenRecord={onOpenRecord}
          />
        );
      })}
    </Fragment>
  );
}
