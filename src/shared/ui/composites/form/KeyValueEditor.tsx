// src/shared/components/form/KeyValueEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';
import { useState, useEffect } from 'preact/hooks';
import { replaceAt, removeAt, addAtEnd } from '@/shared/utils/immutableListOps';

interface Props {
  value: Record<string, string>;
  onChange: (newValue: Record<string, string>) => void;
  keyLabel?: string;
  valueLabel?: string;
}

export function KeyValueEditor({ value, onChange, keyLabel = "Key", valueLabel = "Value" }: Props) {
  const [entries, setEntries] = useState(Object.entries(value || {}));

  useEffect(() => {
    setEntries(Object.entries(value || {}));
  }, [value]);
  
  const handleUpdate = (newEntries: [string, string][]) => {
      const newMap: Record<string, string> = {};
      let hasDuplicate = false;
      const keys = new Set<string>();

      for (const [k, v] of newEntries) {
          if (keys.has(k)) {
              hasDuplicate = true;
          }
          keys.add(k);
          newMap[k] = v;
      }
      
      // 可以在这里加一个重复键的提示
      if (hasDuplicate) {
          console.warn("Duplicate keys found in KeyValueEditor");
      }

      onChange(newMap);
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const entry = entries[index];
    const newEntries = replaceAt(entries, index, [newKey, entry[1]] as [string, string]);
    setEntries(newEntries);
    handleUpdate(newEntries);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const entry = entries[index];
    const newEntries = replaceAt(entries, index, [entry[0], newValue] as [string, string]);
    setEntries(newEntries);
    handleUpdate(newEntries);
  };

  const addEntry = () => {
    const newKey = `newKey${entries.length + 1}`;
    const newEntries = addAtEnd(entries, [newKey, ''] as [string, string]);
    setEntries(newEntries);
    handleUpdate(newEntries);
  };

  const removeEntry = (index: number) => {
    const newEntries = removeAt(entries, index);
    setEntries(newEntries);
    handleUpdate(newEntries);
  };

  return (
    <Stack spacing={1} sx={{ p: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 1, bgcolor: 'action.hover' }}>
      {entries.map(([key, val], index) => (
        <Stack key={index} direction="row" spacing={1} alignItems="center">
          <TextField
            label={keyLabel}
            value={key}
            onChange={e => handleKeyChange(index, (e.target as HTMLInputElement).value)}
            size="small"
            variant="outlined"
          />
          <TextField
            label={valueLabel}
            value={val}
            onChange={e => handleValueChange(index, (e.target as HTMLInputElement).value)}
            size="small"
            variant="outlined"
          />
          <Tooltip title="删除此项">
            <IconButton onClick={() => removeEntry(index)} size="small" sx={{ color: 'text.secondary' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ))}
      <Stack direction="row" justifyContent="flex-start">
        <Tooltip title="添加新项">
            <IconButton onClick={addEntry} size="small" color="primary">
                <AddIcon />
            </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
