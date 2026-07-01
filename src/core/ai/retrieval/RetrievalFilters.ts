import type { SearchResult } from 'minisearch';
import type { Item } from '@/core/types/schema';
import { readFieldValue } from '@/core/fields/FieldValueResolver';
import type { RetrievalFilters } from './RetrievalTypes';
import { getSearchResultId, normalizeRetrievalText, readSearchResultText } from './RetrievalText';

export function applyRetrievalFilters(
    results: SearchResult[],
    filters: RetrievalFilters | undefined,
    indexedItemsById: Map<string, Item>,
): SearchResult[] {
    if (!filters) return results;

    return results.filter(sr => {
        const item = indexedItemsById.get(getSearchResultId(sr));

        if (!matchesThemePath(sr, item, filters)) return false;
        if (!matchesItemType(sr, item, filters)) return false;
        if (!matchesBlockTemplateId(sr, item, filters)) return false;
        if (!matchesBlockTemplateName(sr, item, filters)) return false;

        return true;
    });
}

function matchesThemePath(sr: SearchResult, item: Item | undefined, filters: RetrievalFilters): boolean {
    if (!filters.themePaths?.length) return true;
    const itemThemePath = normalizeRetrievalText(item ? readFieldValue(item, 'themePath') : readSearchResultText(sr, 'themePath'));
    if (!itemThemePath) return false;
    return filters.themePaths.some(tp => itemThemePath === tp || itemThemePath.startsWith(tp + '/'));
}

function matchesItemType(sr: SearchResult, item: Item | undefined, filters: RetrievalFilters): boolean {
    if (!filters.types?.length) return true;
    const itemType = (item?.type || readSearchResultText(sr, 'type')) as 'task' | 'block' | undefined;
    return !!itemType && filters.types.includes(itemType);
}

function matchesBlockTemplateId(sr: SearchResult, item: Item | undefined, filters: RetrievalFilters): boolean {
    if (!filters.blockTemplateIds?.length) return true;
    const templateId = normalizeRetrievalText(item?.templateId ?? readSearchResultText(sr, 'templateId'));
    return !!templateId && filters.blockTemplateIds.includes(templateId);
}

function matchesBlockTemplateName(sr: SearchResult, item: Item | undefined, filters: RetrievalFilters): boolean {
    if (!filters.blockTemplateNames?.length) return true;
    const categoryKey = normalizeRetrievalText(item ? readFieldValue(item, 'categoryKey') : readSearchResultText(sr, 'categoryKey'));
    if (!categoryKey) return false;
    const categoryBase = categoryKey.split('/')[0];
    return filters.blockTemplateNames.includes(categoryBase);
}
