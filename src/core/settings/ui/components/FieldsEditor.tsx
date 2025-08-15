// src/core/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Stack, TextField, IconButton, Button, Typography, Tooltip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { OptionsEditor } from './OptionsEditor';
import type { TemplateField } from '@core/domain/schema';

interface Props {
    fields: TemplateField[];
    onChange: (newFields: TemplateField[]) => void;
}

export function FieldsEditor({ fields = [], onChange }: Props) {

    const handleUpdate = (index: number, updates: Partial<TemplateField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    };

    const addField = () => {
        onChange([
            ...fields,
            {
                id: `field_${Date.now().toString(36)}`,
                key: `newField${(fields || []).length + 1}`,
                label: '新字段',
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
        <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>表单字段编辑器</Typography>
            {(fields || []).map((field, index) => (
                <Box key={field.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            label="UI 标签 (Label)"
                            value={field.label}
                            onChange={e => handleUpdate(index, { label: (e.target as HTMLInputElement).value })}
                            size="small" variant="outlined" fullWidth
                        />
                        <TextField
                            label="模板变量名 (Key)"
                            value={field.key}
                            onChange={e => handleUpdate(index, { key: (e.target as HTMLInputElement).value })}
                            size="small" variant="outlined" fullWidth
                        />
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>控件类型</InputLabel>
                            <Select
                                label="控件类型"
                                value={field.type}
                                onChange={e => handleUpdate(index, { type: e.target.value as TemplateField['type'] })}
                            >
                                <MenuItem value="text">单行文本</MenuItem>
                                <MenuItem value="textarea">多行文本</MenuItem>
                                <MenuItem value="date">日期</MenuItem>
                                <MenuItem value="time">时间</MenuItem>
                                <MenuItem value="select">下拉选择</MenuItem>
                                <MenuItem value="radio">单选按钮</MenuItem>
                            </Select>
                        </FormControl>
                        <Stack direction="row">
                            {/* [修改] 排序箭头改为左右并排 */}
                            <Tooltip title="上移"><span><IconButton size="small" disabled={index === 0} onClick={() => moveField(index, 'up')}><ArrowUpwardIcon sx={{fontSize: '1.1rem'}} /></IconButton></span></Tooltip>
                            <Tooltip title="下移"><span><IconButton size="small" disabled={index === fields.length - 1} onClick={() => moveField(index, 'down')}><ArrowDownwardIcon sx={{fontSize: '1.1rem'}} /></IconButton></span></Tooltip>
                        </Stack>
                        <Tooltip title="删除此字段">
                            <IconButton onClick={() => removeField(index)} size="small" color="error">
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {(field.type === 'select' || field.type === 'radio') && (
                        <OptionsEditor
                            options={field.options || []}
                            onChange={newOptions => handleUpdate(index, { options: newOptions })}
                        />
                    )}
                </Box>
            ))}
            <Button onClick={addField} startIcon={<AddIcon />} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>添加字段</Button>
        </Stack>
    );
}