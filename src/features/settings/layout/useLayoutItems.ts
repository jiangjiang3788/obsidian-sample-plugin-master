import { useEffect, useState } from 'preact/hooks';
import type { DataStore } from '@core/services/public';
import type { Item, Layout } from '@core/types/public';
import { devLog } from '@core/utils/public';

export function useLayoutItems({ dataStore, layout }: { dataStore: DataStore; layout: Layout }): Item[] {
  const [allItems, setAllItems] = useState<Item[]>(() => dataStore.queryItems());

  useEffect(() => {
    const readAllItems = () => {
      const startedAt = performance.now();
      const nextItems = dataStore.queryItems();
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;

      devLog('[ThinkPlugin] layout shared query', {
        layoutId: layout.id,
        viewCount: layout.viewInstanceIds.length,
        itemCount: nextItems.length,
        durationMs,
      });

      setAllItems(nextItems);
    };

    const listener = () => readAllItems();
    dataStore.subscribe(listener);
    readAllItems();
    return () => dataStore.unsubscribe(listener);
  }, [dataStore, layout.id, layout.viewInstanceIds.length]);

  return allItems;
}
