/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { App, Modal, Notice, setIcon } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { Item } from '../../../lib/types/domain/schema';
import { dayjs } from '../../../lib/utils/core/date';
import { getEffectiveDisplayCount, getEffectiveLevelCount } from '../../../lib/utils/core/levelingSystem';
import { makeObsUri } from '../../../lib/utils/core/obsidian';

// Types
interface CheckinManagerData {
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
}

// The main Preact component for the modal content
function CheckinManagerForm({ app, date, items, onSave, onClose }: CheckinManagerModalProps) {
    const [mode, setMode] = useState<'view' | 'edit'>(items.length > 0 ? 'view' : 'edit');
    const [isSaving, setIsSaving] = useState(false);

    const initialCounts = useMemo(() => {
        if (items.length > 0) {
            return {
                display: items.reduce((sum, i) => sum + getEffectiveDisplayCount(i), 0),
                level: items.reduce((sum, i) => sum + getEffectiveLevelCount(i), 0),
                countForLevel: items.every(i => i.countForLevel !== false),
            };
        }
        return { display: 0, level: 0, countForLevel: true };
    }, [items]);

    const [displayCount, setDisplayCount] = useState(initialCounts.display);
    const [levelCount, setLevelCount] = useState(initialCounts.level);
    const [includeInLevel, setIncludeInLevel] = useState(initialCounts.countForLevel);

    const handleSave = async () => {
        if (displayCount < 0 || levelCount < 0) {
            new Notice('次数不能为负数');
            return;
        }
        if (levelCount > displayCount) {
            new Notice('等级次数不能大于显示次数');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({ displayCount, levelCount, countForLevel: includeInLevel });
            onClose();
        } catch (error: any) {
            new Notice(`保存失败: ${error?.message || String(error)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleItemClick = (item: Item) => {
        if (item.file?.path) {
            const obsidianUri = makeObsUri(item, app);
            window.open(obsidianUri, '_blank');
            onClose();
        }
    };

    const renderViewMode = () => (
        <div class="checkin-details-list">
            {items.map(item => (
                <div
                    key={item.id}
                    className="checkin-details-item"
                    onClick={() => handleItemClick(item)}
                >
                    <div class="checkin-item-content">{item.content || '无内容'}</div>
                    <div class="checkin-item-meta">
                        {`记录于 ${dayjs(item.created).format('HH:mm:ss')} · 位置: ${item.file?.path}`}
                    </div>
                </div>
            ))}
            {!items.length && <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>该日无打卡记录</p>}
        </div>
    );

    const renderEditMode = () => (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <label>显示次数</label>
                <input
                    type="number"
                    min="0"
                    value={displayCount}
                    onChange={(e) => setDisplayCount(parseInt((e.target as HTMLInputElement).value) || 0)}
                />
                <small>在热力图中显示的打卡次数</small>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label>等级次数</label>
                <input
                    type="number"
                    min="0"
                    max={displayCount}
                    value={levelCount}
                    onChange={(e) => setLevelCount(parseInt((e.target as HTMLInputElement).value) || 0)}
                />
                <small>计入等级计算的次数（不能超过显示次数）</small>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label class="checkbox-container">
                    <input
                        type="checkbox"
                        checked={includeInLevel}
                        onChange={(e) => setIncludeInLevel((e.target as HTMLInputElement).checked)}
                    />
                    <span>计入等级计算</span>
                </label>
            </div>
        </div>
    );

    return (
        <div class="checkin-manager-modal">
            <div class="modal-header">
                <h3>{mode === 'view' ? `打卡详情 - ${date}` : `编辑次数 - ${date}`}</h3>
                <div class="modal-actions">
                    {items.length > 0 && (
                        <button class="mod-subtle" onClick={() => setMode(mode === 'view' ? 'edit' : 'view')} title={mode === 'view' ? '编辑次数' : '查看详情'}>
                            {mode === 'view' ? '编辑' : '详情'}
                        </button>
                    )}
                </div>
            </div>

            <div class="modal-content">
                {mode === 'view' ? renderViewMode() : renderEditMode()}
            </div>

            <div class="modal-footer">
                <button onClick={onClose} disabled={isSaving}>取消</button>
                {mode === 'edit' && (
                    <button class="mod-cta" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                )}
            </div>
        </div>
    );
}

export class CheckinManagerModal extends Modal {
    constructor(
        app: App,
        private date: string,
        private items: Item[],
        private onSave: (data: CheckinManagerData) => Promise<void>
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
            />,
            this.contentEl
        );
        
        // Add some styles
        this.contentEl.createEl('style').textContent = `
            .checkin-manager-modal-container .modal-content { padding: 0; }
            .checkin-manager-modal { display: flex; flex-direction: column; height: 100%; }
            .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--background-modifier-border); }
            .modal-header h3 { margin: 0; font-size: 1.2em; }
            .modal-content { padding: 16px; flex-grow: 1; }
            .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--background-modifier-border); }
            .checkin-details-item { padding: 10px 0; border-bottom: 1px solid var(--background-modifier-border); cursor: pointer; transition: background-color 0.2s ease; }
            .checkin-details-item:hover { background-color: var(--background-modifier-hover); }
            .checkin-details-item:last-child { border-bottom: none; }
            .checkin-item-content { font-weight: 500; }
            .checkin-item-meta { font-size: var(--font-ui-smaller); color: var(--text-muted); margin-top: 4px; }
            .checkin-manager-modal label { display: block; font-weight: bold; margin-bottom: 4px; }
            .checkin-manager-modal small { color: var(--text-muted); font-size: 12px; }
            .checkin-manager-modal input[type="number"] { width: 100%; }
            .checkbox-container { display: flex; align-items: center; gap: 8px; font-weight: normal; }
        `;
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}
