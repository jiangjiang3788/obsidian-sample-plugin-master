// src/shared/components/TagsRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { ThemeDefinition } from '@lib/types/domain/schema';
import { getSimplifiedThemeDisplay } from '@lib/utils/core/themeUtils';
import { getCategoryColor } from '@lib/domain';

interface TagsRendererProps {
    tags: string[];
    allThemes: ThemeDefinition[];
}

export function TagsRenderer({ tags, allThemes }: TagsRendererProps) {
    // 使用 useMemo 进行性能优化，只有当 tags 或 allThemes 变化时才重新计算
    const { themeLabels, regularTags } = useMemo(() => {
        return getSimplifiedThemeDisplay(tags, allThemes);
    }, [tags, allThemes]);

    return (
        <div class="bv-fields-list">
            {/* 渲染简化后的主题标签 */}
            {themeLabels.map(({ fullPath, label }) => (
                <span 
                    key={fullPath}
                    class="tag-pill" 
                    title={`主题: ${fullPath}`}
                    // 使用分类颜色，颜色从完整路径的第一部分获取
                    style={{ background: getCategoryColor(fullPath) }}
                >
                    {label}
                </span>
            ))}
            {/* 渲染普通标签 */}
            {regularTags.map(tag => (
                <span 
                    key={tag}
                    class="tag-pill" 
                    title={`标签: ${tag}`}
                >
                    {tag}
                </span>
            ))}
        </div>
    );
}