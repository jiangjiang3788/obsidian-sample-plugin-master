// src/core/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, Stack, TextField, IconButton, Button, Typography, Tooltip, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { TemplateField, TemplateFieldOption } from '@core/domain/schema';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { Notice } from 'obsidian';

// [MODIFIED] OptionRow component with updated labels
function OptionRow({ option, onChange, onRemove, fieldType }: { option: TemplateFieldOption, onChange: (newOption: TemplateFieldOption) => void, onRemove: () => void, fieldType: TemplateField['type'] }) {
    const [localOption, setLocalOption] = useState(option);
    useEffect(() => { setLocalOption(option); }, [option]);
    
    const handleBlur = () => { onChange(localOption); };

    const isRating = fieldType === 'rating';
    const labelLabel = isRating ? "评分数值" : "选项标签";
    const valueLabel = isRating ? "显示内容 (Emoji/图片路径)" : "选项值";

    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <TextField label={labelLabel} value={localOption.label || ''} onChange={e => setLocalOption(o => ({ ...o, label: (e.target as HTMLInputElement).value }))} onBlur={handleBlur} size="small" variant="outlined" sx={{ flex: 1 }} />
            <TextField label={valueLabel} value={localOption.value} onChange={e => setLocalOption(o => ({ ...o, value: (e.target as HTMLInputElement).value }))} onBlur={handleBlur} size="small" variant="outlined" sx={{ flex: 1 }} />
            <Tooltip title="删除此选项"><IconButton onClick={onRemove} size="small"><RemoveCircleOutlineIcon fontSize='small' /></IconButton></Tooltip>
        </Stack>
    );
}

// [MODIFIED] FieldRow component with new 'rating' type
function FieldRow({ field, index, fieldCount, onUpdate, onRemove, onMove }: { field: TemplateField, index: number, fieldCount: number, onUpdate: (updates: Partial<TemplateField>) => void, onRemove: () => void, onMove: (direction: 'up' | 'down') => void }) {
    const [localName, setLocalName] = useState(field.label || field.key);
    useEffect(() => { setLocalName(field.label || field.key); }, [field.label, field.key]);

    const handleNameBlur = () => {
        const trimmedName = localName.trim();
        if (trimmedName && trimmedName !== (field.label || field.key)) {
            onUpdate({ key: trimmedName, label: trimmedName });
        } else {
            setLocalName(field.label || field.key);
        }
    };

    const handleOptionChange = (optIndex: number, newOption: TemplateFieldOption) => {
        const newOptions = [...(field.options || [])];
        newOptions[optIndex] = newOption;
        onUpdate({ options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(field.options || [])];
        newOptions.push({ value: '🆕', label: String(newOptions.length + 1) });
        onUpdate({ options: newOptions });
    };

    const removeOption = (optIndex: number) => {
        onUpdate({ options: (field.options || []).filter((_, i) => i !== optIndex) });
    };

    const fieldTypeOptions = [
        { value: "text", label: "单行文本" }, { value: "textarea", label: "多行文本" }, { value: "number", label: "数字" },
        { value: "date", label: "日期" }, { value: "time", label: "时间" }, { value: "select", label: "下拉选择" }, { value: "radio", label: "单选按钮" },
        { value: "rating", label: "评分" }, // [NEW] Added 'rating' type
    ];

    const showOptionsEditor = ['select', 'radio', 'rating'].includes(field.type);

    return (
        <Box>
            <Stack direction="row" spacing={2} alignItems="center">
                <SimpleSelect value={field.type} options={fieldTypeOptions} onChange={val => onUpdate({ type: val as TemplateField['type'] })} sx={{ minWidth: 120, flexShrink: 0 }} />
                <TextField label="字段名称" placeholder="例如：任务内容" value={localName} onChange={e => setLocalName((e.target as HTMLInputElement).value)} onBlur={handleNameBlur} size="small" variant="outlined" sx={{ flexGrow: 1 }} title="该名称将作为表单项的标题，并在模板中通过 {{字段名称}} 的形式引用" />
                
                {field.type === 'number' && (
                    <Stack direction="row" spacing={1}>
                        <TextField label="Min" type="number" value={field.min ?? ''} onChange={e => onUpdate({ min: (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value) })} size="small" variant="outlined" sx={{ width: 80 }} />
                        <TextField label="Max" type="number" value={field.max ?? ''} onChange={e => onUpdate({ max: (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value) })} size="small" variant="outlined" sx={{ width: 80 }} />
                    </Stack>
                )}
                <Stack direction="row">
                    <Tooltip title="上移"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove('up')}><ArrowUpwardIcon sx={{ fontSize: '1.1rem' }} /></IconButton></span></Tooltip>
                    <Tooltip title="下移"><span><IconButton size="small" disabled={index === fieldCount - 1} onClick={() => onMove('down')}><ArrowDownwardIcon sx={{ fontSize: '1.1rem' }} /></IconButton></span></Tooltip>
                </Stack>
                <Tooltip title="删除此字段"><IconButton onClick={onRemove} size="small" color="error"><DeleteIcon /></IconButton></Tooltip>
            </Stack>

            {showOptionsEditor && (
                <Box sx={{ mt: 2, pl: 2 }}>
                    <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
                        {(field.options || []).map((option, optIndex) => <OptionRow key={optIndex} option={option} onChange={(newOpt) => handleOptionChange(optIndex, newOpt)} onRemove={() => removeOption(optIndex)} fieldType={field.type} />)}
                    </Stack>
                    <Button onClick={addOption} startIcon={<AddIcon />} size="small" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>添加选项</Button>
                </Box>
            )}
        </Box>
    );
}

// Main FieldsEditor component remains largely unchanged
export function FieldsEditor({ fields = [], onChange }: { fields: TemplateField[], onChange: (fields: TemplateField[]) => void }) {
    // ... all logic inside here is the same ...
    const handleUpdate = (index: number, updates: Partial<TemplateField>) => {
        const newFields = [...(fields || [])];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    };
    const addField = () => {
        const newName = `新字段${(fields || []).length + 1}`;
        onChange([...(fields || []), { id: `field_${Date.now().toString(36)}`, key: newName, label: newName, type: 'text' }]);
    };
    const removeField = (index: number) => {
        onChange((fields || []).filter((_, i) => i !== index));
    };
    const moveField = (index: number, direction: 'up' | 'down') => {
        const newFields = [...(fields || [])];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newFields.length) return;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        onChange(newFields);
    };
    return (
        <Stack spacing={2} divider={<Divider sx={{ my: 1 }} />}>
            {(fields || []).map((field: TemplateField, index: number) => <FieldRow key={field.id} field={field} index={index} fieldCount={fields.length} onUpdate={(updates) => handleUpdate(index, updates)} onRemove={() => removeField(index)} onMove={(dir) => moveField(index, dir)} />)}
            <Button onClick={addField} startIcon={<AddIcon />} variant="contained" size="small" sx={{ alignSelf: 'flex-start' }}>添加字段</Button>
        </Stack>
    );
}