/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { App, Modal, Notice } from 'obsidian';
import { Item } from '@core/types/public';
import { dayjs } from '@core/utils/public';
import { openEditFromItem, openRecordOrigin } from '@/app/public';
import { createRecordGestureHandlers } from '@shared/ui/public';
import { prepareThinkModal, renderModalContent, unmountModalContent } from './modalPreact';

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
    onDeleteRecord?: (item: Item) => Promise<boolean> | boolean | void;
}

function CheckinManagerForm({ app, date, items, onClose, onAddRecord, onDeleteRecord }: CheckinManagerModalProps) {
    const [managedItems, setManagedItems] = useState<Item[]>(() => items || []);
    const sortedItems = useMemo(() => [...managedItems].sort((a, b) => (a.created || 0) - (b.created || 0)), [managedItems]);

    const handleOpenRecord = (item: Item) => {
        if (!item.file?.path) return;
        try {
            openEditFromItem({ app, item });
            onClose();
        } catch (error: any) {
            new Notice(`打开记录失败: ${error?.message || String(error)}`);
        }
    };


    const handleDeleteRecord = async (event: MouseEvent, item: Item) => {
        event.preventDefault();
        event.stopPropagation();
        if (!onDeleteRecord) return;
        try {
            const result = await onDeleteRecord(item);
            if (result !== false) {
                setManagedItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
            }
        } catch (error: any) {
            new Notice(`删除记录失败: ${error?.message || String(error)}`);
        }
    };

    return (
        <div class="think-checkin-modal">
            <div class="think-checkin-modal__header">
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

            <div class="think-checkin-modal__content">
                {sortedItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                        点击右上角“新增记录”开始打卡。
                    </div>
                ) : (
                    <div class="think-checkin-modal__list">
                        {sortedItems.map(item => {
                            const gesture = createRecordGestureHandlers({
                                item,
                                onOpenOrigin: (originItem) => openRecordOrigin({ app, item: originItem }),
                                onPrimary: () => handleOpenRecord(item),
                            });
                            return (
                            <div
                                key={item.id}
                                class="think-checkin-modal__item"
                                onClick={gesture.onClick as any}
                                onDblClick={gesture.onDblClick as any}
                                onTouchEnd={gesture.onTouchEnd as any}
                            >
                                <div class="think-checkin-modal__item-main">
                                    <div class="think-checkin-modal__item-content">{item.content || item.title || '无内容'}</div>
                                    <div class="think-checkin-modal__item-meta">
                                        {`${dayjs(item.created).format('HH:mm:ss')} · ${item.file?.path || '未知位置'}`}
                                    </div>
                                </div>
                                <div class="think-checkin-modal__item-actions">
                                    {onDeleteRecord && (
                                        <button
                                            class="think-checkin-modal__item-delete"
                                            title="删除这条记录"
                                            onClick={(event) => handleDeleteRecord(event as MouseEvent, item)}
                                        >
                                            删除
                                        </button>
                                    )}
                                </div>
                            </div>
                        );})}
                    </div>
                )}
            </div>

            <div class="think-checkin-modal__footer">
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
        private onAddRecord?: () => void,
        private onDeleteRecord?: (item: Item) => Promise<boolean> | boolean | void
    ) {
        super(app);
    }

    onOpen() {
        prepareThinkModal(this, 'think-modal-host--large', 'think-checkin-modal-host');

        renderModalContent(
            this.contentEl,
            <CheckinManagerForm
                app={this.app}
                date={this.date}
                items={this.items}
                onSave={this.onSave}
                onClose={() => this.close()}
                onAddRecord={this.onAddRecord}
                onDeleteRecord={this.onDeleteRecord}
            />
        );


    }

    onClose() {
        unmountModalContent(this.contentEl);
    }
}
