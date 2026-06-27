/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ThemeDefinition } from '@core/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '../../types/actions';
import { TaskRow } from '../items/TaskRow';
import { ItemLink } from '../items/ItemLink';
import { findTableViewTimer } from './TableViewModel';

export interface TableViewCellProps {
  items: Item[];
  onMarkDone: (id: string) => void;
  resolveResourcePath?: ResolveResourcePathHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: ThemeDefinition[];
  onOpenRecord?: OpenRecordHandler;
}

export function TableViewCell(props: TableViewCellProps) {
  const {
    items,
    onMarkDone,
    resolveResourcePath,
    onOpenRecordOrigin,
    timerService,
    timers,
    allThemes,
    onOpenRecord,
  } = props;

  if (!items.length) return <td class="empty" />;

  return (
    <td>
      {items.map(item => (
        <div key={item.id} class="think-table-cell-item">
          {item.type === 'task' ? (
            <TaskRow
              item={item}
              onMarkDone={onMarkDone}
              resolveResourcePath={resolveResourcePath}
              onOpenRecordOrigin={onOpenRecordOrigin}
              timerService={timerService}
              timer={findTableViewTimer(timers, item.id)}
              allThemes={allThemes}
              compact={true}
              onOpenRecord={onOpenRecord}
            />
          ) : (
            <ItemLink item={item} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />
          )}
        </div>
      ))}
    </td>
  );
}
