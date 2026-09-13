import { LocalRetrievalIndex } from './LocalRetrievalIndex';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readFieldValue } from '@/core/fields/FieldValueResolver';
import type { SearchIndexDocument } from './RetrievalTypes';
import { collectSearchableExtraText, normalizeRetrievalText } from './RetrievalText';

export function createRetrievalIndex(): LocalRetrievalIndex {
    return new LocalRetrievalIndex();
}

export function itemToSearchDocument(item: RecordViewItem): SearchIndexDocument {
    return {
        id: item.id,
        title: normalizeRetrievalText(readFieldValue(item, 'title')),
        content: normalizeRetrievalText(readFieldValue(item, 'content')),
        editableText: normalizeRetrievalText(readFieldValue(item, 'editableText') ?? item.editableText),
        fullData: normalizeRetrievalText(readFieldValue(item, 'fullData') ?? item.fullData),
        tags: normalizeRetrievalText(readFieldValue(item, 'tags')),
        goalPath: normalizeRetrievalText(item.goalPath ?? readFieldValue(item, 'goalPath')),
        rootGoal: normalizeRetrievalText(item.rootGoal ?? readFieldValue(item, 'rootGoal')),
        leafGoal: normalizeRetrievalText(item.leafGoal ?? readFieldValue(item, 'leafGoal')),
        recordType: normalizeRetrievalText(item.recordType),
        fileName: normalizeRetrievalText(readFieldValue(item, 'fileName')),
        folder: normalizeRetrievalText(readFieldValue(item, 'file.folder') ?? item.folder),
        header: normalizeRetrievalText(readFieldValue(item, 'header')),
        extraText: collectSearchableExtraText(item),
        dateMs: item.dateMs,
        created: item.created,
        modified: item.modified,
    };
}
