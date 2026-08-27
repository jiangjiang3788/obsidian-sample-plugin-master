import { act } from 'preact/test-utils';

/**
 * 给 Preact + JSDOM 用的最小异步等待工具。
 * 这里故意等待 macrotask，而不是只 Promise.resolve()，因为部分真实 UI 保存逻辑会 setTimeout(0)。
 */
export async function flushUi(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

export async function waitForUi(
  predicate: () => boolean,
  message = '等待界面状态更新超时',
  timeoutMs = 1500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await flushUi();
  }
  if (predicate()) return;
  throw new Error(message);
}

export async function inputText(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  await act(async () => {
    input.focus();

    // 通过原生 value setter 写值，避免 Preact/React 风格受控输入在 JSDOM 中
    // 因直接赋值绕过内部 value 跟踪而出现“DOM 看起来变了、组件 state 没变”。
    const prototype = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor?.set) descriptor.set.call(input, value);
    else input.value = value;

    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
  await flushUi();
}

export async function commitTextInput(input: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  await act(async () => {
    input.blur();
  });
  await flushUi();
}
