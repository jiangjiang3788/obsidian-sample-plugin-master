// src/shared/components/form/ListEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';
import { replaceAt, removeAt, addAtEnd } from '@/shared/utils/immutableListOps';

interface Props {
  value: string[];
  onChange: (newValue: string[]) => void;
  placeholder?: string;
  type?: 'text' | 'color'; // 支持普通文本或颜色选择器
}

export function ListEditor({ value, onChange, placeholder = "新项目", type = 'text' }: Props) {
  const list = value || [];

  const handleChange = (index: number, newValue: string) => {
    onChange(replaceAt(list, index, newValue));
  };

  const addItem = () => {
    onChange(addAtEnd(list, ''));
  };

  const removeItem = (index: number) => {
    onChange(removeAt(list, index));
  };

  return (
    <Stack spacing={0.5}>
      {list.map((item, index) => (
        <Stack key={index} direction="row" spacing={0.5} alignItems="center">
          <TextField
            value={item}
            onInput={e => handleChange(index, (e.target as HTMLInputElement).value)}
            placeholder={placeholder}
            type={type}
            fullWidth
            // 为颜色选择器提供一个小的样式
            sx={type === 'color' ? {
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                height: '24px',
                cursor: 'pointer',
              }
            } : {}}
          />
          <IconButton onClick={() => removeItem(index)} size="small" color="error" title="删除此项">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Stack direction="row" justifyContent="flex-start">
        <IconButton onClick={addItem} size="small" color="primary" title="添加新项">
          <AddIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
