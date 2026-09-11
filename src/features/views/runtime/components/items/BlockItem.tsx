/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import { getRecordPrimaryText } from '@core/fields/public';
import { FieldPill } from './FieldPill';
import { ItemLink } from './ItemLink';
import type { MessageRenderPort } from '@core/ports/public';
import { MarkdownContent } from '@shared/ui/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { createRecordGestureHandlers } from '@shared/ui/public';

interface BlockItemProps {
    item: RecordViewItem;
    fields: string[];
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    messageRenderPort?: MessageRenderPort;
    onOpenRecord?: OpenRecordHandler;
}

export const BlockItem = ({ item, fields, resolveResourcePath, onOpenRecordOrigin, messageRenderPort, onOpenRecord }: BlockItemProps) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'primaryText' && f !== 'content');
    const showTitle = fields.includes('title') && Boolean(item.title);
    const showPrimaryText = fields.includes('primaryText');
    const primaryText = getRecordPrimaryText(item);
    const effectiveContent = (item.content && item.content.trim().length > 0) ? item.content : item.title;
    const showContent = fields.includes('content') && effectiveContent;

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
        <div class="bv-item bv-item--block think-list-row think-list-row--interactive" data-record-type={item.coreBlock}>
            <div class="bv-block-metadata">
                <div class="bv-fields-list-wrapper">
                    {metadataFields.map(fieldKey => (
                        <FieldPill
                            key={fieldKey}
                            item={item}
                            fieldKey={fieldKey}
                            resolveResourcePath={resolveResourcePath}
                            onOpenRecordOrigin={onOpenRecordOrigin}
                        />
                    ))}
                </div>
            </div>
            <div class="bv-block-main">
                {showPrimaryText && (
                    <div class="bv-block-title bv-block-title--primary-text">
                        <ItemLink item={item} displayText={primaryText} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />
                    </div>
                )}
                {showTitle && !showPrimaryText && (
                    <div class="bv-block-title">
                        <ItemLink item={item} displayText={item.title} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />
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
