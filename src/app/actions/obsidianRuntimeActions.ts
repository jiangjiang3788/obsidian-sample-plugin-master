import type { RecordViewItem } from '@core/types/public';
import { makeObsUri } from '@core/utils/public';

interface ObsidianRuntimeApp {
  vault?: {
    getName?: () => string;
    adapter?: {
      getResourcePath?: (path: string) => string;
    };
  };
}

export interface OpenRecordOriginParams {
  app: ObsidianRuntimeApp | null | undefined;
  item: RecordViewItem;
  target?: string;
}

export function getVaultName(app: ObsidianRuntimeApp | null | undefined): string {
  try {
    return app?.vault?.getName?.() || '';
  } catch {
    return '';
  }
}

export function openRecordOrigin({ app, item, target = '_blank' }: OpenRecordOriginParams): void {
  const uri = makeObsUri(item, getVaultName(app));
  window.open(uri, target);
}

export function resolveVaultResourcePath(app: ObsidianRuntimeApp | null | undefined, path: string): string {
  // Markdown records may have been created on Windows and synchronized to mobile.
  // Vault adapter paths are always slash-separated, independent of the OS.
  const source = String(path || '').trim();
  if (/^(?:https?:|data:|blob:|app:|capacitor:|file:|content:|obsidian:)/i.test(source)) return source;
  const normalized = source.replace(/\\/g, '/').replace(/^\.\//, '');
  try {
    return app?.vault?.adapter?.getResourcePath?.(normalized) || normalized;
  } catch {
    return normalized;
  }
}
