// src/views/Dashboard/ui/CountEditModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { App, Modal, Notice } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';

interface CountEditData {
    displayCount: number;
    levelCount: number;
    countForLevel: boolean;
}

interface CountEditModalProps {
    app: App;
    date: string;
    currentDisplayCount: number;
    currentLevelCount: number;
    countForLevel: boolean;
    onSave: (data: CountEditData) => Promise<void>;
    onClose: () => void;
}

function CountEditForm({ date, currentDisplayCount, currentLevelCount, countForLevel, onSave, onClose }: Omit<CountEditModalProps, 'app'>) {
    const [displayCount, setDisplayCount] = useState(currentDisplayCount);
    const [levelCount, setLevelCount] = useState(currentLevelCount);
    const [includeInLevel, setIncludeInLevel] = useState(countForLevel);
    const [isSaving, setIsSaving] = useState(false);

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
            await onSave({
                displayCount,
                levelCount,
                countForLevel: includeInLevel
            });
            new Notice('打卡次数已更新');
            onClose();
        } catch (error: any) {
            new Notice(`保存失败: ${error?.message || String(error)}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div class="count-edit-modal" style={{
            padding: '20px',
            maxWidth: '400px'
        }}>
            <h3 style={{ margin: '0 0 16px 0' }}>编辑打卡次数</h3>
            <p style={{ 
                margin: '0 0 16px 0', 
                fontSize: '14px', 
                color: 'var(--text-muted)' 
            }}>
                日期: {date}
            </p>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '4px' 
                }}>
                    显示次数
                </label>
                <input
                    type="number"
                    min="0"
                    value={displayCount}
                    onChange={(e) => setDisplayCount(parseInt((e.target as HTMLInputElement).value) || 0)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                />
                <small style={{ 
                    color: 'var(--text-muted)',
                    fontSize: '12px' 
                }}>
                    在热力图中显示的打卡次数
                </small>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '4px' 
                }}>
                    等级次数
                </label>
                <input
                    type="number"
                    min="0"
                    max={displayCount}
                    value={levelCount}
                    onChange={(e) => setLevelCount(parseInt((e.target as HTMLInputElement).value) || 0)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                />
                <small style={{ 
                    color: 'var(--text-muted)',
                    fontSize: '12px' 
                }}>
                    计入等级计算的次数（不能超过显示次数）
                </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer'
                }}>
                    <input
                        type="checkbox"
                        checked={includeInLevel}
                        onChange={(e) => setIncludeInLevel((e.target as HTMLInputElement).checked)}
                    />
                    <span>计入等级计算</span>
                </label>
                <small style={{ 
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    marginLeft: '24px'
                }}>
                    取消勾选则此次打卡不会影响等级进度
                </small>
            </div>

            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                justifyContent: 'flex-end' 
            }}>
                <button
                    onClick={onClose}
                    disabled={isSaving}
                    style={{
                        padding: '8px 16px',
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '4px',
                        background: 'var(--background-primary)',
                        cursor: 'pointer'
                    }}
                >
                    取消
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        background: 'var(--interactive-accent)',
                        color: 'var(--text-on-accent)',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.6 : 1
                    }}
                >
                    {isSaving ? '保存中...' : '保存'}
                </button>
            </div>
        </div>
    );
}

export class CountEditModal extends Modal {
    constructor(
        app: App,
        private date: string,
        private currentDisplayCount: number,
        private currentLevelCount: number,
        private countForLevel: boolean,
        private onSave: (data: CountEditData) => Promise<void>
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('count-edit-modal-container');
        
        render(
            <CountEditForm
                date={this.date}
                currentDisplayCount={this.currentDisplayCount}
                currentLevelCount={this.currentLevelCount}
                countForLevel={this.countForLevel}
                onSave={this.onSave}
                onClose={() => this.close()}
            />,
            this.contentEl
        );
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}
