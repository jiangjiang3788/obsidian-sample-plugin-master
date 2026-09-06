import type {
    RetrievalIndexResult,
    SearchIndexDocument,
    SearchIndexField,
} from './RetrievalTypes';
import { SEARCH_FIELDS } from './RetrievalTypes';
import { normalizeRetrievalText, tokenizeRetrievalText } from './RetrievalText';

const FIELD_BOOSTS: Partial<Record<SearchIndexField, number>> = {
    title: 2,
    editableText: 1.8,
    goalPath: 1.5,
    tags: 1.3,
    categoryKey: 1.2,
    extraText: 0.8,
};

const DEFAULT_FIELD_BOOST = 1;
const PREFIX_SCORE = 0.82;
const FUZZY_RATIO = 0.2;
const MIN_FUZZY_TERM_LENGTH = 4;

type PreparedDocument = {
    document: SearchIndexDocument;
    fieldTokens: Map<SearchIndexField, string[]>;
};

/**
 * Think OS 本地检索索引。
 *
 * 领域边界：检索需要的是“内存索引 + 字段权重 + prefix + 轻 fuzzy”，
 * 不应该让 AI/Retrieval 的可用性依赖第三方包入口是否完整安装。
 */
export class LocalRetrievalIndex {
    private preparedDocuments: PreparedDocument[] = [];

    addAll(documents: SearchIndexDocument[]): void {
        this.preparedDocuments = documents.map((document) => ({
            document,
            fieldTokens: prepareFieldTokens(document),
        }));
    }

    search(query: string): RetrievalIndexResult[] {
        const queryTokens = tokenizeRetrievalText(normalizeRetrievalText(query));
        if (!queryTokens.length) return [];

        const results: RetrievalIndexResult[] = [];
        for (const prepared of this.preparedDocuments) {
            const scored = scorePreparedDocument(prepared, queryTokens);
            if (scored.score <= 0) continue;
            results.push({
                ...prepared.document,
                score: scored.score,
                match: scored.match,
            });
        }

        return results.sort(compareResults);
    }
}

function prepareFieldTokens(document: SearchIndexDocument): Map<SearchIndexField, string[]> {
    const result = new Map<SearchIndexField, string[]>();
    for (const field of SEARCH_FIELDS) {
        const value = normalizeRetrievalText(document[field]);
        result.set(field, tokenizeRetrievalText(value));
    }
    return result;
}

function scorePreparedDocument(
    prepared: PreparedDocument,
    queryTokens: string[],
): { score: number; match: Record<string, string[]> } {
    let score = 0;
    const match: Record<string, string[]> = {};

    for (const queryToken of queryTokens) {
        let bestTokenScore = 0;
        const matchedFields: string[] = [];

        for (const field of SEARCH_FIELDS) {
            const fieldBoost = FIELD_BOOSTS[field] ?? DEFAULT_FIELD_BOOST;
            const tokens = prepared.fieldTokens.get(field) ?? [];
            const fieldScore = bestFieldMatch(queryToken, tokens) * fieldBoost;
            if (fieldScore <= 0) continue;
            if (fieldScore > bestTokenScore) bestTokenScore = fieldScore;
            matchedFields.push(field);
        }

        if (bestTokenScore > 0) {
            score += bestTokenScore;
            match[queryToken] = [...new Set(matchedFields)];
        }
    }

    return {
        score: score / Math.max(queryTokens.length, 1),
        match,
    };
}

function bestFieldMatch(queryToken: string, documentTokens: string[]): number {
    let best = 0;
    for (const documentToken of documentTokens) {
        if (documentToken === queryToken) return 1;
        if (documentToken.startsWith(queryToken)) {
            best = Math.max(best, PREFIX_SCORE);
            continue;
        }
        const fuzzyScore = fuzzyMatchScore(queryToken, documentToken);
        if (fuzzyScore > best) best = fuzzyScore;
    }
    return best;
}

function fuzzyMatchScore(queryToken: string, documentToken: string): number {
    if (queryToken.length < MIN_FUZZY_TERM_LENGTH || documentToken.length < MIN_FUZZY_TERM_LENGTH) return 0;
    const maxLength = Math.max(queryToken.length, documentToken.length);
    const maxDistance = Math.max(1, Math.floor(maxLength * FUZZY_RATIO));
    if (Math.abs(queryToken.length - documentToken.length) > maxDistance) return 0;

    const distance = boundedLevenshtein(queryToken, documentToken, maxDistance);
    if (distance > maxDistance) return 0;
    return 1 - (distance / maxLength);
}

function boundedLevenshtein(left: string, right: string, maxDistance: number): number {
    if (left === right) return 0;
    if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;

    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i++) {
        const current = new Array<number>(right.length + 1);
        current[0] = i;
        let rowMin = current[0];

        for (let j = 1; j <= right.length; j++) {
            const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + substitutionCost,
            );
            rowMin = Math.min(rowMin, current[j]);
        }

        if (rowMin > maxDistance) return maxDistance + 1;
        previous = current;
    }

    return previous[right.length];
}

function compareResults(left: RetrievalIndexResult, right: RetrievalIndexResult): number {
    if (right.score !== left.score) return right.score - left.score;
    const rightModified = right.modified ?? right.created ?? 0;
    const leftModified = left.modified ?? left.created ?? 0;
    if (rightModified !== leftModified) return rightModified - leftModified;
    return left.id.localeCompare(right.id);
}
