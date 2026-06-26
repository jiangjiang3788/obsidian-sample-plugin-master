export function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && !!target.closest('input, textarea, select, button, a, [contenteditable="true"]');
}

/**
 * Obsidian preview embeds can treat repeated clicks/double-clicks inside a rendered
 * markdown block as an intent to switch the whole block back to Markdown editing.
 * UI controls rendered by the plugin should therefore stop pointer/mouse/click
 * events at the component boundary.
 */
export function stopObsidianPreviewEvent(event: Event): void {
  event.stopPropagation();
}

export function stopObsidianPreviewDoubleClick(event: MouseEvent): void {
  event.stopPropagation();
  if (!isNativeInteractiveTarget(event.target)) {
    event.preventDefault();
  }
}

export function stopObsidianPreviewEventAndRun<T extends Event>(event: T, action: () => void): void {
  event.stopPropagation();
  action();
}

export function getObsidianEventBoundaryProps() {
  return {
    onPointerDown: stopObsidianPreviewEvent as any,
    onMouseDown: stopObsidianPreviewEvent as any,
    onMouseUp: stopObsidianPreviewEvent as any,
    onClick: stopObsidianPreviewEvent as any,
    onDblClick: stopObsidianPreviewDoubleClick as any,
  };
}
