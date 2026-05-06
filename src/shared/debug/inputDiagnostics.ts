export function describeElement(element: unknown): string {
  if (!element || !(element instanceof Element)) return String(element);

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string" && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).slice(0, 5).join(".")}`
      : "";
  const name = element.getAttribute("name")
    ? `[name="${element.getAttribute("name")}"]`
    : "";
  const role = element.getAttribute("role")
    ? `[role="${element.getAttribute("role")}"]`
    : "";
  const diag = element.getAttribute("data-think-diag-control")
    ? `[diag="${element.getAttribute("data-think-diag-control")}"]`
    : "";
  const disabled = (element as HTMLInputElement).disabled ? "[disabled]" : "";
  const readOnly = (element as HTMLInputElement).readOnly ? "[readonly]" : "";
  return `${tag}${id}${className}${name}${role}${diag}${disabled}${readOnly}`;
}

function readControlSnapshot(element: unknown) {
  if (
    !element ||
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
  ) {
    return null;
  }

  return {
    value: element.value,
    disabled: element.disabled,
    readOnly:
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
        ? element.readOnly
        : undefined,
    selectionStart:
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
        ? element.selectionStart
        : undefined,
    selectionEnd:
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
        ? element.selectionEnd
        : undefined,
  };
}

function getPointElement(event: Event): string | null {
  const maybeMouse = event as MouseEvent;
  if (
    typeof maybeMouse.clientX !== "number" ||
    typeof maybeMouse.clientY !== "number"
  )
    return null;
  return describeElement(
    document.elementFromPoint(maybeMouse.clientX, maybeMouse.clientY),
  );
}

export function logInputEvent(
  scope: string,
  event: Event,
  extra: Record<string, unknown> = {},
) {
  const target = event.target;
  const currentTarget = event.currentTarget;
  const native = event as InputEvent & KeyboardEvent & MouseEvent;
  console.log(`[输入诊断][${scope}] ${event.type}`, {
    type: event.type,
    eventPhase: event.eventPhase,
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    defaultPrevented: event.defaultPrevented,
    isTrusted: event.isTrusted,
    key: native.key,
    code: native.code,
    inputType: native.inputType,
    data: native.data,
    target: describeElement(target),
    currentTarget: describeElement(currentTarget),
    activeElement: describeElement(document.activeElement),
    elementFromPoint: getPointElement(event),
    targetSnapshot: readControlSnapshot(target),
    currentTargetSnapshot: readControlSnapshot(currentTarget),
    ...extra,
  });
}

export function logRenderDiagnostic(
  scope: string,
  payload: Record<string, unknown>,
) {
  console.log(`[输入诊断][${scope}][render]`, {
    activeElement: describeElement(document.activeElement),
    ...payload,
  });
}

export function installTemplateEditorInputDiagnostics(
  label = "主题模板编辑器",
) {
  const eventTypes = [
    "pointerdown",
    "mousedown",
    "mouseup",
    "click",
    "focusin",
    "focusout",
    "keydown",
    "keyup",
    "beforeinput",
    "input",
    "change",
    "compositionstart",
    "compositionupdate",
    "compositionend",
  ];

  const isInsideEditor = (event: Event) => {
    const target = event.target;
    const active = document.activeElement;
    return (
      !!(
        target instanceof Element &&
        target.closest('[data-think-template-editor-root="true"]')
      ) ||
      !!(
        active instanceof Element &&
        active.closest('[data-think-template-editor-root="true"]')
      )
    );
  };

  const handler = (event: Event) => {
    if (!isInsideEditor(event)) return;
    logInputEvent(`${label}/document-capture`, event);
  };

  for (const type of eventTypes) {
    document.addEventListener(type, handler, true);
    window.addEventListener(type, handler, true);
  }

  const selectionHandler = () => {
    const active = document.activeElement;
    if (
      !(active instanceof Element) ||
      !active.closest('[data-think-template-editor-root="true"]')
    )
      return;
    console.log(`[输入诊断][${label}/selectionchange]`, {
      activeElement: describeElement(active),
      activeSnapshot: readControlSnapshot(active),
      selection: window.getSelection()?.toString(),
    });
  };
  document.addEventListener("selectionchange", selectionHandler, true);

  console.log(`[输入诊断][${label}] 全局捕获日志已安装`);

  return () => {
    for (const type of eventTypes) {
      document.removeEventListener(type, handler, true);
      window.removeEventListener(type, handler, true);
    }
    document.removeEventListener("selectionchange", selectionHandler, true);
    console.log(`[输入诊断][${label}] 全局捕获日志已卸载`);
  };
}
