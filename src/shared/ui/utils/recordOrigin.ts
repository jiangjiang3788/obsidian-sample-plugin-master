import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordOriginHandler } from '../../types/actions';
import { hasPlatformModifier, isKeyboardActivation, stopInteractionEvent } from './interaction';

interface RecordGestureParams {
  item: RecordViewItem;
  onPrimary?: () => void;
  onOpenOrigin?: OpenRecordOriginHandler;
}

/**
 * One interaction contract for Record-like surfaces across views.
 *
 * Mouse:
 * - single click = primary record action (normally open the Think OS editor)
 * - Ctrl/⌘ + click = open source/origin
 * - double click = open source/origin only (the pending single-click action is cancelled)
 *
 * Keyboard:
 * - Enter / Space = primary action
 * - Ctrl/⌘ + Enter / Space = open source/origin
 *
 * Touch:
 * - normal tap is handled by the synthesized click
 * - double tap = open source/origin and cancel the pending primary action
 *
 * The short single-click delay only applies when an origin action exists. Without a
 * secondary/origin action, primary clicks stay immediate.
 */
export const RECORD_GESTURE_MULTI_ACTIVATION_MS = 320;
export const RECORD_GESTURE_HINT = '点击编辑；Ctrl/⌘+点击或双击打开原文';

export function createRecordGestureHandlers(params: RecordGestureParams) {
  let lastTouchAt = 0;
  let suppressClickUntil = 0;
  let pendingPrimary: ReturnType<typeof setTimeout> | null = null;

  const cancelPendingPrimary = () => {
    if (pendingPrimary !== null) {
      clearTimeout(pendingPrimary);
      pendingPrimary = null;
    }
  };

  const openPrimary = () => {
    params.onPrimary?.();
  };

  const openOrigin = () => {
    if (params.onOpenOrigin) {
      void params.onOpenOrigin(params.item);
      return;
    }
    openPrimary();
  };

  const schedulePrimary = () => {
    cancelPendingPrimary();
    if (!params.onOpenOrigin) {
      openPrimary();
      return;
    }
    pendingPrimary = setTimeout(() => {
      pendingPrimary = null;
      openPrimary();
    }, RECORD_GESTURE_MULTI_ACTIVATION_MS);
  };

  return {
    onClick: (event: any) => {
      stopInteractionEvent(event);
      if (Date.now() < suppressClickUntil) return;

      if (hasPlatformModifier(event)) {
        cancelPendingPrimary();
        openOrigin();
        return;
      }

      schedulePrimary();
    },
    onDblClick: (event: any) => {
      stopInteractionEvent(event);
      cancelPendingPrimary();
      suppressClickUntil = Date.now() + RECORD_GESTURE_MULTI_ACTIVATION_MS;
      openOrigin();
    },
    onTouchEnd: (event: any) => {
      const now = Date.now();
      if (lastTouchAt && now - lastTouchAt <= RECORD_GESTURE_MULTI_ACTIVATION_MS) {
        lastTouchAt = 0;
        cancelPendingPrimary();
        suppressClickUntil = now + RECORD_GESTURE_MULTI_ACTIVATION_MS;
        stopInteractionEvent(event);
        openOrigin();
        return;
      }
      lastTouchAt = now;
    },
    onKeyDown: (event: any) => {
      if (!isKeyboardActivation(event)) return;
      stopInteractionEvent(event);
      cancelPendingPrimary();
      if (hasPlatformModifier(event)) openOrigin();
      else openPrimary();
    },
    cancelPendingPrimary,
  };
}
