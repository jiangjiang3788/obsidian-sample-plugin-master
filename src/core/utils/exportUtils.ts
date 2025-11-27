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
    const groupedItems = new Map<string, Item[]>();
    const UNGROUPED_KEY = '未分类';

    // 1. 分组
    items.forEach(item => {
        let groupKey = UNGROUPED_KEY;
        if (config.groupField) {
            const val = readField(item, config.groupField);
            if (val) groupKey = String(val);
        }
        
        if (!groupedItems.has(groupKey)) {
            groupedItems.set(groupKey, []);
        }
        groupedItems.get(groupKey)!.push(item);
    });

    // 2. 生成 Markdown
    let groupIndex = 0;
    groupedItems.forEach((groupItemsList, groupName) => {
        // 分组之间的分隔符
        if (groupIndex > 0) {
            lines.push('---');
            lines.push('');
        }

        // 分组标题
        if (config.useMarkdownHeadingForGroup) {
            const prefix = config.groupTitlePrefix || '';
            lines.push(`## ${prefix}${groupName}`);
            lines.push('');
        }

        // 遍历分组内的 Items
        groupItemsList.forEach((item, index) => {
            if (item.type === 'task') {
                lines.push(formatTaskItem(item));
            } else {
                lines.push(...formatBlockItem(item, index + 1, config));
            }
        });

        groupIndex++;
    });

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
    
    // 支持更多变量替换
    idLine = idLine.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const val = readField(item, key);
        return val !== undefined ? String(val) : match;
    });

    lines.push(`- **${idLine}**`);

    // 2. 构建字段列表
    config.detailFields.forEach(field => {
        const rawValue = readField(item, field);
        // 跳过空值，但允许 0
        if (rawValue === undefined || rawValue === null || rawValue === '') return;

        const label = config.fieldLabels[field] || field;
        let displayValue = String(rawValue);

        // 特殊字段处理
        if (field === 'pintu') {
            // 改进的 emoji 检测：检查是否为纯 emoji
            const isEmojiOnly = /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$/u.test(displayValue) 
                               && displayValue.trim().length <= 8 
                               && !displayValue.includes('.');
            
            if (isEmojiOnly) {
                // 直接显示 emoji
                displayValue = displayValue.trim();
            } else if (!displayValue.startsWith('![[') && !displayValue.startsWith('![')) {
                // 非 emoji 且不是已有图片链接格式，转为图片链接
                displayValue = `![[${displayValue}]]`;
            }
        } else if (field === 'content') {
            // 内容特殊处理：按您的示例格式
            lines.push(`  - ${label}:`);
            displayValue.split('\n').forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    lines.push(`  - ${trimmedLine}`);
                }
            });
            return; // content 处理完毕，跳过默认 push
        }

        lines.push(`  - ${label}: ${displayValue}`);
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
