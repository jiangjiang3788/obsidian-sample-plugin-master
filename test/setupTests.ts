// Jest setup (kept intentionally minimal)
// tsyringe requires reflect-metadata to be loaded before any imports that use decorators/DI.
import 'reflect-metadata';

// Add global mocks / matchers here when needed.

// Older Jest/jsdom runtimes used by some local Obsidian dev environments do not expose structuredClone.
if (typeof globalThis.structuredClone !== 'function') {
  (globalThis as any).structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}


// jsdom 20 does not implement PointerEvent. Whiteboard/Timeline gestures are pointer-event
// contracts in the real browser, so tests use a small MouseEvent-compatible polyfill instead
// of fabricating plain Event objects with ad-hoc properties.
if (typeof globalThis.PointerEvent !== 'function') {
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    readonly width: number;
    readonly height: number;
    readonly pressure: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
      this.width = init.width ?? 1;
      this.height = init.height ?? 1;
      this.pressure = init.pressure ?? (init.buttons ? 0.5 : 0);
    }
  }
  (globalThis as any).PointerEvent = TestPointerEvent;
}
