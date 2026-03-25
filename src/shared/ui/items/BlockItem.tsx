/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, ThemeDefinition } from '@core/public';
import { FieldPill } from '@shared/ui/items/FieldPill';
import { ItemLink } from '@shared/ui/items/ItemLink';
import type { MessageRenderPort } from '@core/public';
import { MarkdownContent } from '@shared/ui/markdown/MarkdownContent';
import { openEditFromItem } from '@/app/actions/recordUiActions';

interface BlockItemProps {
    item: Item;
    fields: string[];
    isNarrow: boolean;
    app: any;
    messageRenderPort?: MessageRenderPort;
    allThemes: ThemeDefinition[];
}

export const BlockItem = ({ item, fields, isNarrow, app, messageRenderPort, allThemes }: BlockItemProps) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'content');
    const showTitle = fields.includes('title') && item.title;
    const effectiveContent = (item.content && item.content.trim().length > 0) ? item.content : item.title;
    const showContent = fields.includes('content') && effectiveContent;
    const narrowClass = isNarrow ? 'is-narrow' : '';

    const openEditModal = (evt: MouseEvent) => {
        try {
            const target = evt.target as HTMLElement | null;
            if (target?.closest('a')) return;
            openEditFromItem({ app, item });
        } catch {
            // no-op: editing should never crash rendering
        }
    };

    return (
        <div class={`bv-item bv-item--block ${narrowClass}`}>
            <div class="bv-block-metadata">
                <div class="bv-fields-list-wrapper">
                    {metadataFields.map(fieldKey => (
                        <FieldPill 
                            key={fieldKey} 
                            item={item} 
                            fieldKey={fieldKey} 
                            app={app} 
                            allThemes={allThemes} 
                        />
                    ))}
                </div>
            </div>
            <div class="bv-block-main">
                {showTitle && (
                    <div class="bv-block-title">
                        <ItemLink item={item} app={app} />
                    </div>
                )}
                {showContent && (
                    <div class="bv-block-content">
                        <MarkdownContent
                            renderPort={messageRenderPort}
                            app={app}
                            content={effectiveContent || ''}
                            contentType="markdown"
                            sourcePath={item.file?.path || ''}
                            className="bv-block-md"
                            onClick={openEditModal as any}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
