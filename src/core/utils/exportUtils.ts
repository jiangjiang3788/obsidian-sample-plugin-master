import { Item, readField } from '@/core/types/schema';
import { EMOJI } from '@/core/types/constants';
import { 
    BLOCK_EXPORT_DEFAULT_CONFIG, 
    EVENT_TIMELINE_EXPORT_CONFIG,
    EXCEL_EXPORT_CONFIG,
    STATISTICS_EXPORT_CONFIG,
    HEATMAP_EXPORT_CONFIG,
    TIMELINE_EXPORT_CONFIG,
    TABLE_EXPORT_CONFIG,
    ExportViewConfig 
} from '@/core/config/viewConfigs';

/**
 * 根据视图类型获取对应的导出配置
 */
export function getExportConfigByViewType(viewType: string): ExportViewConfig {
    const configMap: Record<string, ExportViewConfig> = {
        'BlockView': BLOCK_EXPORT_DEFAULT_CONFIG,
        'EventTimelineView': EVENT_TIMELINE_EXPORT_CONFIG,
        'ExcelView': EXCEL_EXPORT_CONFIG,
        'StatisticsView': STATISTICS_EXPORT_CONFIG,
        'HeatmapView': HEATMAP_EXPORT_CONFIG,
        'TimelineView': TIMELINE_EXPORT_CONFIG,
        'TableView': TABLE_EXPORT_CONFIG,
    };
    
    return configMap[viewType] || BLOCK_EXPORT_DEFAULT_CONFIG;
}

/**
 * 将 Item 数组导出为 Markdown 格式。
 * 支持基于配置的分组和自定义字段输出。
 * 
 * @param items - 要导出的 Item 数组。
 * @param config - 导出配置，默认为 BLOCK_EXPORT_DEFAULT_CONFIG。
 * @returns Markdown 格式的字符串。
 */
export function exportItemsToMarkdown(items: Item[], config: ExportViewConfig = BLOCK_EXPORT_DEFAULT_CONFIG): string {
    const lines: string[] = [];
    const UNGROUPED_KEY = '未分类';

    /**
     * 递归按多级 groupFields 分组
     * 支持：无分组 / 单字段分组 / 多字段层级分组
     */
    const groupRecursively = (itemsToGroup: Item[], groupFields: string[] | undefined, level: number): { key: string; items: Item[]; children?: any[] }[] => {
        if (!groupFields || level >= groupFields.length) {
            return [{
                key: UNGROUPED_KEY,
                items: itemsToGroup,
            }];
        }

        const field = groupFields[level];
        const map = new Map<string, Item[]>();

        itemsToGroup.forEach(item => {
            let key = UNGROUPED_KEY;
            if (field) {
                const val = readField(item, field);
                if (val !== undefined && val !== null && val !== '') {
                    key = String(val);
                }
            }
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(item);
        });

        const results: { key: string; items: Item[]; children?: any[] }[] = [];
        map.forEach((groupItems, key) => {
            const children = groupRecursively(groupItems, groupFields, level + 1);
            // 如果还有下一层字段，则 children 中会包含具体 items
            results.push({
                key,
                items: level === groupFields.length - 1 ? groupItems : [],
                children: level === groupFields.length - 1 ? undefined : children,
            });
        });

        return results;
    };

    const groupFields = config.groupFields || (config.groupField ? [config.groupField] : undefined);
    const groupedTree = groupRecursively(items, groupFields, 0);

    /**
     * 展平分组树为有层级标题的 Markdown
     */
    const renderGroupTree = (nodes: { key: string; items: Item[]; children?: any[] }[], level: number) => {
        nodes.forEach((node, groupIndex) => {
            const isRootLevel = level === 0;

            // 分组之间的分隔符（仅顶层分组之间）
            if (isRootLevel && groupIndex > 0) {
                lines.push('---');
                lines.push('');
            }

            // 分组标题
            if (config.useMarkdownHeadingForGroup) {
                const prefix = config.groupTitlePrefix || '';
                const headingLevel = Math.min(6, 2 + level); // 顶层 ##，下面依次 ###、####...
                const hashes = '#'.repeat(headingLevel);
                lines.push(`${hashes} ${prefix}${node.key}`);
                lines.push('');
            }

            // 如果还有子层级，则递归渲染子层级
            if (node.children && node.children.length > 0) {
                renderGroupTree(node.children, level + 1);
            }

            // 渲染当前层级的 items
            node.items.forEach((item, index) => {
                if (item.type === 'task') {
                    lines.push(formatTaskItem(item));
                } else {
                    lines.push(...formatBlockItem(item, index + 1, config));
                }
            });
        });
    };

    renderGroupTree(groupedTree, 0);

    return lines.join('\n');
}

/**
 * 格式化 Block 类型的 Item
 */
function formatBlockItem(item: Item, index: number, config: ExportViewConfig): string[] {
    const lines: string[] = [];

    // 1. 构建 ID 行 (第一行)
    // 模板示例: 'ID {{index}}/{{filename}}#{{id}}'
    let idLine = config.idTemplate
        .replace('{{index}}', index.toString().padStart(2, '0'))
        .replace('{{filename}}', item.filename || '未知文件')
        .replace('{{id}}', item.id || '');

    // 支持更多变量替换（允许在模板中写 {{date}}、{{categoryKey}} 等）
    idLine = idLine.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const val = readField(item, key);
        return val !== undefined ? String(val) : match;
    });

    lines.push(`- **${idLine}**`);

    // 2. 构建字段列表（顺序由 detailFields 决定）
    config.detailFields.forEach(field => {
        const rawValue = readField(item, field);
        // 跳过空值，但允许 0
        if (rawValue === undefined || rawValue === null || rawValue === '') return;

        const label = config.fieldLabels[field] || field;
        const renderCfg = config.fieldRender?.[field];
        let displayValue = String(rawValue);

        // 根据字段渲染配置决定展示方式
        if (renderCfg?.type === 'emojiOrLink') {
            // 评图字段规则：如果是纯 emoji，则直接显示；否则转为 ![[ ]] 图片链接（除非已是图片语法）
            const isEmojiOnly = /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$/u.test(displayValue)
                && displayValue.trim().length <= 8
                && !displayValue.includes('.');

            if (isEmojiOnly) {
                displayValue = displayValue.trim();
            } else if (!displayValue.startsWith('![[') && !displayValue.startsWith('![')) {
                displayValue = `![[${displayValue}]]`;
            }

            lines.push(`  - ${label}: ${displayValue}`);
        } else if (renderCfg?.type === 'content') {
            // 内容字段：按示例格式展开为多行
            lines.push(`  - ${label}:`);
            displayValue.split('\n').forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    lines.push(`  - ${trimmedLine}`);
                }
            });
        } else {
            // 默认普通字段
            lines.push(`  - ${label}: ${displayValue}`);
        }
    });

    return lines;
}

/**
 * 格式化 Task 类型的 Item (保持原有逻辑的简化版)
 */
function formatTaskItem(item: Item): string {
    const isDone = item.categoryKey.includes('/done');
    const isCancelled = item.categoryKey.includes('/cancelled');
    const checkbox = isDone ? '[x]' : isCancelled ? '[-]' : '[ ]';
    
    let taskLine = `- ${checkbox} ${item.title}`;

    // 添加核心和自定义字段 (key:: value)
    const extraFields: Record<string, any> = {
        '周期': item.period,
        '评分': item.rating,
        '时间': item.startTime,
        '结束': item.endTime,
        '时长': item.duration,
        ...item.extra,
    };

    for (const key in extraFields) {
        const value = extraFields[key];
        // 过滤掉 filename 和 header，因为它们可能已经被用于分组
        if (key === 'filename' || key === 'header') continue;
        if (value !== null && value !== undefined && value !== '') {
            taskLine += ` (${key}:: ${value})`;
        }
    }
    
    // 添加日期字段
    if (item.dueDate) taskLine += ` ${EMOJI.due} ${item.dueDate}`;
    if (item.scheduledDate) taskLine += ` ${EMOJI.scheduled} ${item.scheduledDate}`;
    if (item.startDate) taskLine += ` ${EMOJI.start} ${item.startDate}`;
    if (item.createdDate) taskLine += ` ${EMOJI.created} ${item.createdDate}`;
    if (item.doneDate) taskLine += ` ${EMOJI.done} ${item.doneDate}`;
    if (item.cancelledDate) taskLine += ` ${EMOJI.cancelled} ${item.cancelledDate}`;

    return taskLine.replace(/\s+/g, ' ').trim();
}
