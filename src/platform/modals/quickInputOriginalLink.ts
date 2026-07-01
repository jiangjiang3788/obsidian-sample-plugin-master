import { Notice } from 'obsidian';
import { useCallback, useMemo, useRef } from 'preact/hooks';

import { makeObsUri } from '@core/utils/public';
import type { Item } from '@core/types/public';

export interface QuickInputOriginalNavigation {
  originalUri: string;
  originalGestureHint?: string;
  openOriginal: () => void;
  handleOriginalPointerClick: (event: MouseEvent) => void;
  handleOriginalTouchEnd: (event: TouchEvent) => void;
}

export function useQuickInputOriginalNavigation({
  mode,
  editItem,
  vaultName,
}: {
  mode: 'create' | 'edit';
  editItem?: Item;
  vaultName: string;
}): QuickInputOriginalNavigation {
  const originalTouchRef = useRef<number | null>(null);

  const originalUri = useMemo(
    () => (mode === 'edit' && editItem ? makeObsUri(editItem, vaultName) : ''),
    [mode, editItem, vaultName],
  );

  const originalGestureHint = originalUri && !originalUri.startsWith('#error')
    ? '桌面端按住 Ctrl/⌘ 点击标题或说明；手机端双击标题或说明，可打开原文'
    : undefined;

  const openOriginal = useCallback(() => {
    if (!originalUri || originalUri.startsWith('#error')) {
      new Notice('❌ 找不到原文位置');
      return;
    }
    window.open(originalUri, '_blank');
  }, [originalUri]);

  const handleOriginalPointerClick = useCallback((event: MouseEvent) => {
    if (!originalGestureHint) return;
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    openOriginal();
  }, [openOriginal, originalGestureHint]);

  const handleOriginalTouchEnd = useCallback((event: TouchEvent) => {
    if (!originalGestureHint) return;
    const now = Date.now();
    const previous = originalTouchRef.current;
    originalTouchRef.current = now;

    if (previous && now - previous <= 350) {
      originalTouchRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      openOriginal();
    }
  }, [openOriginal, originalGestureHint]);

  return {
    originalUri,
    originalGestureHint,
    openOriginal,
    handleOriginalPointerClick,
    handleOriginalTouchEnd,
  };
}
