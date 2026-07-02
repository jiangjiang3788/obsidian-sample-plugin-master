import type { VaultPort } from '@core/ports/VaultPort';

export interface AppendUnderHeaderOptions {
  signal?: AbortSignal;
  throwIfAborted?: (signal?: AbortSignal) => void;
}

function checkAbort(options: AppendUnderHeaderOptions): void {
  if (options.throwIfAborted) {
    options.throwIfAborted(options.signal);
    return;
  }
  if (options.signal?.aborted) {
    const error = new Error('AbortError');
    error.name = 'AbortError';
    throw error;
  }
}

export async function appendUnderHeader(
  vault: Pick<VaultPort, 'readFile' | 'writeFile'>,
  filePath: string,
  header: string,
  payload: string,
  options: AppendUnderHeaderOptions = {},
): Promise<void> {
  const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${esc}\\s*$`, 'm');

  const text = (await vault.readFile(filePath)) ?? '';
  checkAbort(options);
  const lines = text.split('\n');

  let headerLineIndex = lines.findIndex((line) => regex.test(line));
  if (headerLineIndex === -1) {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push(header, '');
    headerLineIndex = lines.length - 2;
  }

  let insertAtIndex = lines.length;
  const headerLevel = header.match(/^(#+)\s/)?.[1].length || 0;
  for (let index = headerLineIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#+)\s/);
    if (match && match[1].length <= headerLevel) {
      insertAtIndex = index;
      break;
    }
  }

  if (insertAtIndex > 0 && lines[insertAtIndex - 1].trim() !== '') {
    lines.splice(insertAtIndex, 0, '', payload);
  } else {
    lines.splice(insertAtIndex, 0, payload);
  }

  checkAbort(options);
  await vault.writeFile(filePath, lines.join('\n'));
}
