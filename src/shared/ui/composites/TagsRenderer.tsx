// src/shared/components/TagsRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';

interface TagsRendererProps {
    tags: string[];
}

export function TagsRenderer({ tags }: TagsRendererProps) {
    return (
        <div class="bv-fields-list">
            {tags.map(tag => (
                <span key={tag} class="tag-pill" title={`标签: ${tag}`}>
                    {tag}
                </span>
            ))}
        </div>
    );
}
