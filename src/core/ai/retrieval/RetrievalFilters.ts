import type { SearchResult } from 'minisearch';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readFieldValue } from '@/core/fields/FieldValueResolver';
import type { RetrievalFilters } from './RetrievalTypes';
import { getSearchResultId, normalizeRetrievalText, readSearchResultText } from './RetrievalText';

export function applyRetrievalFilters(
    results: SearchResult[],
    filters: RetrievalFilters | undefined,
    indexedItemsById: Map<string, RecordViewItem>,
): SearchResult[] {
    if (!filters) return results;

    return results.filter(sr => {
        const item = indexedItemsById.get(getSearchResultId(sr));

        if (!matchesGoalPath(sr, item, filters)) return false;
        if (!matchesCoreBlock(sr, item, filters)) return false;

        return true;
    });
}

function matchesGoalPath(sr: SearchResult, item: RecordViewItem | undefined, filters: RetrievalFilters): boolean {
    if (!filters.goalPaths?.length) return true;
    const itemGoalPath = normalizeRetrievalText(item?.goalPath ?? (item ? readFieldValue(item, 'goalPath') : readSearchResultText(sr, 'goalPath')));
    if (!itemGoalPath) return false;
    return filters.goalPaths.some((path) => itemGoalPath === normalizeRetrievalText(path) || itemGoalPath.startsWith(`${normalizeRetrievalText(path)}/`));
}

function matchesCoreBlock(sr: SearchResult, item: RecordViewItem | undefined, filters: RetrievalFilters): boolean {
    const requestedCoreBlocks = filters.coreBlocks;
    if (!requestedCoreBlocks?.length) return true;
    const coreBlock = normalizeRetrievalText(item?.coreBlock ?? readSearchResultText(sr, 'coreBlock'));
    return !!coreBlock && requestedCoreBlocks.map(normalizeRetrievalText).includes(coreBlock);
}
