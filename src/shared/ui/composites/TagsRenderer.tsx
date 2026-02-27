// src/shared/components/TagsRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { ThemeDefinition } from '@core/public';
// 术语对齐：tags 只负责“标签”，theme 独立由字段 theme 展示。

interface TagsRendererProps {
    tags: string[];
    allThemes: ThemeDefinition[];
}

export function TagsRenderer({ tags, allThemes }: TagsRendererProps) {
    // allThemes 目前不再参与 tags 渲染，但保留参数避免大范围改动。
    void allThemes;

    return (
        <div class="bv-fields-list">
            {tags.map(tag => (
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
