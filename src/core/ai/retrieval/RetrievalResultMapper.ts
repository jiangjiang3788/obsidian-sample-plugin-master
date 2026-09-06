import type { RetrievalIndexResult } from './RetrievalTypes';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { getSearchResultId, readSearchResultNumber, readSearchResultText } from './RetrievalText';

export function searchResultToItem(sr: RetrievalIndexResult, indexedItemsById: Map<string, RecordViewItem>): RecordViewItem {
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
        coreBlock: readSearchResultText(sr, 'coreBlock') || 'unknown',
        goalPath: readSearchResultText(sr, 'goalPath') || undefined,
        rootGoal: readSearchResultText(sr, 'rootGoal') || undefined,
        leafGoal: readSearchResultText(sr, 'leafGoal') || undefined,
        tags: readSearchResultText(sr, 'tags').split(/\s+/).filter(Boolean),
        categoryKey: readSearchResultText(sr, 'categoryKey'),
        dateMs: readSearchResultNumber(sr, 'dateMs'),
        created: readSearchResultNumber(sr, 'created') ?? 0,
        modified: readSearchResultNumber(sr, 'modified') ?? 0,
        extra: {},
    } as RecordViewItem;
}
