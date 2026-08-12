/** Shared low-level interaction helpers used by every view surface. */

export function hasPlatformModifier(event?: { ctrlKey?: boolean; metaKey?: boolean } | null): boolean {
  return Boolean(event?.ctrlKey || event?.metaKey);
}

export function stopInteractionEvent(event?: any): void {
  event?.preventDefault?.();
  event?.stopPropagation?.();
}

export function isKeyboardActivation(event?: { key?: string } | null): boolean {
  return event?.key === 'Enter' || event?.key === ' ';
}
