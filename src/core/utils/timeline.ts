// src/core/utils/timeline.ts
import type { Item } from '@/core/types/schema';

/**
 * 从 items 中提取所有可用的文件基本名称（basename），并按字典序排序
 */
export function collectFileNames(items: Item[]): string[] {
    const fileNames = new Set<string>();
    items.forEach(item => {
        if (item.file?.basename) {
            fileNames.add(item.file.basename);
        }
    });
    return Array.from(fileNames).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
