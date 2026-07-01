/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, ThemeDefinition } from '@core/types/public';
import { FieldPill } from './FieldPill';
import { ItemLink } from './ItemLink';
import type { MessageRenderPort } from '@core/ports/public';
import { MarkdownContent } from '../markdown/MarkdownContent';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler } from '../../types/actions';
import { createRecordGestureHandlers } from '../utils/recordOrigin';

interface BlockItemProps {
    item: Item;
    fields: string[];
    isNarrow: boolean;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    messageRenderPort?: MessageRenderPort;
    allThemes: ThemeDefinition[];
    onOpenRecord?: OpenRecordHandler;
}

export const BlockItem = ({ item, fields, isNarrow, resolveResourcePath, onOpenRecordOrigin, messageRenderPort, allThemes, onOpenRecord }: BlockItemProps) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'content');
    const showTitle = fields.includes('title') && item.title;
    const effectiveContent = (item.content && item.content.trim().length > 0) ? item.content : item.title;
    const showContent = fields.includes('content') && effectiveContent;
    const narrowClass = isNarrow ? 'is-narrow' : '';


    const gesture = createRecordGestureHandlers({
        item,
        onOpenOrigin: onOpenRecordOrigin,
        onPrimary: () => {
            try {
                void onOpenRecord?.(item);
            } catch {
                // no-op: editing should never crash rendering
            }
        },
    });

    return (
        <div class={`bv-item bv-item--block ${narrowClass}`}>
            <div class="bv-block-metadata">
                <div class="bv-fields-list-wrapper">
                    {metadataFields.map(fieldKey => (
                        <FieldPill 
                            key={fieldKey} 
                            item={item} 
                            fieldKey={fieldKey} 
                            resolveResourcePath={resolveResourcePath} 
                            allThemes={allThemes} 
                        />
                    ))}
                </div>
            </div>
            <div class="bv-block-main">
                {showTitle && (
                    <div class="bv-block-title">
                        <ItemLink item={item} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />
                    </div>
                )}
                {showContent && (
                    <div class="bv-block-content">
                        <MarkdownContent
                            renderPort={messageRenderPort}
                            content={effectiveContent || ''}
                            contentType="markdown"
                            sourcePath={item.file?.path || ''}
                            className="bv-block-md"
                            onClick={(evt: any) => {
                                const target = evt?.target as HTMLElement | null;
                                if (target?.closest('a')) return;
                                gesture.onClick(evt);
                            }}
                            onDblClick={(evt: any) => {
                                const target = evt?.target as HTMLElement | null;
                                if (target?.closest('a')) return;
                                gesture.onDblClick(evt);
                            }}
                            onTouchEnd={(evt: any) => {
                                const target = evt?.target as HTMLElement | null;
                                if (target?.closest('a')) return;
                                gesture.onTouchEnd(evt);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
