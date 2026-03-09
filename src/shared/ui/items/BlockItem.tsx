/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, ThemeDefinition } from '@core/public';
import { FieldPill } from '@shared/ui/items/FieldPill';
import { ItemLink } from '@shared/ui/items/ItemLink';
import type { MessageRenderPort } from '@core/public';
import { makeObsUri } from '@core/public';
import { MarkdownContent } from '@shared/ui/markdown/MarkdownContent';

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
    // Many "task" items have empty content (their main text lives in title).
    // In layouts that only show content, we fallback to title so users always see something.
    const effectiveContent = (item.content && item.content.trim().length > 0) ? item.content : item.title;
    const showContent = fields.includes('content') && effectiveContent;
    const narrowClass = isNarrow ? 'is-narrow' : '';

    const openSourceAtLine = (evt: MouseEvent) => {
        try {
            // Let normal link clicks inside markdown behave normally.
            const target = evt.target as HTMLElement | null;
            if (target?.closest('a')) return;

            const path = item.file?.path;
            if (!path) return;

            evt.preventDefault();
            evt.stopPropagation();

            // 优先走 advanced-uri：它在插件/浮窗/统计弹层里更稳定，且能明确跳到具体行。
            const vaultName = app?.vault?.getName?.();
            const obsidianUri = makeObsUri(item, vaultName);
            if (obsidianUri && !obsidianUri.startsWith('#error-') && typeof window !== 'undefined' && typeof window.open === 'function') {
                window.open(obsidianUri, '_self');
                return;
            }

            // Fallback 1：openFile（行号使用 0-based，避免落到错误行）
            const file = app?.vault?.getAbstractFileByPath?.(path);
            if (file) {
                const rawLine = typeof item.file?.line === 'number' ? item.file.line : 1;
                const line = Math.max(0, rawLine - 1);
                const leaf = app?.workspace?.getLeaf?.(false);
                if (leaf?.openFile) {
                    leaf.openFile(file, { state: { line } });
                    return;
                }
            }

            // Fallback 2：openLinkText
            if (app?.workspace?.openLinkText) {
                const rawLine = typeof item.file?.line === 'number' ? item.file.line : 1;
                const line = Math.max(0, rawLine - 1);
                app.workspace.openLinkText(path, '', false, { state: { line } });
            }
        } catch {
            // no-op: navigation should never crash rendering
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
                            onClick={openSourceAtLine as any}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
