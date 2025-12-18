// src/features/aiinput/AiBatchConfirmModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { useStore } from '@/app/AppStore';
import type { InputSettings, BlockTemplate, ThemeDefinition, TemplateField } from '@/core/types/schema';
import type { NaturalRecordCommand } from '@/core/types/ai-schema';
import { Button, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack, Divider, Box, IconButton, Tooltip, Chip, List, ListItem, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteIcon from '@mui/icons-material/Delete';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';
import { buildThemeTree, ThemeTreeNode } from '@core/utils/themeUtils';
import { dayjs, timeToMinutes, minutesToTime } from '@core/utils/date';
import { inputService, dataStore } from '@/app/storeRegistry';
import { renderTemplate } from '@core/utils/templateUtils';

interface RecordItem {
    id: string;
    cmd: NaturalRecordCommand;
    blockId: string;
    themeId?: string;
    formData: Record<string, any>;
    saved: boolean;
    skipped: boolean;
}

interface AiBatchConfirmModalProps {
    app: App;
    items: NaturalRecordCommand[];
    onComplete: () => void;
}

export class AiBatchConfirmModal extends Modal {
    constructor(
        app: App,
        private items: NaturalRecordCommand[],
        private onComplete?: () => void
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('think-ai-batch-confirm-modal');
        this.modalEl.style.width = '90vw';
        this.modalEl.style.maxWidth = '900px';
        this.modalEl.style.height = '80vh';
        
        render(
            <AiBatchConfirmForm
                app={this.app}
                items={this.items}
                closeModal={() => this.close()}
                onComplete={this.onComplete}
            />,
            this.contentEl
        );
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}

function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; theme: ThemeDefinition | null } {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return { template: null, theme: null };
    const theme = settings.themes.find(t => t.id === themeId) || null;
    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        if (override && !override.disabled) {
            const effectiveTemplate: BlockTemplate = { ...baseBlock, fields: override.fields ?? baseBlock.fields, outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, targetFile: override.targetFile ?? baseBlock.targetFile, appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader };
            return { template: effectiveTemplate, theme };
        }
    }
    return { template: baseBlock, theme };
}

const findNodePath = (nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode[] => {
    for (const node of nodes) {
        if (node.themeId === themeId) return [node];
        if (node.children.length > 0) {
            const path = findNodePath(node.children, themeId);
            if (path.length > 0) return [node, ...path];
        }
    }
    return [];
};

const renderThemeLevels = (nodes: ThemeTreeNode[], activePath: ThemeTreeNode[], onSelect: (id: string, parentId: string | null) => void, level = 0) => {
    const parentNode = activePath[level - 1];
    const parentThemeId = parentNode ? parentNode.themeId : null;
    return (
        <div>
            <MuiRadioGroup row value={activePath[level]?.themeId || ''}>
                {nodes.map(node => (
                    <FormControlLabel
                        key={node.id}
                        value={node.themeId}
                        disabled={!node.themeId}
                        control={<Radio onClick={() => node.themeId && onSelect(node.themeId, parentThemeId)} size="small" />}
                        label={node.name}
                    />
                ))}
            </MuiRadioGroup>
            {activePath[level] && activePath[level].children.length > 0 && (
                <div style={{ paddingLeft: '20px' }}>
                    {renderThemeLevels(activePath[level].children, activePath, onSelect, level + 1)}
                </div>
            )}
        </div>
    );
};

function AiBatchConfirmForm({ app, items: initialItems, closeModal, onComplete }: {
    app: App;
    items: NaturalRecordCommand[];
    closeModal: () => void;
    onComplete?: () => void;
}) {
    const settings = useStore(state => state.settings.inputSettings);
    const blocks = settings.blocks || [];
    const themes = settings.themes || [];
    
    // 初始化记录列表
    const [records, setRecords] = useState<RecordItem[]>(() => 
        initialItems.map((cmd, index) => {
            // 查找匹配的 block
            let block = blocks.find(b => b.id === cmd.target.blockId);
            if (!block) block = blocks.find(b => b.name === cmd.target.blockId);
            if (!block && blocks.length > 0) block = blocks[0];
            
            // 查找匹配的 theme
            let themeId: string | undefined;
            if (cmd.target.themeId) {
                const theme = themes.find(t => t.id === cmd.target.themeId || t.path === cmd.target.themeId);
                if (theme) themeId = theme.id;
            }
            if (!themeId && themes.length > 0) themeId = themes[0].id;
            
            return {
                id: `record-${index}`,
                cmd,
                blockId: block?.id || '',
                themeId,
                formData: { ...cmd.fieldValues },
                saved: false,
                skipped: false,
            };
        })
    );
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentRecord = records[currentIndex];
    
    // 当前记录的 template 和 theme
    const { template, theme, themeTree, themeIdMap } = useMemo(() => {
        if (!currentRecord) return { template: null, theme: null, themeTree: [], themeIdMap: new Map() };
        
        const { template, theme } = getEffectiveTemplate(settings, currentRecord.blockId, currentRecord.themeId);
        
        const disabledThemeIds = new Set<string>();
        settings.overrides.forEach(override => {
            if (override.blockId === currentRecord.blockId && override.disabled) {
                disabledThemeIds.add(override.themeId);
            }
        });
        const availableThemes = themes.filter(t => !disabledThemeIds.has(t.id));
        const themeTree = buildThemeTree(availableThemes);
        const themeIdMap = new Map<string, ThemeDefinition>(themes.map(t => [t.id, t]));
        
        return { template, theme, themeTree, themeIdMap };
    }, [settings, currentRecord?.blockId, currentRecord?.themeId]);
    
    // 更新当前记录
    const updateCurrentRecord = (updates: Partial<RecordItem>) => {
        setRecords(prev => prev.map((r, i) => 
            i === currentIndex ? { ...r, ...updates } : r
        ));
    };
    
    // 更新表单数据
    const handleFormUpdate = (key: string, value: any, isOptionObject = false) => {
        const newFormData = {
            ...currentRecord.formData,
            [key]: isOptionObject ? { value: value.value, label: value.label } : value,
            lastChanged: key
        };
        updateCurrentRecord({ formData: newFormData });
    };
    
    // 切换 Block
    const handleBlockChange = (newBlockId: string) => {
        if (newBlockId === currentRecord.blockId) return;
        
        const preservedData: Record<string, any> = {};
        const commonFields = ['内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description'];
        commonFields.forEach(key => {
            if (currentRecord.formData[key] !== undefined) {
                preservedData[key] = currentRecord.formData[key];
            }
        });
        
        updateCurrentRecord({ blockId: newBlockId, formData: preservedData });
    };
    
    // 切换主题
    const handleThemeSelect = (newThemeId: string, parentThemeId: string | null) => {
        const finalThemeId = currentRecord.themeId === newThemeId ? parentThemeId : newThemeId;
        updateCurrentRecord({ themeId: finalThemeId || undefined });
    };
    
    // 保存当前记录
    const handleSaveCurrent = async () => {
        if (!template || !inputService) {
            new Notice('保存失败：模板或服务未初始化');
            return;
        }
        
        const finalData = { ...currentRecord.formData };
        const startM = timeToMinutes(finalData.时间);
        const endM = timeToMinutes(finalData.结束);
        let durM = !isNaN(parseInt(finalData.时长)) ? parseInt(finalData.时长) : null;

        if (startM !== null && endM !== null) {
            let finalDuration = endM - startM;
            if (finalDuration < 0) finalDuration += 24 * 60;
            finalData.时长 = finalDuration;
        } else if (startM !== null && durM !== null) {
            finalData.结束 = minutesToTime(startM + durM);
        } else if (endM !== null && durM !== null) {
            finalData.时间 = minutesToTime(endM - durM);
        }
        
        const finalTheme = currentRecord.themeId ? themeIdMap.get(currentRecord.themeId) : undefined;
        
        try {
            await inputService.executeTemplate(template, finalData, finalTheme);
            updateCurrentRecord({ saved: true });
            new Notice(`✅ 第 ${currentIndex + 1} 条已保存`);
            dataStore?.notifyChange?.();
            
            // 自动跳转到下一条未处理的记录
            const nextUnsaved = records.findIndex((r, i) => i > currentIndex && !r.saved && !r.skipped);
            if (nextUnsaved >= 0) {
                setCurrentIndex(nextUnsaved);
            }
        } catch (e: any) {
            new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
        }
    };
    
    // 跳过当前记录
    const handleSkipCurrent = () => {
        updateCurrentRecord({ skipped: true });
        
        // 自动跳转到下一条未处理的记录
        const nextUnsaved = records.findIndex((r, i) => i > currentIndex && !r.saved && !r.skipped);
        if (nextUnsaved >= 0) {
            setCurrentIndex(nextUnsaved);
        }
    };
    
    // 保存所有未处理的记录
    const handleSaveAll = async () => {
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            if (record.saved || record.skipped) continue;
            
            setCurrentIndex(i);
            const { template } = getEffectiveTemplate(settings, record.blockId, record.themeId);
            if (!template || !inputService) continue;
            
            const finalData = { ...record.formData };
            const finalTheme = record.themeId ? themeIdMap.get(record.themeId) : undefined;
            
            try {
                await inputService.executeTemplate(template, finalData, finalTheme);
                setRecords(prev => prev.map((r, idx) => idx === i ? { ...r, saved: true } : r));
            } catch (e: any) {
                new Notice(`❌ 第 ${i + 1} 条保存失败: ${e.message || e}`);
            }
        }
        
        new Notice('✅ 批量保存完成');
        dataStore?.notifyChange?.();
    };
    
    // 完成并关闭
    const handleComplete = () => {
        const savedCount = records.filter(r => r.saved).length;
        const skippedCount = records.filter(r => r.skipped).length;
        new Notice(`完成：已保存 ${savedCount} 条，跳过 ${skippedCount} 条`);
        onComplete?.();
        closeModal();
    };
    
    // 统计
    const savedCount = records.filter(r => r.saved).length;
    const skippedCount = records.filter(r => r.skipped).length;
    const pendingCount = records.length - savedCount - skippedCount;
    
    // 渲染字段
    const renderField = (field: TemplateField) => {
        const formData = currentRecord.formData;
        const isComplex = typeof formData[field.key] === 'object' && formData[field.key] !== null;
        const value = isComplex ? formData[field.key]?.value : formData[field.key];
        const label = field.label || field.key;

        switch (field.type) {
            case 'rating':
                return (
                    <FormControl component="fieldset">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {(field.options || []).map(opt => {
                                const isSelected = isComplex && formData[field.key]?.label === opt.label && formData[field.key]?.value === opt.value;
                                const isImagePath = opt.value && (opt.value.endsWith('.png') || opt.value.endsWith('.jpg') || opt.value.endsWith('.svg'));
                                let displayContent;
                                if (isImagePath) {
                                    const imageUrl = app.vault.adapter.getResourcePath(opt.value);
                                    displayContent = <img src={imageUrl} alt={opt.label} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />;
                                } else {
                                    displayContent = <span style={{ fontSize: '20px' }}>{opt.value}</span>;
                                }
                                return (
                                    <Button
                                        key={opt.label}
                                        variant="text"
                                        onClick={() => handleFormUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                                        title={`评分: ${opt.label}`}
                                        sx={{ 
                                            minWidth: '40px', 
                                            height: '40px', 
                                            p: 1, 
                                            opacity: isSelected ? 1 : 0.5,
                                            border: isSelected ? '2px solid var(--interactive-accent)' : '1px solid transparent',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { opacity: 1 }
                                        }}
                                    >
                                        {displayContent}
                                    </Button>
                                );
                            })}
                        </Stack>
                    </FormControl>
                );
            case 'radio':
            case 'select':
                if (field.type === 'radio') {
                    const selectedOptionObject = formData[field.key];
                    const selectedIndex = field.options?.findIndex(opt => opt.value === selectedOptionObject?.value && opt.label === selectedOptionObject?.label) ?? -1;
                    return (
                        <FormControl component="fieldset">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                            <MuiRadioGroup row value={selectedIndex > -1 ? String(selectedIndex) : ''} onChange={e => { const newIndex = parseInt(e.target.value, 10); const newlySelectedOption = field.options?.[newIndex]; if (newlySelectedOption) { handleFormUpdate(field.key, { value: newlySelectedOption.value, label: newlySelectedOption.label || newlySelectedOption.value }, true); } }}>
                                {(field.options || []).map((opt, index) => (
                                    <FormControlLabel key={index} value={String(index)} control={<Radio />} label={opt.label || opt.value} />
                                ))}
                            </MuiRadioGroup>
                        </FormControl>
                    );
                } else {
                    const selectOptions = (field.options || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }));
                    return (
                        <FormControl fullWidth>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{label}</Typography>
                            <SimpleSelect value={value || ''} options={selectOptions} placeholder={`-- 选择 ${label} --`} onChange={selectedValue => { const selectedOption = field.options?.find(opt => opt.value === selectedValue); if (selectedOption) { handleFormUpdate(field.key, { value: selectedOption.value, label: selectedOption.label || selectedOption.value }, true); } }} />
                        </FormControl>
                    );
                }
            default: {
                const handleInputChange = (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    if (target) handleFormUpdate(field.key, target.value);
                };
                const commonInputProps = {
                    className: 'think-native-input',
                    value: value || '',
                    onInput: handleInputChange,
                    onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
                };

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <label style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px' }}>
                            {label}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea {...commonInputProps} rows={3} />
                        ) : (
                            <input
                                {...commonInputProps}
                                type={field.type === 'text' ? 'text' : field.type}
                                min={field.min}
                                max={field.max}
                            />
                        )}
                    </div>
                );
            }
        }
    };
    
    if (!currentRecord || !template) {
        return <div>没有可处理的记录</div>;
    }
    
    const activePath = currentRecord.themeId ? findNodePath(themeTree, currentRecord.themeId) : [];
    const currentBlock = blocks.find(b => b.id === currentRecord.blockId);

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* 左侧：记录列表 */}
            <Box sx={{ 
                width: '200px', 
                borderRight: '1px solid var(--background-modifier-border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
            }}>
                <Box sx={{ p: 1.5, borderBottom: '1px solid var(--background-modifier-border)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        AI 识别结果
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        共 {records.length} 条 · 已保存 {savedCount}
                    </Typography>
                </Box>
                <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                    {records.map((record, index) => {
                        const block = blocks.find(b => b.id === record.blockId);
                        const isActive = index === currentIndex;
                        return (
                            <ListItemButton
                                key={record.id}
                                selected={isActive}
                                onClick={() => setCurrentIndex(index)}
                                sx={{
                                    py: 1,
                                    opacity: record.skipped ? 0.5 : 1,
                                    bgcolor: isActive ? 'action.selected' : 'transparent',
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    {record.saved ? (
                                        <CheckCircleIcon color="success" fontSize="small" />
                                    ) : record.skipped ? (
                                        <DeleteIcon color="disabled" fontSize="small" />
                                    ) : (
                                        <RadioButtonUncheckedIcon color="action" fontSize="small" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" noWrap sx={{ fontWeight: isActive ? 600 : 400 }}>
                                            {block?.name || '未知类型'}
                                        </Typography>
                                    }
                                    secondary={
                                        <Typography variant="caption" noWrap color="text.secondary">
                                            {record.cmd.fieldValues?.内容?.slice(0, 20) || record.cmd.rawText?.slice(0, 20) || `记录 ${index + 1}`}
                                        </Typography>
                                    }
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
                <Box sx={{ p: 1.5, borderTop: '1px solid var(--background-modifier-border)' }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        onClick={handleSaveAll}
                        disabled={pendingCount === 0}
                    >
                        保存全部 ({pendingCount})
                    </Button>
                </Box>
            </Box>
            
            {/* 右侧：编辑区域 */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* 头部 */}
                <Box sx={{ 
                    p: 2, 
                    borderBottom: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            编辑第 {currentIndex + 1} 条记录
                        </Typography>
                        {currentRecord.saved && (
                            <Chip label="已保存" color="success" size="small" sx={{ ml: 1 }} />
                        )}
                        {currentRecord.skipped && (
                            <Chip label="已跳过" color="default" size="small" sx={{ ml: 1 }} />
                        )}
                    </Box>
                    <IconButton onClick={closeModal} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
                
                {/* 内容区域 */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {/* Block 类型选择 - 修复样式：选中的有描边 */}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>记录类型</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {blocks.map(block => {
                                const isSelected = currentRecord.blockId === block.id;
                                return (
                                    <Button
                                        key={block.id}
                                        variant={isSelected ? 'contained' : 'text'}
                                        size="small"
                                        onClick={() => handleBlockChange(block.id)}
                                        sx={{
                                            minWidth: 'auto',
                                            px: 2,
                                            py: 0.5,
                                            fontSize: '0.875rem',
                                            border: isSelected ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)',
                                            fontWeight: isSelected ? 600 : 400,
                                            bgcolor: isSelected ? 'var(--interactive-accent)' : 'transparent',
                                            color: isSelected ? 'white' : 'inherit',
                                            '&:hover': {
                                                bgcolor: isSelected ? 'var(--interactive-accent)' : 'var(--background-modifier-hover)',
                                            }
                                        }}
                                    >
                                        {block.name}
                                    </Button>
                                );
                            })}
                        </Box>
                    </FormControl>
                    
                    {/* 主题选择 */}
                    {themeTree.length > 0 && (
                        <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>主题分类</Typography>
                            <Box sx={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid var(--background-modifier-border)', borderRadius: 1, p: 1 }}>
                                {renderThemeLevels(themeTree, activePath, handleThemeSelect)}
                            </Box>
                        </FormControl>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* 字段编辑 */}
                    <Stack spacing={2}>
                        {template.fields.map(field => (
                            <div key={field.id}>{renderField(field)}</div>
                        ))}
                    </Stack>
                </Box>
                
                {/* 底部操作栏 */}
                <Box sx={{ 
                    p: 2, 
                    borderTop: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Button
                        variant="text"
                        color="inherit"
                        onClick={handleSkipCurrent}
                        disabled={currentRecord.saved || currentRecord.skipped}
                    >
                        跳过此条
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveCurrent}
                            disabled={currentRecord.saved}
                        >
                            {currentRecord.saved ? '已保存' : '保存此条'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleComplete}
                        >
                            完成
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
