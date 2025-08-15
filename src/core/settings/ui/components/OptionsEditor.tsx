// src/core/settings/ui/components/OptionsEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Stack, TextField, IconButton, Button, Typography, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { KeyValueEditor } from '@shared/components/form/KeyValueEditor';
import type { TemplateFieldOption } from '@core/domain/schema';

interface Props {
    options: TemplateFieldOption[];
    onChange: (newOptions: TemplateFieldOption[]) => void;
}

export function OptionsEditor({ options = [], onChange }: Props) {

    const handleUpdate = (index: number, updates: Partial<TemplateFieldOption>) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], ...updates };
        onChange(newOptions);
    };

    const addOption = () => {
        onChange([
            ...options,
            {
                label: `新选项${options.length + 1}`,
                values: { content: '', name: '' } 
            }
        ]);
    };

    const removeOption = (index: number) => {
        onChange(options.filter((_, i) => i !== index));
    };

    return (
        <Stack spacing={2} sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>配置选项</Typography>
            {(options || []).map((option, index) => (
                <Box key={index} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                            label="UI 显示名 (Label)"
                            value={option.label}
                            onChange={e => handleUpdate(index, { label: (e.target as HTMLInputElement).value })}
                            size="small"
                            variant="outlined"
                            fullWidth
                        />
                        <Tooltip title="删除此选项">
                            <IconButton onClick={() => removeOption(index)} size="small">
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Box sx={{ mt: 1.5 }}>
                         <Typography variant="caption" color="text.secondary" sx={{mb: 0.5, display: 'block'}}>模板输出值 (Values)</Typography>
                        <KeyValueEditor
                            value={option.values}
                            onChange={newValues => handleUpdate(index, { values: newValues })}
                            keyLabel="变量名 (Key)"
                            valueLabel="输出内容 (Value)"
                        />
                    </Box>
                </Box>
            ))}
            <Button onClick={addOption} startIcon={<AddIcon />} size="small" sx={{ alignSelf: 'flex-start' }}>添加选项</Button>
        </Stack>
    );
}