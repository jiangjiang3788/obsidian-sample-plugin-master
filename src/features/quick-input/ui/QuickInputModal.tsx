// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { useStore } from '@state/AppStore';
import type { InputSettings, BlockTemplate, ThemeDefinition, TemplateField } from '@core/domain/schema';
import { Button, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack, Divider, Box, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { buildThemeTree, ThemeTreeNode } from '@core/utils/themeUtils';
import { dayjs } from '@core/utils/date';
import { dataStore, inputService } from '@state/storeRegistry';

export interface QuickInputSaveData {
    template: BlockTemplate;
    formData: Record<string, any>;
    theme?: ThemeDefinition;
}

export class QuickInputModal extends Modal {
    constructor(
        app: App,
        private blockId: string,
        private context?: Record<string, any>,
        private themeId?: string,
        private onSave?: (data: QuickInputSaveData) => void
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('think-quick-input-modal');
        
        render(
            <QuickInputForm
                app={this.app}
                blockId={this.blockId}
                context={this.context}
                themeId={this.themeId}
                onSave={this.onSave}
                closeModal={() => this.close()}
            />,
            this.contentEl
        );
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}

// [1. 移动] getEffectiveTemplate 函数已从此位置移除

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

function QuickInputForm({ app, blockId, context, themeId, onSave, closeModal }: {
    app: App;
    blockId: string;
    context?: Record<string, any>;
    themeId?: string;
    onSave?: (data: QuickInputSaveData) => void;
    closeModal: () => void;
}) {
    const settings = useStore(state => state.settings.inputSettings);
    
    // [2. 定义] 将 getEffectiveTemplate 函数移动到组件内部
    const getEffectiveTemplate = (settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; theme: ThemeDefinition | null } => {
        const baseBlock = settings.blocks.find(b => b.id === blockId);
        if (!baseBlock) return { template: null, theme: null };
        const theme = settings.themes.find(t => t.id === themeId) || null;
        if (themeId) {
            const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
            if (override && override.status === 'enabled') {
                const effectiveTemplate: BlockTemplate = { ...baseBlock, fields: override.fields ?? baseBlock.fields, outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, targetFile: override.targetFile ?? baseBlock.targetFile, appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader };
                return { template: effectiveTemplate, theme };
            }
        }
        return { template: baseBlock, theme };
    }

    const { themeTree, themeIdMap } = useMemo(() => {
        const { themes, overrides } = settings;
        const disabledThemeIds = new Set<string>();
        overrides.forEach(override => {
            if (override.blockId === blockId && override.status === 'disabled') {
                disabledThemeIds.add(override.themeId);
            }
        });
        const availableThemes = themes.filter(theme => !disabledThemeIds.has(theme.id));
        const themeTree = buildThemeTree(availableThemes);
        const themeIdMap = new Map<string, ThemeDefinition>(themes.map(t => [t.id, t]));
        return { themeTree, themeIdMap };
    }, [settings, blockId]);

    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(themeId || null);

    const { template } = useMemo(() => {
        return getEffectiveTemplate(settings, blockId, selectedThemeId || undefined);
    }, [settings, blockId, selectedThemeId]);

    const [formData, setFormData] = useState<Record<string, any>>(() => {
        if (!template) return {};
        const initialData: Record<string, any> = {};

        template.fields.forEach(field => {
            let valueAssigned = false;
            const contextValue = context?.[field.key] ?? context?.[field.label];

            if (contextValue !== undefined) {
                if (['select', 'radio', 'rating'].includes(field.type)) {
                    const matchedOption = (field.options || []).find(opt => opt.value === contextValue || opt.label === contextValue);
                    if (matchedOption) {
                        initialData[field.key] = { value: matchedOption.value, label: matchedOption.label || matchedOption.value };
                    } else {
                        initialData[field.key] = contextValue; 
                    }
                } else {
                    initialData[field.key] = contextValue;
                }
                valueAssigned = true;
            }

            if (!valueAssigned) {
                const isSelectable = ['select', 'radio', 'rating'].includes(field.type);
                if (field.defaultValue) {
                    if (isSelectable) {
                        const findOption = (val: string | undefined) => (field.options || []).find(o => o.label === val || o.value === val);
                        let defaultOpt = findOption(field.defaultValue);
                        if (!defaultOpt && field.options && field.options.length > 0) defaultOpt = field.options[0];
                        if (defaultOpt) {
                            initialData[field.key] = { value: defaultOpt.value, label: defaultOpt.label || defaultOpt.value };
                        }
                    } else {
                        initialData[field.key] = field.defaultValue || '';
                    }
                } else {
                    if (field.type === 'date') {
                        initialData[field.key] = dayjs().format('YYYY-MM-DD');
                    } else if (field.type === 'time') {
                        initialData[field.key] = dayjs().format('HH:mm');
                    } else if (isSelectable && field.options && field.options.length > 0) {
                        const firstOption = field.options[0];
                        initialData[field.key] = { value: firstOption.value, label: firstOption.label || firstOption.value };
                    }
                }
            }
        });
        return initialData;
    });

    const handleUpdate = (key: string, value: any, isOptionObject = false) => {
        setFormData(current => ({ ...current, [key]: isOptionObject ? { value: value.value, label: value.label } : value }));
    };

    const handleSubmit = async () => {
        if (!template) return;
        if (!inputService) {
            new Notice(`❌ 保存失败: InputService 未初始化`, 10000);
            console.error("ThinkPlugin Error: Attempted to save from QuickInputModal, but 'inputService' from storeRegistry is undefined.");
            return;
        }

        const finalTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) : undefined;
        if (onSave) {
            onSave({ template, formData, theme: finalTheme });
            closeModal();
        } else {
            try {
                await inputService.executeTemplate(template, formData, finalTheme);
                new Notice(`✅ 已保存`);
                dataStore?.notifyChange?.();
                closeModal();
            } catch (e: any) {
                new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
            }
        }
    };
    
    const renderField = (field: TemplateField) => {
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
                                        variant={isSelected ? 'outlined' : 'text'}
                                        onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                                        title={`评分: ${opt.label}`}
                                        sx={{ minWidth: '40px', height: '40px', p: 1, opacity: isSelected ? 1 : 0.6, '&:hover': { opacity: 1 } }}
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
                const isRadio = field.type === 'radio';
                if (isRadio) {
                    const selectedOptionObject = formData[field.key];
                    const selectedIndex = field.options?.findIndex(opt => opt.value === selectedOptionObject?.value && opt.label === selectedOptionObject?.label) ?? -1;
                    return (
                        <FormControl component="fieldset">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                            <MuiRadioGroup row value={selectedIndex > -1 ? String(selectedIndex) : ''} onChange={e => { const newIndex = parseInt(e.target.value, 10); const newlySelectedOption = field.options?.[newIndex]; if (newlySelectedOption) { handleUpdate(field.key, { value: newlySelectedOption.value, label: newlySelectedOption.label || newlySelectedOption.value }, true); } }}>
                                {(field.options || []).map((opt, index) => (
                                    <FormControlLabel key={index} value={String(index)} control={<Radio />} label={opt.label || opt.value} />
                                ))}
                            </MuiRadioGroup>
                        </FormControl>
                    );
                } else { // select
                    const selectOptions = (field.options || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }));
                    return (
                        <FormControl fullWidth>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{label}</Typography>
                            <SimpleSelect value={value || ''} options={selectOptions} placeholder={`-- 选择 ${label} --`} onChange={selectedValue => { const selectedOption = field.options?.find(opt => opt.value === selectedValue); if (selectedOption) { handleUpdate(field.key, { value: selectedOption.value, label: selectedOption.label || selectedOption.value }, true); } }} />
                        </FormControl>
                    );
                }
            default: {
                const commonInputProps = {
                    className: 'think-native-input',
                    value: value || '',
                    onInput: (e: Event) => handleUpdate(field.key, (e.target as HTMLInputElement).value),
                    onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
                };

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <label style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px' }}>
                            {label}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea {...commonInputProps} rows={4} />
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
    
    if (!template) {
        return <div>错误：找不到ID为 "{blockId}" 的Block模板。</div>;
    }

    const activePath = selectedThemeId ? findNodePath(themeTree, selectedThemeId) : [];
    const handleSelectTheme = (newThemeId: string, parentThemeId: string | null) => {
        setSelectedThemeId(selectedThemeId === newThemeId ? parentThemeId : newThemeId);
    };

    return (
        <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '1rem'  }}>
                <h3 style={{ margin: 0 }}>
                    {onSave ? `开始新任务: ${template.name}` : `快速录入 · ${template.name}`}
                </h3>
                <Tooltip title="关闭">
                    <IconButton onClick={closeModal} size="small">
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {themeTree.length > 0 && (
                <FormControl component="fieldset" sx={{ mb: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>主题分类</Typography>
                    <Box sx={{
                        height: '120px',
                        overflowY: 'auto',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                        pr: 0.5
                    }}>
                        {renderThemeLevels(themeTree, activePath, handleSelectTheme)}
                    </Box>
                </FormControl>
            )}

            <Divider sx={{ mb: 2.5 }} />
            <Stack spacing={2.5}>
                {template.fields.map(field => <div key={field.id}>{renderField(field)}</div>)}
            </Stack>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
                <Button onClick={handleSubmit} variant="contained">{onSave ? '创建并开始计时' : '提交'}</Button>
                <Button onClick={closeModal}>取消</Button>
            </div>
        </div>
    );
}