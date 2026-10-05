import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordOriginHandler } from '../../types/actions';
import { hasPlatformModifier, isKeyboardActivation, stopInteractionEvent } from './interaction';

interface RecordGestureParams {
  item: RecordViewItem;
  onPrimary?: () => void;
  onOpenOrigin?: OpenRecordOriginHandler;
  /** Timeline-style surfaces can use modifier-only origin opening so the primary activation stays unambiguous. */
  originActivation?: 'modifier-and-double' | 'modifier-only';
  /**
   * Most Record surfaces use a single click for the primary action. Direct-manipulation
   * surfaces (for example Timeline) can reserve single click/tap for selection/scrolling
   * and require a deliberate double activation instead.
   */
  primaryActivation?: 'single' | 'double';
}

/**
 * One interaction contract for Record-like surfaces across views.
 *
 * Default mouse contract:
 * - single click = primary record action (normally open the Think OS editor)
 * - Ctrl/⌘ + click = open source/origin
 * - double click = open source/origin only (the pending single-click action is cancelled)
 *
 * Direct-manipulation surfaces may opt into `primaryActivation: 'double'`:
 * - single click/tap = no primary action
 * - double click/double tap = primary action
 * - Ctrl/⌘ + click = open source/origin
 *
 * Keyboard is intentionally unchanged in either mode:
 * - Enter / Space = primary action
 * - Ctrl/⌘ + Enter / Space = open source/origin
 *
 * The short single-click delay only applies when an origin action exists and the
 * surface uses the default single-click primary contract.
 */
export const RECORD_GESTURE_MULTI_ACTIVATION_MS = 320;
export const RECORD_GESTURE_HINT = '点击编辑；按住控制键或⌘键点击，或双击打开原文';
export const RECORD_MODIFIER_ORIGIN_HINT = '点击编辑；按住控制键或⌘键点击打开原文';
export const RECORD_DOUBLE_PRIMARY_HINT = '双击编辑；按住控制键或⌘键点击打开原文';

export function createRecordGestureHandlers(params: RecordGestureParams) {
  let lastTouchAt = 0;
  let suppressClickUntil = 0;
  let pendingPrimary: ReturnType<typeof setTimeout> | null = null;
  const originActivation = params.originActivation ?? 'modifier-and-double';
  const primaryActivation = params.primaryActivation ?? 'single';

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
    if (!params.onOpenOrigin || originActivation === 'modifier-only') {
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

      // In direct-manipulation surfaces a single activation is intentionally inert.
      // This prevents click-to-edit from racing with drag/resize/scroll semantics.
      if (primaryActivation === 'double') return;
      schedulePrimary();
    },
    onDblClick: (event: any) => {
      stopInteractionEvent(event);
      // A touch double-activation may be followed by a synthesized dblclick in
      // some WebViews. The touch path has already committed the action, so the
      // synthetic mouse-compatible event must be consumed rather than repeated.
      if (Date.now() < suppressClickUntil) return;
      cancelPendingPrimary();

      if (primaryActivation === 'double') {
        suppressClickUntil = Date.now() + RECORD_GESTURE_MULTI_ACTIVATION_MS;
        openPrimary();
        return;
      }

      if (originActivation === 'modifier-only') return;
      suppressClickUntil = Date.now() + RECORD_GESTURE_MULTI_ACTIVATION_MS;
      openOrigin();
    },
    onTouchEnd: (event: any) => {
      const now = Date.now();
      const isDoubleTouch = !!lastTouchAt && now - lastTouchAt <= RECORD_GESTURE_MULTI_ACTIVATION_MS;

      if (primaryActivation === 'double') {
        if (isDoubleTouch) {
          lastTouchAt = 0;
          cancelPendingPrimary();
          suppressClickUntil = now + RECORD_GESTURE_MULTI_ACTIVATION_MS;
          stopInteractionEvent(event);
          openPrimary();
          return;
        }
        lastTouchAt = now;
        return;
      }

      if (originActivation !== 'modifier-only' && isDoubleTouch) {
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
