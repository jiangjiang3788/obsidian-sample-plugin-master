/** @jsxImportSource preact */
import { h } from 'preact';
import { App } from 'obsidian';
import { Item, ThemeDefinition } from '@/core/types/schema';
import { FieldPill } from '@shared/ui/items/FieldPill';
import { ItemLink } from '@shared/ui/items/ItemLink';

interface BlockItemProps {
    item: Item;
    fields: string[];
    isNarrow: boolean;
    app: App;
    allThemes: ThemeDefinition[];
}

export const BlockItem = ({ item, fields, isNarrow, app, allThemes }: BlockItemProps) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'content');
    const showTitle = fields.includes('title') && item.title;
    const showContent = fields.includes('content') && item.content;
    const narrowClass = isNarrow ? 'is-narrow' : '';

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
                        <ItemLink item={item} app={app} className="content-link" />
                    </div>
                )}
            </div>
        </div>
    );
};
