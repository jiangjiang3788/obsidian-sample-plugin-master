import type { Item } from '@core/public';
import { makeObsUri } from '@core/public';

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
  item: Item;
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
  try {
    return app?.vault?.adapter?.getResourcePath?.(path) || path;
  } catch {
    return path;
  }
}
