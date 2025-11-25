// src/shared/components/form/PillMultiSelect.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';

export function PillMultiSelect({
  label, value, options, placeholder, onChange,
}: {
  label?: string;
  value: string[];
  options: string[];
  placeholder?: string;
  onChange: (v: string[]) => void;
}) {
  return (
    // [MOD] 使用Box包裹并添加背景色
    <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
        {label && <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>}
        <Autocomplete
            multiple
            options={options}
            value={value}
            onChange={(_, v)=>onChange(v as string[])}
            renderInput={p => <TextField {...p} variant="standard" placeholder={placeholder ?? '选择或输入字段'} />}
            // 优化Chip显示，使其更美观
            renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                    <Box 
                        component="span"
                        {...getTagProps({ index })} 
                        sx={{
                            bgcolor: 'primary.light', 
                            color: 'primary.contrastText',
                            p: '2px 8px',
                            m: '2px',
                            borderRadius: '16px',
                            fontSize: '0.8rem'
                        }}
                    >
                        {option}
                    </Box>
                ))
            }
        />
    </Box>
  );
}