// src/core/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, Stack, TextField, IconButton, Button, Typography, Tooltip, Divider, Checkbox, FormControlLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { TemplateField, TemplateFieldOption } from '@core/domain/schema';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { Notice } from 'obsidian';

// OptionRow 组件保持不变
function OptionRow({ option, onChange, onRemove }: { option: TemplateFieldOption, onChange: (newOption: TemplateFieldOption) => void, onRemove: () => void }) {
    const [localOption, setLocalOption] = useState(option);
    const [isAdvanced, setIsAdvanced] = useState(!!(option.label && option.label !== option.value));
    useEffect(() => { setLocalOption(option); }, [option]);
    const handleBlur = () => { onChange(localOption); };
    const handleAdvancedToggle = (checked: boolean) => {
        setIsAdvanced(checked);
        if (!checked) {
            const newOption = { ...localOption, label: localOption.value };
            setLocalOption(newOption);
            onChange(newOption);
        }
    };
    const handleValueChange = (newValue: string) => {
        if (isAdvanced) setLocalOption(o => ({ ...o, value: newValue }));
        else setLocalOption(o => ({ ...o, value: newValue, label: newValue }));
    };
    const handleLabelChange = (newLabel: string) => {
        setLocalOption(o => ({ ...o, label: newLabel }));
    };
    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                {isAdvanced ? (
                    <Box sx={{ display: 'contents' }}>
                        <TextField label="选项" value={localOption.label || ''} onChange={e => handleLabelChange((e.target as HTMLInputElement).value)} onBlur={handleBlur} size="small" variant="outlined" sx={{ flex: 1 }} />
                        <TextField label="值" value={localOption.value} onChange={e => handleValueChange((e.target as HTMLInputElement).value)} onBlur={handleBlur} size="small" variant="outlined" sx={{ flex: 1 }} />
                    </Box>
                ) : (
                    <TextField label="选项/值" value={localOption.value} onChange={e => handleValueChange((e.target as HTMLInputElement).value)} onBlur={handleBlur} size="small" variant="outlined" sx={{ flex: 1 }} />
                )}
                <FormControlLabel control={<Checkbox checked={isAdvanced} onChange={(e) => handleAdvancedToggle(e.target.checked)} size="small" />} label={<Typography sx={{fontSize: 13}}>高级</Typography>} title="勾选后可分别设置选项的显示名称和实际输出值"/>
                <Tooltip title="删除此选项"><IconButton onClick={onRemove} size="small"><RemoveCircleOutlineIcon fontSize='small' /></IconButton></Tooltip>
            </Stack>
        </Box>
    );
}

// 单个字段的编辑器
function FieldRow({ field, index, fieldCount, onUpdate, onRemove, onMove }: { field: TemplateField, index: number, fieldCount: number, onUpdate: (updates: Partial<TemplateField>) => void, onRemove: () => void, onMove: (direction: 'up' | 'down') => void }) {
    // [最终简化] 只使用一个本地 state 来管理字段的统一名称
    const [localName, setLocalName] = useState(field.label || field.key);
    useEffect(() => { setLocalName(field.label || field.key); }, [field.label, field.key]);

    // 失去焦点时，将这一个名称同时更新到 key 和 label 上
    const handleNameBlur = () => {
        const trimmedName = localName.trim();
        if (trimmedName && trimmedName !== (field.label || field.key)) {
            onUpdate({ key: trimmedName, label: trimmedName });
        } else {
            // 如果用户清空了输入框，则恢复为原始值
            setLocalName(field.label || field.key);
        }
    };

    const handleOptionChange = (optIndex: number, newOption: TemplateFieldOption) => {
        const newOptions = [...(field.options || [])];
        newOptions[optIndex] = newOption;
        const values = newOptions.map(o => o.value);
        if (new Set(values).size !== values.length) {
            new Notice("警告：该字段存在重复的选项值。", 5000);
        }
        onUpdate({ options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(field.options || [])];
        const baseName = `新选项${newOptions.length + 1}`;
        newOptions.push({ value: baseName, label: baseName });
        onUpdate({ options: newOptions });
    };
    const removeOption = (optIndex: number) => {
        onUpdate({ options: (field.options || []).filter((_, i) => i !== optIndex) });
    };

    const fieldTypeOptions = [
        { value: "text", label: "单行文本" }, { value: "textarea", label: "多行文本" }, { value: "number", label: "数字" },
        { value: "date", label: "日期" }, { value: "time", label: "时间" }, { value: "select", label: "下拉选择" }, { value: "radio", label: "单选按钮" },
    ];

    return (
        <Box>
            <Stack direction="row" spacing={2} alignItems="center">
                <SimpleSelect value={field.type} options={fieldTypeOptions} onChange={val => onUpdate({ type: val as TemplateField['type'] })} sx={{ minWidth: 120, flexShrink: 0 }} />
                
                {/* [最终简化] 只保留一个输入框，用于同时设置显示名称和变量名 */}
                <TextField 
                    label="字段名称" 
                    placeholder="例如：任务内容" 
                    value={localName} 
                    onChange={e => setLocalName((e.target as HTMLInputElement).value)}
                    onBlur={handleNameBlur}
                    size="small" 
                    variant="outlined" 
                    sx={{ flexGrow: 1 }} 
                />
                
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

            {(field.type === 'select' || field.type === 'radio') && (
                <Box sx={{ mt: 2, pl: 2 }}>
                    <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
                        {(field.options || []).map((option, optIndex) => <OptionRow key={optIndex} option={option} onChange={(newOpt) => handleOptionChange(optIndex, newOpt)} onRemove={() => removeOption(optIndex)} />)}
                    </Stack>
                    <Button onClick={addOption} startIcon={<AddIcon />} size="small" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>添加选项</Button>
                </Box>
            )}
        </Box>
    );
}

// 主组件 (FieldsEditor)
export function FieldsEditor({ fields = [], onChange }: { fields: TemplateField[], onChange: (fields: TemplateField[]) => void }) {
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