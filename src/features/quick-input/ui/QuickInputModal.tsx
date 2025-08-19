// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { AppStore } from '@state/AppStore';
import { InputService } from '@core/services/inputService';
import { DataStore } from '@core/services/dataStore';
import type { InputSettings, BlockTemplate, TemplateField } from '@core/domain/schema';
import { Button, TextField, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack } from '@mui/material';
import { SimpleSelect } from '@shared/ui/SimpleSelect';

// --- Modal 主类 ---
export class QuickInputModal extends Modal {
    constructor(app: App, private blockId: string, private themeId?: string) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        render(<QuickInputForm app={this.app} blockId={this.blockId} themeId={this.themeId} closeModal={() => this.close()} />, this.contentEl);
    }

    onClose() {
        this.contentEl.empty();
    }
}

// --- [新增] 模板查找与合并的核心逻辑 ---
function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; title: string } {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return { template: null, title: '未知Block' };

    const theme = settings.themes.find(t => t.id === themeId);
    let title = `${baseBlock.name} (默认)`;
    if (theme) {
        title = `${theme.path} / ${baseBlock.name}`;
    }

    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        if (override && override.status === 'enabled') {
            // 合并基础和覆写配置，覆写的字段优先
            const effectiveTemplate: BlockTemplate = {
                ...baseBlock,
                // 如果 override 中有定义，则使用 override 的，否则回退到 baseBlock 的
                fields: override.fields ?? baseBlock.fields,
                outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate,
                targetFile: override.targetFile ?? baseBlock.targetFile,
                appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader,
            };
            return { template: effectiveTemplate, title };
        }
    }

    return { template: baseBlock, title };
}


// --- Preact 表单组件 ---
function QuickInputForm({ app, blockId, themeId, closeModal }: { app: App; blockId: string, themeId?: string; closeModal: () => void }) {
    const svc = useMemo(() => new InputService(app), [app]);
    
    const { template, title } = useMemo(() => {
        const settings = AppStore.instance.getSettings().inputSettings;
        return getEffectiveTemplate(settings, blockId, themeId);
    }, [blockId, themeId]);

    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!template) return;
        const initialData: Record<string, any> = {};
        template.fields.forEach(field => {
            if ((field.type === 'radio' || field.type === 'select') && field.options && field.options.length > 0) {
                // 查找默认值，如果找不到，则使用第一个选项
                const defaultOption = field.options.find(o => o.value === field.defaultValue) || field.options[0];
                if (defaultOption) {
                    initialData[field.key] = {
                        ...defaultOption.extraValues,
                        value: defaultOption.value,
                        label: defaultOption.label || defaultOption.value,
                    };
                }
            } else {
                initialData[field.key] = field.defaultValue || '';
            }
        });
        setFormData(initialData);
    }, [template]);

    const handleUpdate = (key: string, value: any) => {
        setFormData(current => ({ ...current, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!template) return;
        try {
            // [修复] 调用新的 InputService 方法
            const targetFile = await svc.executeTemplate(template, formData);
            new Notice(`✅ 已保存到 ${targetFile}`);
            // 通知 DataStore 数据已变更，触发UI刷新
            DataStore.instance?.notifyChange?.();
            closeModal();
        } catch (e: any) {
            new Notice(`❌ 保存失败: ${e.message || e}`);
        }
    };

    if (!template) {
        return <div>错误：找不到ID为 "{blockId}" 的Block模板。</div>;
    }

    const renderField = (field: TemplateField) => {
        const value = formData[field.key];
        switch (field.type) {
            case 'textarea':
                return <TextField label={field.label} multiline rows={4} value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" />;
            case 'date':
                return <TextField label={field.label} type="date" value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} />;
            case 'time':
                return <TextField label={field.label} type="time" value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} />;
            case 'number':
                return <TextField label={field.label} type="number" value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" inputProps={{min: field.min, max: field.max}} />;
            case 'radio':
                return (
                    <FormControl component="fieldset">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{field.label}</Typography>
                        <MuiRadioGroup row value={value?.value || ''} onChange={e => {
                            const selectedOption = field.options?.find(opt => opt.value === e.target.value);
                            if (selectedOption) {
                                handleUpdate(field.key, { ...selectedOption.extraValues, value: selectedOption.value, label: selectedOption.label || selectedOption.value });
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
                            value={value?.value || ''}
                            options={selectOptions}
                            placeholder={`-- 选择 ${field.label} --`}
                            onChange={selectedValue => {
                                const selectedOption = field.options?.find(opt => opt.value === selectedValue);
                                if (selectedOption) {
                                    handleUpdate(field.key, { ...selectedOption.extraValues, value: selectedOption.value, label: selectedOption.label || selectedOption.value });
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
            <h3 style={{ marginBottom: '1.5rem' }}>快速录入 · {title}</h3>
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