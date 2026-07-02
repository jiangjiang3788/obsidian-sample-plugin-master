const BLOCK_METADATA_ALIASES: Record<string, string[]> = {
    '模板ID': ['模板ID', 'templateId'],
    '模板来源': ['模板来源', 'templateSource', 'templateSourceType'],
    '目标ID': ['目标ID', 'goalId'],
    '目标': ['目标'],
    '核心Block': ['核心Block', 'coreBlock', 'coreBlockId'],
    '主题': ['主题', 'themePath', '主题路径', 'theme'],
};

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeInlineKeyPattern(key: string): RegExp {
    return new RegExp(`([\\(\\[]\\s*${escapeRegExp(key)}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
}

export function upsertKvTag(line: string, key: string, value: string): string {
    const pattern = safeInlineKeyPattern(key);
    if (pattern.test(line)) {
        return line.replace(pattern, `$1${value}$2`);
    }
    return `${line.trim()} (${key}:: ${value})`;
}

export function blockMetaKeyPattern(key: string): RegExp {
    const keys = BLOCK_METADATA_ALIASES[key] || [key];
    const source = keys.map((item) => escapeRegExp(item)).join('|') || escapeRegExp(key);
    return new RegExp(`^\\s*(?:${source})\\s*[:：]{1,2}\\s*.*$`, 'i');
}

export function upsertBlockMetadataLine(
    lines: string[],
    startIndex: number,
    endIndex: number,
    key: string,
    value: string,
): number {
    const keyPattern = blockMetaKeyPattern(key);
    for (let index = startIndex + 1; index < endIndex; index += 1) {
        if (keyPattern.test(lines[index])) {
            lines[index] = `${key}:: ${value}`;
            return endIndex;
        }
    }

    let insertIndex = endIndex;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
        const line = lines[index].trim();
        if (!line) continue;
        if (/^内容\s*[:：]{1,2}/.test(line)) {
            insertIndex = index;
            break;
        }
        if (!/^([^:：]{1,24})[:：]{1,2}\s*(.*)$/.test(line)) {
            insertIndex = index;
            break;
        }
    }

    lines.splice(insertIndex, 0, `${key}:: ${value}`);
    return endIndex + 1;
}

export function normalizeNonEmptyFieldEntries(fields: Record<string, string>): Array<[string, string]> {
    return Object.entries(fields)
        .map(([key, value]) => [String(key || '').trim(), String(value ?? '').trim()] as [string, string])
        .filter(([key, value]) => !!key && !!value);
}
