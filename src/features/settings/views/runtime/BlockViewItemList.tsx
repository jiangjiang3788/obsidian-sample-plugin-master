/** @jsxImportSource preact */
import { Fragment, h } from 'preact';
import type { Item, ThemeDefinition } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import { TaskRow } from './components/items/TaskRow';
import { BlockItem } from './components/items/BlockItem';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { findBlockViewTimer } from './BlockViewModel';

export interface BlockViewItemListProps {
  items: Item[];
  fields: string[];
  isNarrow: boolean;
  resolveResourcePath?: ResolveResourcePathHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  messageRenderPort?: MessageRenderPort;
  onMarkDone: (id: string) => void;
  timerService: TimerController;
  timers: any[];
  allThemes: ThemeDefinition[];
  onOpenRecord?: OpenRecordHandler;
}

export function BlockViewItemList(props: BlockViewItemListProps) {
  const {
    items,
    fields,
    isNarrow,
    resolveResourcePath,
    onOpenRecordOrigin,
    messageRenderPort,
    onMarkDone,
    timerService,
    timers,
    allThemes,
    onOpenRecord,
  } = props;

  return (
    <Fragment>
      {items.map(item => {
        if (item.type === 'task') {
          return (
            <TaskRow
              key={item.id}
              item={item}
              onMarkDone={onMarkDone}
              resolveResourcePath={resolveResourcePath}
              onOpenRecordOrigin={onOpenRecordOrigin}
              timerService={timerService}
              timer={findBlockViewTimer(timers, item.id)}
              allThemes={allThemes}
              onOpenRecord={onOpenRecord}
              showFields={[]}
            />
          );
        }

        return (
          <BlockItem
            key={item.id}
            item={item}
            fields={fields}
            isNarrow={isNarrow}
            resolveResourcePath={resolveResourcePath}
            onOpenRecordOrigin={onOpenRecordOrigin}
            messageRenderPort={messageRenderPort}
            allThemes={allThemes}
            onOpenRecord={onOpenRecord}
          />
        );
      })}
    </Fragment>
  );
}
