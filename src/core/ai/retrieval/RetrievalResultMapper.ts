import type { SearchResult } from 'minisearch';
import type { Item } from '@/core/types/schema';
import { getSearchResultId, readSearchResultNumber, readSearchResultText } from './RetrievalText';

export function searchResultToItem(sr: SearchResult, indexedItemsById: Map<string, Item>): Item {
    const id = getSearchResultId(sr);
    const indexedItem = indexedItemsById.get(id);
    if (indexedItem) return indexedItem;

    const fullData = readSearchResultText(sr, 'fullData');
    return {
        id,
        title: readSearchResultText(sr, 'title'),
        content: readSearchResultText(sr, 'content'),
        editableText: readSearchResultText(sr, 'editableText'),
        fullData,
        rawSource: fullData || undefined,
        type: readSearchResultText(sr, 'type') || 'task',
        themePath: readSearchResultText(sr, 'themePath') || undefined,
        rootTheme: readSearchResultText(sr, 'rootTheme') || undefined,
        leafTheme: readSearchResultText(sr, 'leafTheme') || undefined,
        tags: readSearchResultText(sr, 'tags').split(/\s+/).filter(Boolean),
        categoryKey: readSearchResultText(sr, 'categoryKey'),
        templateId: readSearchResultText(sr, 'templateId') || undefined,
        dateMs: readSearchResultNumber(sr, 'dateMs'),
        created: readSearchResultNumber(sr, 'created') ?? 0,
        modified: readSearchResultNumber(sr, 'modified') ?? 0,
        recurrence: 'none',
        extra: {},
    } as Item;
}
