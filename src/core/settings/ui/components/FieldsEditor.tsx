// src/core/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, Stack, TextField, IconButton, Button, Typography, Tooltip, Divider, Checkbox, FormControlLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { TemplateField, TemplateFieldOption } from '@core/domain/schema';
import { SimpleSelect } from '@shared/ui/SimpleSelect';

// 单个选项的编辑器 (OptionRow) 组件
function OptionRow({ option, onChange, onRemove }: { option: TemplateFieldOption, onChange: (newOption: TemplateFieldOption) => void, onRemove: () => void }) {
    // 状态：控制是否为高级模式（选项和值分离）
    // 如果 label 存在且与 value 不同，则默认为高级模式
    const [isAdvanced, setIsAdvanced] = useState(!!(option.label && option.label !== option.value));

    // 处理高级模式切换
    const handleAdvancedToggle = (checked: boolean) => {
        setIsAdvanced(checked);
        // 当从高级模式切换回简单模式时，将 `value` 同步给 `label`，保持一致
        if (!checked) {
            onChange({ ...option, label: option.value });
        }
    };

    // 处理“值”输入框的变化
    const handleValueChange = (newValue: string) => {
        if (isAdvanced) {
            // 高级模式下，只更新 value
            onChange({ ...option, value: newValue });
        } else {
            // 简单模式下，同时更新 value 和 label
            onChange({ ...option, value: newValue, label: newValue });
        }
    };

    // 处理“选项”输入框的变化（仅在高级模式下可见）
    const handleLabelChange = (newLabel: string) => {
        onChange({ ...option, label: newLabel });
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                {isAdvanced ? (
                    // 高级模式：显示两个输入框
                    // [修复] 使用 Box 替代 Fragment 来避免构建错误
                    // `display: 'contents'` 确保这个 Box 不会影响父级 Stack 的布局
                    <Box sx={{ display: 'contents' }}>
                        <TextField label="选项" value={option.label || ''} onChange={e => handleLabelChange((e.target as HTMLInputElement).value)} size="small" variant="outlined" sx={{ flex: 1 }} />
                        <TextField label="值" value={option.value} onChange={e => handleValueChange((e.target as HTMLInputElement).value)} size="small" variant="outlined" sx={{ flex: 1 }} />
                    </Box>
                ) : (
                    // 简单模式：显示一个输入框
                    <TextField label="选项/值" value={option.value} onChange={e => handleValueChange((e.target as HTMLInputElement).value)} size="small" variant="outlined" sx={{ flex: 1 }} />
                )}

                <FormControlLabel
                    control={<Checkbox checked={isAdvanced} onChange={(e) => handleAdvancedToggle(e.target.checked)} size="small" />}
                    label={<Typography sx={{fontSize: 13}}>高级</Typography>}
                    title="勾选后可分别设置选项的显示名称和实际输出值"
                />
                
                <Tooltip title="删除此选项"><IconButton onClick={onRemove} size="small"><RemoveCircleOutlineIcon fontSize='small' /></IconButton></Tooltip>
            </Stack>
        </Box>
    );
}


// 单个字段的编辑器 (FieldRow) - 无需修改
function FieldRow({ field, index, fieldCount, onUpdate, onRemove, onMove }: { field: TemplateField, index: number, fieldCount: number, onUpdate: (updates: Partial<TemplateField>) => void, onRemove: () => void, onMove: (direction: 'up' | 'down') => void }) {
    const handleOptionChange = (optIndex: number, newOption: TemplateFieldOption) => {
        const newOptions = [...(field.options || [])];
        newOptions[optIndex] = newOption;
        onUpdate({ options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(field.options || [])];
        const baseName = `新选项${newOptions.length + 1}`;
        newOptions.push({ value: baseName, label: baseName }); // 默认 label 和 value 相同
        onUpdate({ options: newOptions });
    };

    const removeOption = (optIndex: number) => {
        onUpdate({ options: (field.options || []).filter((_, i) => i !== optIndex) });
    };

    const fieldTypeOptions = [
        { value: "text", label: "单行文本" },
        { value: "textarea", label: "多行文本" },
        { value: "number", label: "数字" },
        { value: "date", label: "日期" },
        { value: "time", label: "时间" },
        { value: "select", label: "下拉选择" },
        { value: "radio", label: "单选按钮" },
    ];

    return (
        <Box>
            <Stack direction="row" spacing={2} alignItems="center">
                <SimpleSelect
                    value={field.type}
                    options={fieldTypeOptions}
                    onChange={val => onUpdate({ type: val as TemplateField['type'] })}
                    sx={{ minWidth: 120 }}
                />

                <TextField label="字段变量名 (Key)" placeholder="e.g., category" value={field.key} onChange={e => onUpdate({ key: (e.target as HTMLInputElement).value })} size="small" variant="outlined" sx={{ flex: 1 }} />

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
                        {(field.options || []).map((option, optIndex) => (
                            <OptionRow key={optIndex} option={option} onChange={(newOpt) => handleOptionChange(optIndex, newOpt)} onRemove={() => removeOption(optIndex)} />
                        ))}
                    </Stack>
                    <Button onClick={addOption} startIcon={<AddIcon />} size="small" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>添加选项</Button>
                </Box>
            )}
        </Box>
    );
}

// 主组件 (FieldsEditor) - 无需修改
export function FieldsEditor({ fields = [], onChange }: { fields: TemplateField[], onChange: (fields: TemplateField[]) => void }) {
    const handleUpdate = (index: number, updates: Partial<TemplateField>) => {
        const newFields = [...(fields || [])];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    };

    const addField = () => {
        onChange([
            ...(fields || []),
            {
                id: `field_${Date.now().toString(36)}`,
                key: `newField${(fields || []).length + 1}`,
                label: `新字段 ${(fields || []).length + 1}`,
                type: 'text',
            }
        ]);
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
            {(fields || []).map((field: TemplateField, index: number) => (
                <FieldRow
                    key={field.id}
                    field={field}
                    index={index}
                    fieldCount={fields.length}
                    onUpdate={(updates) => handleUpdate(index, updates)}
                    onRemove={() => removeField(index)}
                    onMove={(dir) => moveField(index, dir)}
                />
            ))}
            <Button onClick={addField} startIcon={<AddIcon />} variant="contained" size="small" sx={{ alignSelf: 'flex-start' }}>添加字段</Button>
        </Stack>
    );
}