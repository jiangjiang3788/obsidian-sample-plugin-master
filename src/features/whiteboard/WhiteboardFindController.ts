import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardItem } from '@core/whiteboard/public';
import { findWhiteboardItemIds, stepWhiteboardFindIndex } from './WhiteboardFindModel';

export interface WhiteboardFindController {
  query: string;
  setQuery: (query: string) => void;
  matchIds: string[];
  matchSet: ReadonlySet<string>;
  activeItemId: string | null;
  active: boolean;
  index: number;
  inputRef: { current: HTMLInputElement | null };
  step: (delta: number) => void;
  handleWorkspaceKeyDown: (event: KeyboardEvent) => void;
}

export function useWhiteboardFindController(
  items: readonly WhiteboardItem[],
  recordsById: ReadonlyMap<string, RecordViewItem>,
): WhiteboardFindController {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const matchIds = useMemo(() => findWhiteboardItemIds(items, recordsById, query), [items, query, recordsById]);
  const matchSet = useMemo(() => new Set(matchIds), [matchIds]);
  const activeItemId = matchIds.length > 0 ? matchIds[Math.min(index, matchIds.length - 1)] : null;
  const active = query.trim().length > 0;

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    if (matchIds.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= matchIds.length) setIndex(matchIds.length - 1);
  }, [index, matchIds.length]);

  const step = useCallback((delta: number) => {
    setIndex((current) => stepWhiteboardFindIndex(current, matchIds.length, delta));
  }, [matchIds.length]);

  const handleWorkspaceKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'f') {
      event.preventDefault();
      event.stopPropagation();
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      setQuery('');
    }
  }, [query]);

  return { query, setQuery, matchIds, matchSet, activeItemId, active, index, inputRef, step, handleWorkspaceKeyDown };
}
