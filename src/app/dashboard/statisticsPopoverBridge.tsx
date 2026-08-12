// src/features/settings/layout/statisticsPopoverBridge.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { IconButton, Tooltip } from '@shared/ui/public';
import type { CloseStatisticsPopoverHandler, OpenStatisticsPopoverHandler } from '@shared/types/public';
import { AddCircleOutlineIcon, IosShareIcon } from '@shared/ui/public';
import { PopoverContent } from '@features/views/public';
import FloatingPanel from '@/app/ui/primitives/FloatingPanel';
import { openFloatingWidget, closeFloatingWidget } from '@/app/ui/widgets/FloatingWidgetManager';

// 解决 Preact 和 Material-UI 的类型兼容性问题。
const AnyIconButton = IconButton as any;

export const closeStatisticsPopover: CloseStatisticsPopoverHandler = (widgetId) => {
  closeFloatingWidget(widgetId);
};

export const openStatisticsPopover: OpenStatisticsPopoverHandler = (request) => {
  openFloatingWidget(request.widgetId, () => (
    <FloatingPanel
      id={request.widgetId}
      title={request.title}
      defaultPosition={{ x: window.innerWidth / 2 - 320, y: window.innerHeight / 2 - 240 }}
      minWidth={520}
      maxWidth="90vw"
      maxHeight="85vh"
      width={760}
      height={640}
      resizable
      bodyPadding={0}
      bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      onClose={request.onClose}
      headerActions={(
        <div class="sv-popover-heading">
          <Tooltip title="导出为 Markdown" PopperProps={{ disablePortal: true }}>
            <AnyIconButton
              size="small"
              onClick={(e: any) => {
                e.stopPropagation();
                request.onExport();
              }}
              sx={{ padding: '4px' }}
            >
              <IosShareIcon sx={{ fontSize: '1rem' }} />
            </AnyIconButton>
          </Tooltip>
          {request.canQuickCreate && request.onQuickCreate ? (
            <Tooltip title="按当前分类创建" PopperProps={{ disablePortal: true }}>
              <AnyIconButton
                size="small"
                onClick={(e: any) => {
                  e.stopPropagation();
                  request.onQuickCreate?.();
                }}
                sx={{ padding: '4px' }}
              >
                <AddCircleOutlineIcon sx={{ fontSize: '1rem' }} />
              </AnyIconButton>
            </Tooltip>
          ) : null}
        </div>
      )}
    >
      <PopoverContent
        blocks={request.blocks}
        module={request.module}
        timerService={request.timerService}
        timers={request.timers}
        allThemes={request.allThemes}
        messageRenderPort={request.messageRenderPort}
        onOpenRecord={request.onOpenRecord}
        onOpenRecordOrigin={request.onOpenRecordOrigin}
        resolveResourcePath={request.resolveResourcePath}
      />
    </FloatingPanel>
  ));
};
