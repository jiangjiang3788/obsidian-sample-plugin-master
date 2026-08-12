import MiniSearch from 'minisearch';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readFieldValue } from '@/core/fields/FieldValueResolver';
import type { SearchIndexDocument } from './RetrievalTypes';
import { SEARCH_FIELDS, STORE_FIELDS } from './RetrievalTypes';
import { collectSearchableExtraText, normalizeRetrievalText, tokenizeRetrievalText } from './RetrievalText';

export function createRetrievalMiniSearch(): MiniSearch<SearchIndexDocument> {
    return new MiniSearch<SearchIndexDocument>({
        fields: SEARCH_FIELDS as string[],
        storeFields: STORE_FIELDS as string[],
        extractField: (document: SearchIndexDocument, fieldName: string) => {
            return normalizeRetrievalText(document[fieldName as keyof SearchIndexDocument]);
        },
        searchOptions: {
            boost: {
                title: 2,
                editableText: 1.8,
                themePath: 1.5,
                tags: 1.3,
                categoryKey: 1.2,
                extraText: 0.8,
            },
            fuzzy: 0.2,
            prefix: true,
        },
        tokenize: tokenizeRetrievalText,
    });
}

export function itemToSearchDocument(item: RecordViewItem): SearchIndexDocument {
    return {
        id: item.id,
        title: normalizeRetrievalText(readFieldValue(item, 'title')),
        content: normalizeRetrievalText(readFieldValue(item, 'content')),
        editableText: normalizeRetrievalText(readFieldValue(item, 'editableText') ?? item.editableText),
        fullData: normalizeRetrievalText(readFieldValue(item, 'fullData') ?? item.fullData),
        tags: normalizeRetrievalText(readFieldValue(item, 'tags')),
        themePath: normalizeRetrievalText(readFieldValue(item, 'themePath')),
        rootTheme: normalizeRetrievalText(readFieldValue(item, 'rootTheme')),
        leafTheme: normalizeRetrievalText(readFieldValue(item, 'leafTheme')),
        categoryKey: normalizeRetrievalText(readFieldValue(item, 'categoryKey')),
        baseCategory: normalizeRetrievalText(readFieldValue(item, 'baseCategory')),
        leafCategory: normalizeRetrievalText(readFieldValue(item, 'leafCategory')),
        coreBlock: normalizeRetrievalText(item.coreBlock),
        templateId: normalizeRetrievalText(item.templateId),
        fileName: normalizeRetrievalText(readFieldValue(item, 'fileName')),
        folder: normalizeRetrievalText(readFieldValue(item, 'file.folder') ?? item.folder),
        header: normalizeRetrievalText(readFieldValue(item, 'header')),
        extraText: collectSearchableExtraText(item),
        dateMs: item.dateMs,
        created: item.created,
        modified: item.modified,
    };
}
