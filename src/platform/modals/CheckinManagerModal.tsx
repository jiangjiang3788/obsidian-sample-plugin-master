/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { App, Modal, Notice } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { Item, dayjs } from '@core/public';
import { openEditFromItem } from '@/app/actions/recordUiActions';
import { createRecordGestureHandlers } from '@/shared/ui/utils/recordOrigin';

export interface CheckinManagerData {
    displayCount: number;
    levelCount: number;
    countForLevel: boolean;
}

interface CheckinManagerModalProps {
    app: App;
    date: string;
    items: Item[];
    onSave: (data: CheckinManagerData) => Promise<void>;
    onClose: () => void;
    onAddRecord?: () => void;
}

function CheckinManagerForm({ app, date, items, onClose, onAddRecord }: CheckinManagerModalProps) {
    const sortedItems = useMemo(() => [...items].sort((a, b) => (a.created || 0) - (b.created || 0)), [items]);

    const handleOpenRecord = (item: Item) => {
        if (!item.file?.path) return;
        try {
            openEditFromItem({ app, item });
            onClose();
        } catch (error: any) {
            new Notice(`打开记录失败: ${error?.message || String(error)}`);
        }
    };

    return (
        <div class="checkin-manager-modal">
            <div class="modal-header">
                <div>
                    <h3 style={{ margin: 0 }}>{`当天记录 - ${date}`}</h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                        {sortedItems.length > 0 ? `共 ${sortedItems.length} 条记录` : '当天还没有记录'}
                    </div>
                </div>
                <div class="modal-actions">
                    {onAddRecord && <button class="mod-cta" onClick={onAddRecord}>新增记录</button>}
                </div>
            </div>

            <div class="modal-content">
                {sortedItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                        点击右上角“新增记录”开始打卡。
                    </div>
                ) : (
                    <div class="checkin-details-list">
                        {sortedItems.map(item => {
                            const gesture = createRecordGestureHandlers({
                                item,
                                app,
                                onPrimary: () => handleOpenRecord(item),
                            });
                            return (
                            <div
                                key={item.id}
                                class="checkin-details-item"
                                onClick={gesture.onClick as any}
                                onDblClick={gesture.onDblClick as any}
                                onTouchEnd={gesture.onTouchEnd as any}
                            >
                                <div class="checkin-item-content">{item.content || item.title || '无内容'}</div>
                                <div class="checkin-item-meta">
                                    {`${dayjs(item.created).format('HH:mm:ss')} · ${item.file?.path || '未知位置'}`}
                                </div>
                            </div>
                        );})}
                    </div>
                )}
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
        private onSave: (data: CheckinManagerData) => Promise<void>,
        private onAddRecord?: () => void
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
                onSave={this.onSave}
                onClose={() => this.close()}
                onAddRecord={this.onAddRecord}
            />,
            this.contentEl
        );

        this.contentEl.createEl('style').textContent = `
            .checkin-manager-modal-container .modal-content { padding: 0; }
            .checkin-manager-modal { display: flex; flex-direction: column; height: 100%; }
            .modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--background-modifier-border); }
            .modal-content { padding: 16px; flex-grow: 1; }
            .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--background-modifier-border); }
            .checkin-details-item { padding: 10px 0; border-bottom: 1px solid var(--background-modifier-border); cursor: pointer; transition: background-color 0.2s ease; }
            .checkin-details-item:hover { background-color: var(--background-modifier-hover); }
            .checkin-details-item:last-child { border-bottom: none; }
            .checkin-item-content { font-weight: 500; }
            .checkin-item-meta { font-size: var(--font-ui-smaller); color: var(--text-muted); margin-top: 4px; }
        `;
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}
