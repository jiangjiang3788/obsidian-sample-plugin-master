type InputLike = HTMLInputElement | HTMLTextAreaElement;

export function readInputValue(event: Event): string {
  return String((event.currentTarget as InputLike | null)?.value ?? '');
}

export function setTextareaAutoHeight(el: HTMLTextAreaElement | null, minHeight: number): void {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
}

export function isComposingKeyboardEvent(event: KeyboardEvent): boolean {
  const nativeEvent = (event as unknown as { nativeEvent?: { isComposing?: boolean } }).nativeEvent;
  return Boolean(event.isComposing || nativeEvent?.isComposing);
}

export function shouldSubmitPlainEnter(event: KeyboardEvent, isMobileLike: boolean): boolean {
  if (isMobileLike) return false;
  return event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey && !isComposingKeyboardEvent(event);
}

export function shouldSubmitShortcutEnter(event: KeyboardEvent, isMobileLike: boolean): boolean {
  if (isMobileLike) return false;
  return (event.metaKey || event.ctrlKey) && event.key === 'Enter' && !isComposingKeyboardEvent(event);
}
