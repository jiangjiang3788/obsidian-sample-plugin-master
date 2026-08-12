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

        if (!matchesThemePath(sr, item, filters)) return false;
        if (!matchesCoreBlock(sr, item, filters)) return false;
        if (!matchesRecordCaptureTemplateId(sr, item, filters)) return false;
        if (!matchesRecordCaptureTemplateName(sr, item, filters)) return false;

        return true;
    });
}

function matchesThemePath(sr: SearchResult, item: RecordViewItem | undefined, filters: RetrievalFilters): boolean {
    if (!filters.themePaths?.length) return true;
    const itemThemePath = normalizeRetrievalText(item ? readFieldValue(item, 'themePath') : readSearchResultText(sr, 'themePath'));
    if (!itemThemePath) return false;
    return filters.themePaths.some(tp => itemThemePath === tp || itemThemePath.startsWith(tp + '/'));
}

function matchesCoreBlock(sr: SearchResult, item: RecordViewItem | undefined, filters: RetrievalFilters): boolean {
    const requestedCoreBlocks = filters.coreBlocks?.length ? filters.coreBlocks : filters.types;
    if (!requestedCoreBlocks?.length) return true;
    const coreBlock = normalizeRetrievalText(item?.coreBlock ?? readSearchResultText(sr, 'coreBlock'));
    return !!coreBlock && requestedCoreBlocks.map(normalizeRetrievalText).includes(coreBlock);
}


function matchesRecordCaptureTemplateId(sr: SearchResult, item: RecordViewItem | undefined, filters: RetrievalFilters): boolean {
    if (!filters.blockTemplateIds?.length) return true;
    const templateId = normalizeRetrievalText(item?.templateId ?? readSearchResultText(sr, 'templateId'));
    return !!templateId && filters.blockTemplateIds.includes(templateId);
}

function matchesRecordCaptureTemplateName(sr: SearchResult, item: RecordViewItem | undefined, filters: RetrievalFilters): boolean {
    if (!filters.blockTemplateNames?.length) return true;
    const categoryKey = normalizeRetrievalText(item ? readFieldValue(item, 'categoryKey') : readSearchResultText(sr, 'categoryKey'));
    if (!categoryKey) return false;
    const categoryBase = categoryKey.split('/')[0];
    return filters.blockTemplateNames.includes(categoryBase);
}
