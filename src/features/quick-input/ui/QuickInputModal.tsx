// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { AppStore, useStore } from '@state/AppStore';
import { InputService } from '@core/services/inputService';
import { DataStore } from '@core/services/dataStore';
import type { InputSettings, BlockTemplate, ThemeDefinition, TemplateField } from '@core/domain/schema';
import { Button, TextField, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack, Divider } from '@mui/material';
import { SimpleSelect } from '@shared/ui/SimpleSelect';

export class QuickInputModal extends Modal {
    // [修改] 构造函数现在可以接收预填写的上下文和预选的主题ID
    constructor(
        app: App, 
        private blockId: string, 
        private context?: Record<string, any>,
        private themeId?: string,
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        // [修改] 将 context 和 themeId 传递给 Preact 组件
        render(
            <QuickInputForm 
                app={this.app} 
                blockId={this.blockId} 
                context={this.context}
                themeId={this.themeId}
                closeModal={() => this.close()} 
            />, 
            this.contentEl
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}

function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; theme: ThemeDefinition | null } {
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

const useHierarchicalThemes = (blockId: string) => {
    const settings = useStore(state => state.settings.inputSettings);
    const { themes, overrides } = settings;

    return useMemo(() => {
        const disabledThemeIds = new Set<string>();
        overrides.forEach(override => {
            if (override.blockId === blockId && override.status === 'disabled') {
                disabledThemeIds.add(override.themeId);
            }
        });
        const availableThemes = themes.filter(theme => !disabledThemeIds.has(theme.id));
        const primaryThemes: ThemeDefinition[] = [];
        const secondaryThemeMap = new Map<string, ThemeDefinition[]>();
        const themeIdMap = new Map<string, ThemeDefinition>();
        availableThemes.forEach(theme => {
            themeIdMap.set(theme.id, theme);
            const parts = theme.path.split('/');
            if (parts.length === 1) {
                primaryThemes.push(theme);
            } else {
                const primaryName = parts[0];
                if (!secondaryThemeMap.has(primaryName)) {
                    secondaryThemeMap.set(primaryName, []);
                }
                secondaryThemeMap.get(primaryName)?.push(theme);
            }
        });
        primaryThemes.forEach(pt => {
            if (!secondaryThemeMap.has(pt.path)) {
                secondaryThemeMap.set(pt.path, []);
            }
        });
        return { primaryThemes, secondaryThemeMap, themeIdMap };
    }, [themes, overrides, blockId]);
};

function QuickInputForm({ app, blockId, context, themeId, closeModal }: { 
    app: App; 
    blockId: string; 
    context?: Record<string, any>;
    themeId?: string;
    closeModal: () => void 
}) {
    const svc = useMemo(() => new InputService(app), [app]);
    const { primaryThemes, secondaryThemeMap, themeIdMap } = useHierarchicalThemes(blockId);
    
    const [selectedPrimaryThemeId, setSelectedPrimaryThemeId] = useState<string | null>(() => {
        if (!themeId) return null;
        const theme = themeIdMap.get(themeId);
        if (!theme) return null;
        const isSecondary = theme.path.includes('/');
        if (isSecondary) {
            const primaryPath = theme.path.split('/')[0];
            return primaryThemes.find(p => p.path === primaryPath)?.id || null;
        }
        return theme.id;
    });
    const [selectedSecondaryThemeId, setSelectedSecondaryThemeId] = useState<string | null>(() => {
        if (!themeId) return null;
        const theme = themeIdMap.get(themeId);
        if (!theme) return null;
        return theme.path.includes('/') ? theme.id : null;
    });

    const effectiveThemeId = selectedSecondaryThemeId || selectedPrimaryThemeId;
    
    const { template } = useMemo(() => {
        const settings = AppStore.instance.getSettings().inputSettings;
        return getEffectiveTemplate(settings, blockId, effectiveThemeId || undefined);
    }, [blockId, effectiveThemeId]);

    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!template) return;
        const initialData: Record<string, any> = {};
        template.fields.forEach(field => {
            if (context && (context[field.key] !== undefined || context[field.label] !== undefined)) {
                initialData[field.key] = context[field.key] ?? context[field.label];
                return;
            }
            const findOption = (val: string | undefined) => (field.options || []).find(o => o.label === val || o.value === val);
            let defaultOpt = findOption(field.defaultValue);
            if (!defaultOpt && (field.type === 'radio' || field.type === 'select' || field.type === 'rating')) {
                defaultOpt = (field.options || [])[0];
            }

            if (defaultOpt) {
                initialData[field.key] = { value: defaultOpt.value, label: defaultOpt.label || defaultOpt.value };
            } else {
                initialData[field.key] = field.defaultValue || '';
            }
        });
        setFormData(initialData);
    }, [template, context]);

    const handleUpdate = (key: string, value: any, isOptionObject = false) => {
        setFormData(current => ({ ...current, [key]: isOptionObject ? { value: value.value, label: value.label } : value }));
    };
    
    const handleSubmit = async () => {
        if (!template) return;
        try {
            const finalTheme = effectiveThemeId ? themeIdMap.get(effectiveThemeId) : undefined;
            await svc.executeTemplate(template, formData, finalTheme);
            new Notice(`✅ 已保存`);
            DataStore.instance?.notifyChange?.();
            closeModal();
        } catch (e: any) {
            new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
        }
    };

    if (!template) {
        return <div>错误：找不到ID为 "{blockId}" 的Block模板。</div>;
    }

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
                                        variant={isSelected ? 'contained' : 'outlined'}
                                        onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                                        title={`评分: ${opt.label}`}
                                        sx={{ minWidth: '40px', height: '40px', p: 1 }}
                                    >
                                        {displayContent}
                                    </Button>
                                );
                            })}
                        </Stack>
                    </FormControl>
                );

            case 'textarea':
            case 'date':
            case 'time':
            case 'number':
            case 'text':
            default:
                return <TextField label={label} value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" type={field.type === 'textarea' ? undefined : field.type} multiline={field.type === 'textarea'} rows={field.type === 'textarea' ? 4 : undefined} InputLabelProps={ (field.type === 'date' || field.type === 'time') ? { shrink: true } : undefined} inputProps={ field.type === 'number' ? { min: field.min, max: field.max } : undefined} />;
            
            case 'radio':
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

            case 'select':
                const selectOptions = (field.options || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }));
                return (
                    <FormControl fullWidth>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{label}</Typography>
                        <SimpleSelect value={value || ''} options={selectOptions} placeholder={`-- 选择 ${label} --`} onChange={selectedValue => { const selectedOption = field.options?.find(opt => opt.value === selectedValue); if (selectedOption) { handleUpdate(field.key, { value: selectedOption.value, label: selectedOption.label || selectedOption.value }, true); } }} />
                    </FormControl>
                );
        }
    };
    
    const selectedPrimaryTheme = selectedPrimaryThemeId ? themeIdMap.get(selectedPrimaryThemeId) : null;
    const secondaryThemes = selectedPrimaryTheme ? secondaryThemeMap.get(selectedPrimaryTheme.path) : null;

    return (
        <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>快速录入 · {template.name}</h3>
            
            {primaryThemes.length > 0 && (
                 <FormControl component="fieldset" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>主题分类</Typography>
                    <MuiRadioGroup row value={selectedPrimaryThemeId || ''} onChange={e => {
                        const newPrimaryId = e.target.value || null;
                        setSelectedPrimaryThemeId(newPrimaryId);
                        setSelectedSecondaryThemeId(null);
                    }}>
                        <FormControlLabel value="" control={<Radio />} label={"无主题"} />
                        {primaryThemes.map(theme => (
                            <FormControlLabel key={theme.id} value={theme.id} control={<Radio />} label={`${theme.icon || ''} ${theme.path}`.trim()} />
                        ))}
                    </MuiRadioGroup>
                </FormControl>
            )}

            {selectedPrimaryTheme && secondaryThemes && secondaryThemes.length > 0 && (
                 <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>具体主题</Typography>
                    <MuiRadioGroup row value={selectedSecondaryThemeId || ''} onChange={e => setSelectedSecondaryThemeId(e.target.value || null)}>
                        <FormControlLabel value="" control={<Radio />} label={`${selectedPrimaryTheme.path}`} />
                        {secondaryThemes.map(theme => (
                            <FormControlLabel key={theme.id} value={theme.id} control={<Radio />} label={`${theme.icon || ''} ${theme.path.split('/')[1]}`.trim()} />
                        ))}
                    </MuiRadioGroup>
                </FormControl>
            )}

            <Divider sx={{mb: 2.5}} />
            <Stack spacing={2.5}>
                {template.fields.map(field => <div key={field.id}>{renderField(field)}</div>)}
            </Stack>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
                <Button onClick={handleSubmit} variant="contained">提交</Button>
                <Button onClick={closeModal}>取消</Button>
            </div>
        </div>
    );
}