import { buildRecordTypeColorCssVariables, type RecordTypeColorOverrides } from '@core/recordTypes/public';

const STYLE_ID = 'think-os-record-type-colors-runtime';

function getDocument(): Document | null {
  return typeof document === 'undefined' ? null : document;
}

export function applyRecordTypeColorOverrides(overrides: RecordTypeColorOverrides | undefined): void {
  const doc = getDocument();
  if (!doc) return;
  const variables = buildRecordTypeColorCssVariables(overrides);
  let style = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (Object.keys(variables).length === 0) {
    style?.remove();
    return;
  }

  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    style.dataset.thinkOwner = 'record-type-color-runtime';
    doc.head.appendChild(style);
  }

  const declarations = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  style.textContent = `.think-os,\n.theme-dark .think-os,\n.think-os.theme-dark {\n${declarations}\n}`;
}

export function clearRecordTypeColorOverrides(): void {
  getDocument()?.getElementById(STYLE_ID)?.remove();
}
