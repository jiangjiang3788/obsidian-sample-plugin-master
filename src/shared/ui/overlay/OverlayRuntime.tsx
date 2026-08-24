/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

/**
 * One runtime stack for every top-level Think OS overlay.
 *
 * The stack is order-based rather than counter-based: focusing an overlay moves
 * it to the end of the active order, so z-index never grows without bound and
 * no feature owns a competing "magic" z-index range.
 */
const OVERLAY_BASE_Z_INDEX = 10_000;
const OVERLAY_HOST_ID = 'think-overlay-host';

const activeOrder: string[] = [];
const listeners = new Set<() => void>();
let overlaySequence = 0;
let scrollLockCount = 0;
let bodyOverflowBeforeLock = '';

function notify(): void {
  listeners.forEach((listener) => listener());
}

function removeFromOrder(id: string): boolean {
  const index = activeOrder.indexOf(id);
  if (index < 0) return false;
  activeOrder.splice(index, 1);
  return true;
}

export function registerOverlay(id: string): void {
  if (!id) return;
  removeFromOrder(id);
  activeOrder.push(id);
  notify();
}

export function unregisterOverlay(id: string): void {
  if (removeFromOrder(id)) notify();
}

export function focusOverlay(id: string): void {
  if (!id || activeOrder[activeOrder.length - 1] === id) return;
  if (!removeFromOrder(id)) return;
  activeOrder.push(id);
  notify();
}

export function isTopOverlay(id: string): boolean {
  return Boolean(id) && activeOrder[activeOrder.length - 1] === id;
}

export function getOverlayZIndex(id: string): number {
  const index = activeOrder.indexOf(id);
  return OVERLAY_BASE_Z_INDEX + Math.max(0, index);
}

export function subscribeOverlayStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOverlayHost(): HTMLElement {
  const existing = document.getElementById(OVERLAY_HOST_ID);
  if (existing) return existing;
  const host = document.createElement('div');
  host.id = OVERLAY_HOST_ID;
  host.className = 'think-overlay-host';
  document.body.appendChild(host);
  return host;
}

export function acquireOverlayScrollLock(): () => void {
  if (typeof document === 'undefined') return () => void 0;
  if (scrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = bodyOverflowBeforeLock;
  };
}

export interface OverlayLayerState {
  id: string;
  zIndex: number;
  isTop: boolean;
  focus: () => void;
}

export function useOverlayLayer(active = true, debugName = 'overlay'): OverlayLayerState {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = `${debugName}:${++overlaySequence}`;
  const id = idRef.current;
  const [, setRevision] = useState(0);

  useEffect(() => subscribeOverlayStack(() => setRevision((value) => value + 1)), []);

  useEffect(() => {
    if (!active) {
      unregisterOverlay(id);
      return;
    }
    registerOverlay(id);
    return () => unregisterOverlay(id);
  }, [active, id]);

  const focus = useCallback(() => {
    if (active) focusOverlay(id);
  }, [active, id]);

  return {
    id,
    zIndex: getOverlayZIndex(id),
    isTop: active && isTopOverlay(id),
    focus,
  };
}

export function OverlayPortal({ children, container }: { children: ComponentChildren; container?: Element | null }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, container || getOverlayHost());
}
