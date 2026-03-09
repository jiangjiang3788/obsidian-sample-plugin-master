/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ViewInstance, MessageRenderPort } from '@core/public';
import type { TimerController } from '@/app/public';
import { BlockView } from '../../BlockView';

export function PopoverContent({
  blocks,
  app,
  module,
  timerService,
  timers,
  allThemes,
  messageRenderPort,
}: {
  blocks: Item[];
  app: any;
  module: ViewInstance;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  messageRenderPort?: MessageRenderPort;
}) {
  return (
    <div className="sv-popover-content">
      {blocks.length === 0 ? (
        <div class="sv-popover-empty">无内容</div>
      ) : (
        <BlockView
          items={blocks}
          app={app}
          fields={module.fields || ['title', 'content', 'categoryKey', 'tags', 'date', 'period']}
          groupFields={module.groupFields}
          onMarkDone={() => {}}
          timerService={timerService}
          timers={timers}
          allThemes={allThemes}
          messageRenderPort={messageRenderPort}
        />
      )}
    </div>
  );
}
