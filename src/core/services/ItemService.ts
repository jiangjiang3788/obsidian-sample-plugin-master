// src/core/services/ItemService.ts
import { singleton, inject } from 'tsyringe';
import { DataStore } from '@core/services/DataStore';
import { VAULT_PORT_TOKEN, type VaultPort } from '@core/ports/VaultPort';
import { nowHHMM, todayISO } from '@core/utils/date';
import { applyTaskTimePolicy } from '@core/utils/taskTime';
import { buildCompletedTaskRecord, markTaskDone } from '@core/utils/mark';
import { resolveBlockRangeForMutation, resolveTaskLineIndexForMutation } from '@core/services/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/services/recordInput/mutationErrors';

interface ItemMutationOptions {
    autoRefresh?: boolean;
}

@singleton()
export class ItemService {
    constructor(
        @inject(DataStore) private dataStore: DataStore,
        @inject(VAULT_PORT_TOKEN) private vault: VaultPort
    ) {}

    public async getItemLine(itemId: string): Promise<string> {
        const context = await this.loadMutableTaskContext(itemId);
        return context.rawLine;
    }

    private async writeLines(path: string, lines: string[], options: ItemMutationOptions = {}): Promise<void> {
        await this.vault.writeFile(path, lines.join('\n'));
        if (options.autoRefresh !== false) {
            await this.dataStore.scanFileByPath(path);
            this.dataStore.notifyChange();
        }
    }

    public async completeItem(
        itemId: string,
        options?: { duration?: number; startTime?: string; endTime?: string },
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine, item } = context;
        const lines = [...context.lines];

        if (options) {
            const fallbackEndTime = options.endTime || nowHHMM();
            const seedOptions = {
                duration: typeof options.duration === 'number' ? options.duration : undefined,
                startTime: options.startTime || undefined,
                endTime: fallbackEndTime,
            };
            const normalizedTriple = seedOptions.duration !== undefined
                ? applyTaskTimePolicy({ ...seedOptions, mode: 'finalize', direction: 'forward' })
                : {
                    startTime: seedOptions.startTime,
                    endTime: fallbackEndTime,
                    duration: undefined,
                };
            const normalizedOptions = {
                duration: normalizedTriple.duration,
                startTime: normalizedTriple.startTime,
                endTime: normalizedTriple.endTime || fallbackEndTime,
            };

            const { completedLine, nextTaskLine } = markTaskDone(
                rawLine,
                todayISO(),
                normalizedOptions.endTime || nowHHMM(),
                normalizedOptions,
            );
            lines[index] = completedLine;
            if (nextTaskLine) {
                lines.splice(index + 1, 0, nextTaskLine);
            }
            await this.writeLines(path, lines, mutationOptions);
            return;
        }

        if (item && item.duration) {
            const durationMinutes = item.duration;
            const endTime = nowHHMM();
            const normalizedTriple = applyTaskTimePolicy({ endTime, duration: durationMinutes, mode: 'finalize', direction: 'forward' });
            const startTime = normalizedTriple.startTime || undefined;

            const calculatedOptions = {
                duration: normalizedTriple.duration ?? durationMinutes,
                startTime,
                endTime,
            };

            const { completedLine, nextTaskLine } = markTaskDone(
                rawLine,
                todayISO(),
                endTime,
                calculatedOptions,
            );
            lines[index] = completedLine;
            if (nextTaskLine) {
                lines.splice(index + 1, 0, nextTaskLine);
            }
            await this.writeLines(path, lines, mutationOptions);
            return;
        }

        const { completedLine, nextTaskLine } = markTaskDone(rawLine, todayISO(), nowHHMM());
        lines[index] = completedLine;
        if (nextTaskLine) {
            lines.splice(index + 1, 0, nextTaskLine);
        }
        await this.writeLines(path, lines, mutationOptions);
    }

    public async appendCompletionRecord(
        itemId: string,
        options?: { duration?: number; startTime?: string; endTime?: string },
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        const completedLine = buildCompletedTaskRecord(
            rawLine,
            todayISO(),
            options?.endTime || nowHHMM(),
            options,
        );
        lines.splice(index + 1, 0, completedLine);
        await this.writeLines(path, lines, mutationOptions);
    }

    public async updateItemTime(
        itemId: string,
        updates: { time?: string; endTime?: string; duration?: number },
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        let line = rawLine;

        if (updates.time !== undefined) {
            line = this.upsertKvTag(line, '时间', updates.time);
        }
        if (updates.endTime !== undefined) {
            line = this.upsertKvTag(line, '结束', updates.endTime);
        }
        if (updates.duration !== undefined) {
            line = this.upsertKvTag(line, '时长', String(updates.duration));
        }

        lines[index] = line;
        await this.writeLines(path, lines, mutationOptions);
    }



    /**
     * 目标中心 Markdown 回填：在定位到的记录行上补齐内联元数据。
     * 保留给任务行使用：只改当前行的 `(key:: value)`，不移动正文。
     */
    public async upsertItemInlineFields(
        itemId: string,
        fields: Record<string, string>,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<{ path: string; beforeLine: string; afterLine: string }> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        let line = rawLine;

        for (const [key, value] of Object.entries(fields)) {
            const normalizedKey = String(key || '').trim();
            const normalizedValue = String(value ?? '').trim();
            if (!normalizedKey || !normalizedValue) continue;
            line = this.upsertKvTag(line, normalizedKey, normalizedValue);
        }

        lines[index] = line;
        await this.writeLines(path, lines, mutationOptions);
        return { path, beforeLine: rawLine, afterLine: line };
    }

    /**
     * 目标迁移专用写回：
     * - task：写回当前任务行内 `(字段:: 值)`；
     * - block：写回 `<!-- start --> ... <!-- end -->` 内的块元数据行。
     *
     * 这样旧记录改写不再只覆盖任务行，也能安全处理计划/总结/打卡等块记录。
     */
    public async upsertItemGoalTemplateMigrationFields(
        itemId: string,
        fields: Record<string, string>,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<{ path: string; beforeText: string; afterText: string; shape: 'task-inline' | 'block-metadata' }> {
        const { path, lineNo } = this.parseItemId(itemId);
        const content = await this.vault.readFile(path);
        if (content == null) {
            throw createRecordConflictError('record_path_missing', `找不到条目文件: ${path}`);
        }
        const lines = content.split('\n');
        const item = this.dataStore.queryItems().find((candidate) => candidate.id === itemId);
        const expectedIndex = lineNo - 1;

        if (item?.type === 'block') {
            const range = resolveBlockRangeForMutation(lines, item, expectedIndex);
            const beforeText = lines.slice(range.startIndex, range.endIndex + 1).join('\n');
            let endIndex = range.endIndex;
            for (const [key, value] of Object.entries(fields)) {
                const normalizedKey = String(key || '').trim();
                const normalizedValue = String(value ?? '').trim();
                if (!normalizedKey || !normalizedValue) continue;
                endIndex = this.upsertBlockMetadataLine(lines, range.startIndex, endIndex, normalizedKey, normalizedValue);
            }
            const afterText = lines.slice(range.startIndex, endIndex + 1).join('\n');
            await this.writeLines(path, lines, mutationOptions);
            return { path, beforeText, afterText, shape: 'block-metadata' };
        }

        const context = await this.loadMutableTaskContext(itemId);
        const mutableLines = [...context.lines];
        let line = context.rawLine;
        for (const [key, value] of Object.entries(fields)) {
            const normalizedKey = String(key || '').trim();
            const normalizedValue = String(value ?? '').trim();
            if (!normalizedKey || !normalizedValue) continue;
            line = this.upsertKvTag(line, normalizedKey, normalizedValue);
        }
        mutableLines[context.index] = line;
        await this.writeLines(path, mutableLines, mutationOptions);
        return { path, beforeText: context.rawLine, afterText: line, shape: 'task-inline' };
    }



    private upsertBlockMetadataLine(lines: string[], startIndex: number, endIndex: number, key: string, value: string): number {
        const keyPattern = this.blockMetaKeyPattern(key);
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

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private blockMetaKeyPattern(key: string): RegExp {
        const aliases: Record<string, string[]> = {
            '模板ID': ['模板ID', 'templateId'],
            '模板来源': ['模板来源', 'templateSource', 'templateSourceType'],
            '目标ID': ['目标ID', 'goalId'],
            '目标': ['目标'],
            '核心Block': ['核心Block', 'coreBlock', 'coreBlockId'],
            '主题': ['主题', 'themePath', '主题路径', 'theme'],
        };
        const keys = aliases[key] || [key];
        const source = keys.map((item) => this.escapeRegExp(item)).join('|') || this.escapeRegExp(key);
        return new RegExp(`^\\s*(?:${source})\\s*[:：]{1,2}\\s*.*$`, 'i');
    }

    /**
     * 目标迁移前备份。
     * - 备份当前 settings 到 JSON
     * - 备份 DataStore 中已索引到的 Markdown 文件
     * - 不修改原始记录；用于用户侧“一键迁移前备份”
     */
    public async createMigrationBackup(
        backupRoot: string,
        settings: unknown,
    ): Promise<{ backupRoot: string; settingsPath: string; markdownFileCount: number; failedPaths: string[] }> {
        const root = String(backupRoot || '').replace(/^\/+|\/+$/g, '') || `ThinkOS/Backups/goal-migration-${Date.now()}`;
        const settingsPath = `${root}/data-settings.json`;
        const items = this.dataStore.queryItems() as Array<{ id?: string }>;
        const markdownPaths = Array.from(new Set(items
            .map((item) => this.safePathFromItemId(String(item.id || '')))
            .filter((path): path is string => !!path)
        )).sort((left, right) => left.localeCompare(right));

        await this.vault.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        await this.vault.writeFile(`${root}/markdown-paths.json`, JSON.stringify(markdownPaths, null, 2));

        const failedPaths: string[] = [];
        let markdownFileCount = 0;
        for (const path of markdownPaths) {
            try {
                const content = await this.vault.readFile(path);
                if (content == null) {
                    failedPaths.push(path);
                    continue;
                }
                await this.vault.writeFile(`${root}/markdown/${path}`, content);
                markdownFileCount += 1;
            } catch (_error) {
                failedPaths.push(path);
            }
        }

        await this.vault.writeFile(`${root}/manifest.json`, JSON.stringify({
            createdAt: new Date().toISOString(),
            settingsPath,
            markdownFileCount,
            failedPaths,
        }, null, 2));

        return { backupRoot: root, settingsPath, markdownFileCount, failedPaths };
    }

    private safePathFromItemId(itemId: string): string | null {
        const hashIndex = itemId.lastIndexOf('#');
        if (hashIndex <= 0) return null;
        const path = itemId.substring(0, hashIndex).trim();
        return path || null;
    }

    private async loadMutableTaskContext(itemId: string): Promise<{
        path: string;
        index: number;
        lines: string[];
        rawLine: string;
        item?: { content?: string; title?: string; duration?: number };
    }> {
        const { path, lineNo } = this.parseItemId(itemId);
        const content = await this.vault.readFile(path);
        if (content == null) {
            throw createRecordConflictError('record_path_missing', `找不到条目文件: ${path}`);
        }

        const lines = content.split('\n');
        const item = this.dataStore.queryItems().find((candidate) => candidate.id === itemId);
        const resolvedIndex = resolveTaskLineIndexForMutation(lines, item ?? null, lineNo - 1);
        const rawLine = lines[resolvedIndex];

        if (!rawLine) {
            throw createRecordConflictError('record_item_missing', '条目已不存在，无法继续操作。');
        }

        return {
            path,
            index: resolvedIndex,
            lines,
            rawLine,
            item: item
                ? {
                    content: item.content,
                    title: item.title,
                    duration: item.duration,
                }
                : undefined,
        };
    }

    private parseItemId(itemId: string): { path: string; lineNo: number } {
        const hashIndex = itemId.lastIndexOf('#');
        if (hashIndex === -1) throw createRecordConflictError('record_locator_invalid', `无效的条目ID格式: ${itemId}`);

        const path = itemId.substring(0, hashIndex);
        const lineNo = parseInt(itemId.substring(hashIndex + 1), 10);
        if (isNaN(lineNo)) throw createRecordConflictError('record_locator_invalid', `无效的条目行号: ${itemId}`);

        return { path, lineNo };
    }

    private upsertKvTag(line: string, key: string, value: string): string {
        const pattern = new RegExp(`([\\(\\[]\\s*${key}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
        if (pattern.test(line)) {
            return line.replace(pattern, `$1${value}$2`);
        }
        return `${line.trim()} (${key}:: ${value})`;
    }
}
