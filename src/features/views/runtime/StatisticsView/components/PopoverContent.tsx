/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem, ViewInstance } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { MarkDoneHandler, OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { BlockView } from '../../BlockView';

export function PopoverContent({
  blocks,
  module,
  timerService,
  onMarkDone,
  timers,
  allThemes,
  messageRenderPort,
  onOpenRecord,
  onOpenRecordOrigin,
  resolveResourcePath,
}: {
  blocks: RecordViewItem[];
  module: ViewInstance;
  timerService: TimerController;
  onMarkDone: MarkDoneHandler;
  timers: any[];
  allThemes: any[];
  messageRenderPort?: MessageRenderPort;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  resolveResourcePath?: ResolveResourcePathHandler;
}) {
  return (
    <div className="sv-popover-content">
      {blocks.length === 0 ? (
        <div class="sv-popover-empty">无内容</div>
      ) : (
        <BlockView
          items={blocks}
          resolveResourcePath={resolveResourcePath}
          onOpenRecordOrigin={onOpenRecordOrigin}
          fields={module.fields || ['title', 'content', 'categoryKey', 'goalPath', 'date', 'period']}
          groupFields={module.groupFields}
          onMarkDone={onMarkDone}
          timerService={timerService}
          timers={timers}
          allThemes={allThemes}
          messageRenderPort={messageRenderPort}
          onOpenRecord={onOpenRecord}
        />
      )}
    </div>
  );
}
