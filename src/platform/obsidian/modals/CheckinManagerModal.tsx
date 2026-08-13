/** @jsxImportSource preact */
import { useMemo, useState } from 'preact/hooks';
import { App, Modal, Notice } from 'obsidian';
import type { RecordViewItem } from '@core/types/public';
import { dayjs } from '@core/utils/public';
import { openEditFromItem, openRecordOrigin } from '@/app/public';
import {
    ModalHeader,
    ThinkButton,
    createRecordGestureHandlers,
    RECORD_GESTURE_HINT,
} from '@shared/ui/public';
import { prepareThinkModal, renderModalContent, unmountModalContent } from './modalPreact';

export interface CheckinManagerData {
    displayCount: number;
    levelCount: number;
    countForLevel: boolean;
}

interface CheckinManagerModalProps {
    app: App;
    date: string;
    items: RecordViewItem[];
    onSave: (data: CheckinManagerData) => Promise<void>;
    onClose: () => void;
    onAddRecord?: () => void;
    onDeleteRecord?: (item: RecordViewItem) => Promise<boolean> | boolean | void;
}

function CheckinManagerForm({ app, date, items, onClose, onAddRecord, onDeleteRecord }: CheckinManagerModalProps) {
    const [managedItems, setManagedItems] = useState<RecordViewItem[]>(() => items || []);
    const sortedItems = useMemo(() => [...managedItems].sort((a, b) => (a.created || 0) - (b.created || 0)), [managedItems]);

    const handleOpenRecord = (item: RecordViewItem) => {
        if (!item.file?.path) return;
        try {
            openEditFromItem({ app, item });
            onClose();
        } catch (error: any) {
            new Notice(`打开记录失败: ${error?.message || String(error)}`);
        }
    };

    const handleDeleteRecord = async (event: MouseEvent, item: RecordViewItem) => {
        event.preventDefault();
        event.stopPropagation();
        if (!onDeleteRecord) return;
        try {
            const result = await onDeleteRecord(item);
            if (result !== false) setManagedItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
        } catch (error: any) {
            new Notice(`删除记录失败: ${error?.message || String(error)}`);
        }
    };

    return (
        <div className="think-overlay-form think-checkin-modal">
            <ModalHeader
                left={
                    <div className="think-overlay-title-stack">
                        <strong>{`当天记录 · ${date}`}</strong>
                        <span>{sortedItems.length ? `${sortedItems.length} 条` : '暂无记录'}</span>
                    </div>
                }
                right={
                    onAddRecord
                        ? <ThinkButton size="sm" variant="primary" onClick={onAddRecord}>新增记录</ThinkButton>
                        : null
                }
                onClose={onClose}
            />

            <div className="think-overlay-body think-checkin-modal__content">
                {sortedItems.length === 0 ? (
                    <div className="think-overlay-empty">暂无当天记录</div>
                ) : (
                    <div className="think-checkin-modal__list">
                        {sortedItems.map((item) => {
                            const gesture = createRecordGestureHandlers({
                                item,
                                onOpenOrigin: (originItem) => openRecordOrigin({ app, item: originItem }),
                                onPrimary: () => handleOpenRecord(item),
                            });
                            return (
                                <div
                                    key={item.id}
                                    className="think-checkin-modal__item"
                                    title={RECORD_GESTURE_HINT}
                                    role="button"
                                    tabIndex={0}
                                    onClick={gesture.onClick as any}
                                    onDblClick={gesture.onDblClick as any}
                                    onTouchEnd={gesture.onTouchEnd as any}
                                    onKeyDown={gesture.onKeyDown as any}
                                >
                                    <div className="think-checkin-modal__item-main">
                                        <div className="think-checkin-modal__item-content">{item.content || item.title || '无内容'}</div>
                                        <div className="think-checkin-modal__item-meta">
                                            {`${dayjs(item.created).format('HH:mm:ss')} · ${item.file?.path || '未知位置'}`}
                                        </div>
                                    </div>
                                    {onDeleteRecord ? (
                                        <ThinkButton
                                            size="sm"
                                            variant="ghost"
                                            className="think-checkin-modal__item-delete"
                                            onClick={(event) => handleDeleteRecord(event as unknown as MouseEvent, item)}
                                        >删除</ThinkButton>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export class CheckinManagerModal extends Modal {
    constructor(
        app: App,
        private date: string,
        private items: RecordViewItem[],
        private onSave: (data: CheckinManagerData) => Promise<void>,
        private onAddRecord?: () => void,
        private onDeleteRecord?: (item: RecordViewItem) => Promise<boolean> | boolean | void
    ) { super(app); }

    onOpen() {
        prepareThinkModal(this, 'think-modal-host--large', 'think-checkin-modal-host');
        renderModalContent(this.contentEl, (
            <CheckinManagerForm
                app={this.app}
                date={this.date}
                items={this.items}
                onSave={this.onSave}
                onClose={() => this.close()}
                onAddRecord={this.onAddRecord}
                onDeleteRecord={this.onDeleteRecord}
            />
        ));
    }

    onClose() { unmountModalContent(this.contentEl); }
}
