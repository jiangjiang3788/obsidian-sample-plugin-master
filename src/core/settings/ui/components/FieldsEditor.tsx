// src/core/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, Stack, TextField, IconButton, Button, Typography, Tooltip, Select, MenuItem, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { KeyValueEditor } from '@shared/components/form/KeyValueEditor';
import type { TemplateField, TemplateFieldOption } from '@core/domain/schema';

// 单个选项的编辑器 (重构后)
function OptionRow({ option, onChange, onRemove }: { option: TemplateFieldOption, onChange: (newOption: TemplateFieldOption) => void, onRemove: () => void }) {
    const [showExtra, setShowExtra] = useState(Object.keys(option.extraValues || {}).length > 0);
    
    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={2}>
                <TextField label="UI显示名 (Label)" placeholder="若为空则显示Value" value={option.label || ''} onChange={e => onChange({ ...option, label: (e.target as HTMLInputElement).value })} size="small" variant="outlined" sx={{flex: 1}}/>
                <TextField label="主要输出值 (Value)" value={option.value} onChange={e => onChange({ ...option, value: (e.target as HTMLInputElement).value })} size="small" variant="outlined" sx={{flex: 1}}/>
                <Tooltip title={showExtra ? "收起额外值" : "配置额外值 (用于 {{key.extraKey}} 格式)"}>
                    <Button size="small" onClick={() => setShowExtra(!showExtra)} endIcon={showExtra ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}>高级</Button>
                </Tooltip>
                <Tooltip title="删除此选项"><IconButton onClick={onRemove} size="small"><RemoveCircleOutlineIcon fontSize='small' /></IconButton></Tooltip>
            </Stack>
            {showExtra && (
                 <Box sx={{ mt: 1.5, pl: 1 }}>
                    <KeyValueEditor
                        value={option.extraValues || {}}
                        onChange={newValues => onChange({ ...option, extraValues: newValues })}
                        keyLabel="变量名 (Key)"
                        valueLabel="输出内容 (Value)"
                    />
                </Box>
            )}
        </Box>
    );
}

// 单个字段的编辑器
function FieldRow({ field, index, fieldCount, onUpdate, onRemove, onMove }: { field: TemplateField, index: number, fieldCount: number, onUpdate: (updates: Partial<TemplateField>) => void, onRemove: () => void, onMove: (direction: 'up' | 'down') => void }) {
    
    const handleOptionChange = (optIndex: number, newOption: TemplateFieldOption) => {
        const newOptions = [...(field.options || [])];
        newOptions[optIndex] = newOption;
        onUpdate({ options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(field.options || [])];
        newOptions.push({ value: `新选项${newOptions.length + 1}`, label: `新选项${newOptions.length + 1}` });
        onUpdate({ options: newOptions });
    };

    const removeOption = (optIndex: number) => {
        onUpdate({ options: (field.options || []).filter((_, i) => i !== optIndex) });
    };

    return (
        <Box>
            <Stack direction="row" spacing={2} alignItems="center">
                <Select size="small" value={field.type} onChange={e => onUpdate({ type: e.target.value as TemplateField['type'] })} sx={{minWidth: 120}}>
                    <MenuItem value="text">单行文本</MenuItem>
                    <MenuItem value="textarea">多行文本</MenuItem>
                    <MenuItem value="number">数字</MenuItem>
                    <MenuItem value="date">日期</MenuItem>
                    <MenuItem value="time">时间</MenuItem>
                    <MenuItem value="select">下拉选择</MenuItem>
                    <MenuItem value="radio">单选按钮</MenuItem>
                </Select>
                <TextField label="字段变量名 (Key)" placeholder="e.g., category" value={field.key} onChange={e => onUpdate({ key: (e.target as HTMLInputElement).value })} size="small" variant="outlined" sx={{flex: 1}}/>
                
                {field.type === 'number' && (
                    <Stack direction="row" spacing={1}>
                        <TextField label="Min" type="number" value={field.min ?? ''} onChange={e => onUpdate({ min: (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value) })} size="small" variant="outlined" sx={{width: 80}} />
                        <TextField label="Max" type="number" value={field.max ?? ''} onChange={e => onUpdate({ max: (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value) })} size="small" variant="outlined" sx={{width: 80}} />
                    </Stack>
                )}

                <Stack direction="row">
                    <Tooltip title="上移"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove('up')}><ArrowUpwardIcon sx={{fontSize: '1.1rem'}} /></IconButton></span></Tooltip>
                    <Tooltip title="下移"><span><IconButton size="small" disabled={index === fieldCount - 1} onClick={() => onMove('down')}><ArrowDownwardIcon sx={{fontSize: '1.1rem'}} /></IconButton></span></Tooltip>
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

// 主组件
export function FieldsEditor({ fields = [], onChange }: any) { // props type changed to 'any' for simplicity

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