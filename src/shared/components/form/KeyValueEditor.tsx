// src/shared/components/form/KeyValueEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';

interface Props {
  value: Record<string, string>;
  onChange: (newValue: Record<string, string>) => void;
  keyLabel?: string;
  valueLabel?: string;
}

export function KeyValueEditor({ value, onChange, keyLabel = "Key", valueLabel = "Value" }: Props) {
  const entries = Object.entries(value || {});

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey) return;
    const newMap: Record<string, string> = {};
    for (const [k, v] of entries) {
      newMap[k === oldKey ? newKey : k] = v;
    }
    onChange(newMap);
  };

  const handleValueChange = (key: string, newValue: string) => {
    onChange({ ...value, [key]: newValue });
  };

  const addEntry = () => {
    const newKey = `new_key_${Date.now()}`;
    if (value && value[newKey]) return; // Avoid collision, though unlikely
    onChange({ ...(value || {}), [newKey]: '' });
  };

  const removeEntry = (keyToRemove: string) => {
    const { [keyToRemove]: _, ...rest } = value;
    onChange(rest);
  };

  return (
    <Stack spacing={0.5}>
      {entries.map(([key, val]) => (
        <Stack key={key} direction="row" spacing={0.5} alignItems="center">
          <TextField
            label={keyLabel}
            value={key}
            onBlur={e => handleKeyChange(key, (e.target as HTMLInputElement).value.trim())}
            fullWidth
          />
          <TextField
            label={valueLabel}
            value={val}
            onInput={e => handleValueChange(key, (e.target as HTMLInputElement).value)}
            fullWidth
          />
          <IconButton onClick={() => removeEntry(key)} size="small" color="error" title="删除此项">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Stack direction="row" justifyContent="flex-start">
        <IconButton onClick={addEntry} size="small" color="primary" title="添加新项">
          <AddIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}