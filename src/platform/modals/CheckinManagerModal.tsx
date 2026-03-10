/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { Item } from '@core/public';
import { dayjs } from '@core/public';
import { makeObsUri } from '@core/public';

interface CheckinManagerModalProps {
    app: App;
    date: string;
    items: Item[];
    onAdd: () => void;
    onEditItem: (item: Item) => void;
    onClose: () => void;
}

function CheckinManagerForm({ app, date, items, onAdd, onEditItem, onClose }: CheckinManagerModalProps) {
    const handleOpenSource = (item: Item, e: MouseEvent) => {
        e.stopPropagation();
        if (item.file?.path) {
            const obsidianUri = makeObsUri(item, app.vault.getName());
            window.open(obsidianUri, '_blank');
        }
    };

    return (
        <div class="checkin-manager-modal">
            <div class="modal-header">
                <h3>{`当天记录 · ${date}`}</h3>
                <div class="modal-actions">
                    <button class="mod-cta" onClick={onAdd}>新增记录</button>
                </div>
            </div>

            <div class="modal-content">
                <div class="checkin-details-list">
                    {items.map(item => (
                        <div key={item.id} className="checkin-details-item" onClick={() => onEditItem(item)}>
                            <div class="checkin-item-content">{item.content || item.title || '无内容'}</div>
                            <div class="checkin-item-meta">
                                {`记录于 ${dayjs(item.created).format('HH:mm:ss')} · ${item.file?.path || ''}`}
                            </div>
                            <div class="checkin-item-actions">
                                <button class="mod-subtle" onClick={(e) => handleOpenSource(item, e as any)}>原文</button>
                                <button class="mod-subtle" onClick={(e) => { e.stopPropagation(); onEditItem(item); }}>编辑</button>
                            </div>
                        </div>
                    ))}
                    {!items.length && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>该日暂无记录，点击“新增记录”开始打卡。</p>}
                </div>
            </div>

            <div class="modal-footer">
                <button onClick={onClose}>关闭</button>
            </div>
        </div>
    );
}

export class CheckinManagerModal extends Modal {
    constructor(
        app: App,
        private date: string,
        private items: Item[],
        private onAdd: () => void,
        private onEditItem: (item: Item) => void,
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('checkin-manager-modal-container');
        render(
            <CheckinManagerForm
                app={this.app}
                date={this.date}
                items={this.items}
                onAdd={() => {
                    this.close();
                    this.onAdd();
                }}
                onEditItem={(item) => {
                    this.close();
                    this.onEditItem(item);
                }}
                onClose={() => this.close()}
            />,
            this.contentEl
        );

        this.contentEl.createEl('style').textContent = `
            .checkin-manager-modal-container .modal-content { padding: 0; }
            .checkin-manager-modal { display: flex; flex-direction: column; height: 100%; }
            .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--background-modifier-border); }
            .modal-header h3 { margin: 0; font-size: 1.1em; }
            .modal-content { padding: 16px; flex-grow: 1; }
            .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--background-modifier-border); }
            .checkin-details-item { padding: 10px 12px; border: 1px solid var(--background-modifier-border); border-radius: 8px; margin-bottom: 10px; cursor: pointer; }
            .checkin-details-item:hover { background-color: var(--background-modifier-hover); }
            .checkin-item-content { font-weight: 500; white-space: pre-wrap; }
            .checkin-item-meta { font-size: var(--font-ui-smaller); color: var(--text-muted); margin-top: 4px; }
            .checkin-item-actions { display: flex; gap: 8px; margin-top: 8px; }
        `;
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}
