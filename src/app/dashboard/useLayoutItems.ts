import { useEffect, useState } from 'preact/hooks';
import type { DataStore } from '@core/services/public';
import type { RecordViewItem, Layout } from '@core/types/public';
import { devLog } from '@core/utils/public';

export function useLayoutItems({ dataStore, layout }: { dataStore: DataStore; layout: Layout }): RecordViewItem[] {
  const [allItems, setAllItems] = useState<RecordViewItem[]>(() => dataStore.queryItems());

  useEffect(() => {
    // The state initializer above already performs the first shared query. Re-querying
    // immediately from the effect duplicated the full RecordViewItem projection on every
    // layout mount. From this point on we only refresh when DataStore actually changes.
    const listener = () => {
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

    dataStore.subscribe(listener);
    return () => dataStore.unsubscribe(listener);
  }, [dataStore, layout.id, layout.viewInstanceIds.length]);

  return allItems;
}
