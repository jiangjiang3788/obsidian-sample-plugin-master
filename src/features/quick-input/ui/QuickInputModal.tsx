// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
// [核心修复] 在这里同时导入 AppStore 和 useStore
import { AppStore, useStore } from '@state/AppStore';
import { InputService } from '@core/services/inputService';
import { DataStore } from '@core/services/dataStore';
import type { InputSettings, BlockTemplate, ThemeDefinition, TemplateField } from '@core/domain/schema';
import { Button, TextField, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack, Divider } from '@mui/material';
import { SimpleSelect } from '@shared/ui/SimpleSelect';

// Modal 主类 (保持不变)
export class QuickInputModal extends Modal {
    constructor(app: App, private blockId: string, private themeId?: string) {
        super(app);
    }
    onOpen() {
        this.contentEl.empty();
        render(<QuickInputForm app={this.app} blockId={this.blockId} closeModal={() => this.close()} />, this.contentEl);
    }
    onClose() {
        this.contentEl.empty();
    }
}

// 模板查找逻辑 (保持不变)
function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; title: string, theme: ThemeDefinition | null } {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return { template: null, title: '未知Block', theme: null };
    const theme = settings.themes.find(t => t.id === themeId) || null;
    let title = `${baseBlock.name} (默认)`;
    if (theme) {
        title = `${theme.path} / ${baseBlock.name}`;
    }
    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        if (override && override.status === 'enabled') {
            const effectiveTemplate: BlockTemplate = { ...baseBlock, fields: override.fields ?? baseBlock.fields, outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, targetFile: override.targetFile ?? baseBlock.targetFile, appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader };
            return { template: effectiveTemplate, title, theme };
        }
    }
    return { template: baseBlock, title, theme };
}


// Preact 表单组件
function QuickInputForm({ app, blockId, closeModal }: { app: App; blockId: string; closeModal: () => void }) {
    const svc = useMemo(() => new InputService(app), [app]);
    // [修复] 此处 useStore 现在可以被正确找到
    const allThemes = useStore(state => state.settings.inputSettings.themes);
    
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

    const { template, title, theme } = useMemo(() => {
        const settings = AppStore.instance.getSettings().inputSettings;
        return getEffectiveTemplate(settings, blockId, selectedThemeId || undefined);
    }, [blockId, selectedThemeId]);

    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!template) return;
        const initialData: Record<string, any> = {};
        template.fields.forEach(field => {
            if ((field.type === 'radio' || field.type === 'select') && field.options && field.options.length > 0) {
                const defaultOption = field.options.find(o => o.value === field.defaultValue) || field.options[0];
                if (defaultOption) { initialData[field.key] = { ...defaultOption.extraValues, value: defaultOption.value, label: defaultOption.label || defaultOption.value }; }
            } else {
                initialData[field.key] = { value: field.defaultValue || '' };
            }
        });
        setFormData(initialData);
    }, [template]);

    const handleUpdate = (key: string, value: any, isOptionObject = false) => {
        setFormData(current => {
            const currentFieldData = current[key] || {};
            const newFieldData = isOptionObject ? value : { ...currentFieldData, value: value };
            return { ...current, [key]: newFieldData };
        });
    };
    
    const handleSubmit = async () => {
        if (!template) return;
        try {
            const targetFile = await svc.executeTemplate(template, formData, theme || undefined);
            new Notice(`✅ 已保存到 ${targetFile}`);
            DataStore.instance?.notifyChange?.();
            closeModal();
        } catch (e: any) {
            new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
        }
    };

    if (!template) {
        return <div>错误：找不到ID为 "{blockId}" 的Block模板。</div>;
    }
    
    // renderField 函数保持不变
    const renderField = (field: TemplateField) => {
        const value = formData[field.key]?.value;
        switch (field.type) {
            case 'textarea':
                return <TextField label={field.label} multiline rows={4} value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" />;
            case 'date':
                return <TextField label={field.label} type="date" value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} />;
            case 'time':
                return <TextField label={field.label} type="time" value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} />;
            case 'number':
                return <TextField label={field.label} type="number" value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" inputProps={{ min: field.min, max: field.max }} />;
            case 'radio':
                return (
                    <FormControl component="fieldset">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{field.label}</Typography>
                        <MuiRadioGroup row value={value || ''} onChange={e => {
                            const selectedOption = field.options?.find(opt => opt.value === e.target.value);
                            if (selectedOption) {
                                const optionObject = { ...selectedOption.extraValues, value: selectedOption.value, label: selectedOption.label || selectedOption.value };
                                handleUpdate(field.key, optionObject, true);
                            }
                        }}>
                            {(field.options || []).map(opt => (
                                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label || opt.value} />
                            ))}
                        </MuiRadioGroup>
                    </FormControl>
                );
            case 'select':
                const selectOptions = (field.options || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }));
                return (
                    <FormControl fullWidth>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{field.label}</Typography>
                        <SimpleSelect
                            value={value || ''}
                            options={selectOptions}
                            placeholder={`-- 选择 ${field.label} --`}
                            onChange={selectedValue => {
                                const selectedOption = field.options?.find(opt => opt.value === selectedValue);
                                if (selectedOption) {
                                    const optionObject = { ...selectedOption.extraValues, value: selectedOption.value, label: selectedOption.label || selectedOption.value };
                                    handleUpdate(field.key, optionObject, true);
                                }
                            }}
                        />
                    </FormControl>
                );
            case 'text':
            default:
                return <TextField label={field.label} value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" />;
        }
    };

    return (
        <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>快速录入 · {template.name}</h3>
            
            {allThemes.length > 0 && (
                 <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>选择主题</Typography>
                    <MuiRadioGroup row value={selectedThemeId || ''} onChange={e => setSelectedThemeId(e.target.value || null)}>
                        <FormControlLabel value="" control={<Radio />} label={"默认 (无主题)"} />
                        {allThemes.map(theme => (
                            <FormControlLabel key={theme.id} value={theme.id} control={<Radio />} label={`${theme.icon || ''} ${theme.path}`.trim()} />
                        ))}
                    </MuiRadioGroup>
                </FormControl>
            )}

            <Divider sx={{mb: 2.5}} />

            <Stack spacing={2.5}>
                {template.fields.map(field => (
                    <div key={field.id}>{renderField(field)}</div>
                ))}
            </Stack>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
                <Button onClick={handleSubmit} variant="contained">提交</Button>
                <Button onClick={closeModal}>取消</Button>
            </div>
        </div>
    );
}