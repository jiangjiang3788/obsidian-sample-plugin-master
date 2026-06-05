import { useCallback } from 'preact/hooks';
import { logInputEvent } from '@shared/public';

type NativeControlElement = HTMLInputElement | HTMLTextAreaElement;

export type NativeControlEvent = Event & {
  currentTarget: NativeControlElement;
};

export function readNativeControlValue(event: Event): string {
  return (
    (event.target || event.currentTarget) as NativeControlElement
  ).value;
}

function stopEditorEvent(event: Event) {
  // Obsidian 的工作区、悬浮窗和快捷键系统会监听冒泡阶段的鼠标/键盘事件。
  // 输入控件必须截断这些事件，否则会出现“能 focus，但无法选中文字/无法稳定输入”的现象。
  event.stopPropagation();
}

export function useObsidianInputGuard({
  scope,
  controlName,
  onInput,
  onBlur,
  onFocus,
}: {
  scope: string;
  controlName: string;
  onInput: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}): Record<string, any> {
  const log = useCallback((event: Event, payload: Record<string, unknown>) => {
    logInputEvent(scope, event as any, payload as any);
  }, [scope]);

  return {
    onPointerDown: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onPointerDown` });
    }, [controlName, log]),

    onMouseDown: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onMouseDown before stopPropagation` });
      stopEditorEvent(event);
    }, [controlName, log]),

    onClick: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onClick before stopPropagation` });
      stopEditorEvent(event);
    }, [controlName, log]),

    onDblClick: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onDblClick before stopPropagation` });
      stopEditorEvent(event);
    }, [controlName, log]),

    onKeyDown: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onKeyDown before stopPropagation` });
      stopEditorEvent(event);
    }, [controlName, log]),

    onKeyUp: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onKeyUp before stopPropagation` });
      stopEditorEvent(event);
    }, [controlName, log]),

    onBeforeInput: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onBeforeInput` });
    }, [controlName, log]),

    onInput: useCallback((event: NativeControlEvent) => {
      const nextValue = readNativeControlValue(event);
      log(event, {
        handler: `${controlName} onInput before local update`,
        nextValue,
      });
      onInput(nextValue);
    }, [controlName, log, onInput]),

    onChange: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onChange` });
    }, [controlName, log]),

    onBlur: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onBlur before commit` });
      onBlur?.();
    }, [controlName, log, onBlur]),

    onFocus: useCallback((event: Event) => {
      log(event, { handler: `${controlName} onFocus` });
      onFocus?.();
    }, [controlName, log, onFocus]),
  };
}
