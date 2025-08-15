// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render, Fragment } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { AppStore } from '@state/AppStore';
import { InputService } from '@core/services/inputService';
import { DataStore } from '@core/services/dataStore';
import type { InputTemplate, TemplateField } from '@core/domain/schema';
import { Button, TextField, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, Select, MenuItem, InputLabel, FormControl, Typography } from '@mui/material';

// --- Modal 主类 ---
export class QuickInputModal extends Modal {
  constructor(app: App, private templateId: string) {
    super(app);
  }

  onOpen() {
    this.contentEl.empty();
    render(<QuickInputForm app={this.app} templateId={this.templateId} closeModal={() => this.close()} />, this.contentEl);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// --- Preact 表单组件 ---
function QuickInputForm({ app, templateId, closeModal }: { app: App; templateId: string; closeModal: () => void }) {
    const svc = useMemo(() => new InputService(app), [app]);
    const template = useMemo(() => {
        const settings = AppStore.instance.getSettings().inputSettings;
        return (settings?.templates || []).find(t => t.id === templateId);
    }, [templateId]);

    const [formData, setFormData] = useState<Record<string, any>>({});

    // 初始化表单数据
    useEffect(() => {
        if (!template) return;
        const initialData: Record<string, any> = {};
        template.fields.forEach(field => {
            if(field.type === 'radio' || field.type === 'select') {
                const defaultOption = field.options?.find(o => o.label === field.defaultValue) || field.options?.[0];
                initialData[field.key] = defaultOption?.values || {};
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
            const targetFile = await svc.executeTemplate(template.id, formData);
            new Notice(`✅ 已保存到 ${targetFile}`);
            DataStore.instance?.notifyChange?.();
            closeModal();
        } catch (e: any) {
            new Notice(`❌ 保存失败: ${e.message || e}`);
        }
    };
    
    if (!template) {
        return <div>错误：找不到ID为 "{templateId}" 的模板。</div>;
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
            case 'radio':
                return (
                    <FormControl component="fieldset">
                        <Typography variant="body2" sx={{fontWeight: 500}}>{field.label}</Typography>
                        <MuiRadioGroup row value={JSON.stringify(value || {})} onChange={e => handleUpdate(field.key, JSON.parse(e.target.value))}>
                            {(field.options || []).map(opt => (
                                <FormControlLabel key={opt.label} value={JSON.stringify(opt.values)} control={<Radio />} label={opt.label} />
                            ))}
                        </MuiRadioGroup>
                    </FormControl>
                );
            case 'select':
                 return (
                    <FormControl fullWidth size="small" variant="outlined">
                        <InputLabel>{field.label}</InputLabel>
                        <Select label={field.label} value={JSON.stringify(value || {})} onChange={e => handleUpdate(field.key, JSON.parse(e.target.value as string))}>
                            {(field.options || []).map(opt => (
                                <MenuItem key={opt.label} value={JSON.stringify(opt.values)}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                 );
            case 'text':
            default:
                return <TextField label={field.label} value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" />;
        }
    };

    const [themePart, typePart] = template.name.split('#type:');
    const themeName = themePart.replace('theme:', '');

    return (
        <div class="think-modal" style={{padding: '0 1rem 1rem 1rem'}}>
            <h3 style={{ marginBottom: '1.5rem' }}>快速录入 · {themeName === 'Base' ? typePart : `${themeName} / ${typePart}`}</h3>
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