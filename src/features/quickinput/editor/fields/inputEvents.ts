type InputLike = HTMLInputElement | HTMLTextAreaElement;

// The editor publishes GoalTemplate defaults to its save owner synchronously,
// before Preact necessarily paints them into the focused native input. Keep the
// last value actually rendered to each control so an old DOM snapshot cannot
// overwrite a newer draft. Weak keys avoid retaining detached modal controls.
const renderedValueByControl = new WeakMap<InputLike, string>();

export function rememberQuickInputRenderedValue(control: InputLike | null, renderedValue: string): void {
  if (control) renderedValueByControl.set(control, renderedValue);
}

/**
 * Blur/change only reconciles a native edit which differs from the last render.
 * Real input/composition events still commit directly, including a user clear.
 */
export function shouldCommitQuickInputPassiveValue(event: Event): boolean {
  const control = event.currentTarget as InputLike | null;
  if (!control) return false;
  const renderedValue = renderedValueByControl.get(control);
  return renderedValue === undefined || control.value !== renderedValue;
}

export function readInputValue(event: Event): string {
  return String((event.currentTarget as InputLike | null)?.value ?? '');
}

/**
 * Mobile dictation sometimes updates a native control before its final input/
 * change event reaches Preact. Reconcile only the *visible* native text fields
 * at the save boundary; never infer record fields from labels or DOM order.
 * This is the same draft, not a second persistence store.
 */
export function readLatestQuickInputTextFields(
  root: Element | null,
  formData: Record<string, unknown>,
  fieldSources: Record<string, string> = {},
): { formData: Record<string, unknown>; changedKeys: string[] } {
  if (!root) return { formData, changedKeys: [] };
  let next = formData;
  const changedKeys: string[] = [];
  const controls = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'textarea[data-quick-input-field-key], input[type="text"][data-quick-input-field-key]',
  );
  controls.forEach((control) => {
    const key = control.getAttribute('data-quick-input-field-key');
    if (!key) return;
    const storedValue = Array.isArray(next[key]) ? next[key].join('\n') : String(next[key] ?? '');
    if (control.value === storedValue) return;
    // A freshly selected Goal can update the canonical draft before its text
    // control has re-rendered. This applies to *focused* controls (Save uses
    // preventDefault on pointerdown), and to prior nonempty template defaults.
    // A genuine late IME edit changes the native value away from the last
    // painted value and must still be reconciled.
    const lastRendered = renderedValueByControl.get(control);
    if (lastRendered !== undefined && control.value === lastRendered) return;
    // Defensive fallback for untracked controls: never treat an old empty DOM
    // value as an explicit clear of a non-user template/context seed.
    if (lastRendered === undefined && control.value === '' && storedValue !== ''
      && fieldSources[key] && fieldSources[key] !== 'user') return;
    if (next === formData) next = { ...formData };
    next[key] = control.value;
    changedKeys.push(key);
  });
  return { formData: next, changedKeys };
}

// iOS voice IMEs may emit several input events within one frame. Measuring
// scrollHeight synchronously on each event forces repeated layout of a growing
// textarea and all of its modal ancestors.
const pendingTextAreaResizes = new WeakSet<HTMLTextAreaElement>();

export function setTextareaAutoHeight(el: HTMLTextAreaElement | null, minHeight: number): void {
  if (!el || pendingTextAreaResizes.has(el)) return;
  pendingTextAreaResizes.add(el);
  const schedule = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 16);
  schedule(() => {
    pendingTextAreaResizes.delete(el);
    if (!el.isConnected) return;
    const priorScrollTop = el.scrollTop;
    const appendingAtEnd = document.activeElement === el && el.selectionEnd >= el.value.length;
    el.style.height = 'auto';
    const cssMaxHeight = Number.parseFloat(window.getComputedStyle(el).maxHeight);
    const allowedHeight = Number.isFinite(cssMaxHeight) ? cssMaxHeight : Number.POSITIVE_INFINITY;
    el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, allowedHeight))}px`;
    // A bounded textarea should show newly appended dictation without forcing
    // the scroll position to the end when editing a paragraph in the middle.
    el.scrollTop = appendingAtEnd ? el.scrollHeight : priorScrollTop;
  });
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
