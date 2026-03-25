import { makeObsUri, type Item } from '@core/public';

interface RecordGestureParams {
  item: Item;
  app: any;
  onPrimary?: () => void;
}

export function openRecordOrigin(item: Item, app: any): void {
  const uri = makeObsUri(item, app?.vault?.getName?.() || '');
  window.open(uri, '_blank');
}

export function createRecordGestureHandlers(params: RecordGestureParams) {
  let lastTouchAt = 0;
  let suppressClickUntil = 0;

  const openOrigin = () => openRecordOrigin(params.item, params.app);

  return {
    onClick: (event: any) => {
      if (Date.now() < suppressClickUntil) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        return;
      }
      if (event?.ctrlKey || event?.metaKey) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        openOrigin();
        return;
      }
      event?.preventDefault?.();
      event?.stopPropagation?.();
      params.onPrimary?.();
    },
    onDblClick: (event: any) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      suppressClickUntil = Date.now() + 400;
      openOrigin();
    },
    onTouchEnd: (event: any) => {
      const now = Date.now();
      if (lastTouchAt && now - lastTouchAt <= 350) {
        lastTouchAt = 0;
        suppressClickUntil = now + 400;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        openOrigin();
        return;
      }
      lastTouchAt = now;
    },
  };
}
