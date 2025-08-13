// src/shared/components/form/RuleList.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
// [FIX] 1. 从 @mui/material 导入 Box
import { Box, Stack, TextField, MenuItem, Select, IconButton, Typography, Autocomplete } from '@mui/material';
// [FIX] 2. 导入 AddIcon
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMemo } from 'preact/hooks';
import { readField } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';

const menu = { disablePortal: true, keepMounted: true } as const;

// 辅助函数，获取指定字段的唯一值
function useUniqueFieldValues() {
    return useMemo(() => {
        const items = DataStore.instance.queryItems();
        const allKnownFields = new Set<string>();
        // 确保从schema中获取所有可能的字段键
        const schemaFields = getAllFields([]); // 获取核心字段
        schemaFields.forEach(f => allKnownFields.add(f));
        items.forEach(item => {
            Object.keys(item).forEach(key => allKnownFields.add(key));
            Object.keys(item.extra || {}).forEach(key => allKnownFields.add(`extra.${key}`));
            if(item.file) Object.keys(item.file).forEach(key => allKnownFields.add(`file.${key}`));
        });

        const valueMap: Record<string, Set<string>> = {};
        allKnownFields.forEach(field => valueMap[field] = new Set());

        for (const item of items) {
            for (const field of allKnownFields) {
                const value = readField(item, field);
                if (value !== null && value !== undefined && String(value).trim() !== '') {
                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            const strV = String(v).trim();
                            if (strV) valueMap[field].add(strV);
                        });
                    } else {
                        const strValue = String(value).trim();
                        if (strValue) valueMap[field].add(strValue);
                    }
                }
            }
        }
        
        const result: Record<string, string[]> = {};
        for(const field in valueMap) {
            if(valueMap[field].size > 0) {
               result[field] = Array.from(valueMap[field]).sort();
            }
        }
        return result;
    }, [DataStore.instance.queryItems().length]); // 仅当 item 数量变化时重新计算
}

// 修正后的 getAllFields 函数，之前遗漏了
function getAllFields(items: any[]): string[] {
    const set = new Set<string>(['id', 'type', 'title', 'content', 'categoryKey', 'tags', 'icon', 'priority', 'date', 'dateMs', 'dateSource', 'startISO', 'endISO', 'startMs', 'endMs', 'filename', 'header', 'created', 'modified', 'file.path', 'file.line', 'file.basename']);
    items.forEach(it => {
      Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k));
      if (it.file && typeof it.file === 'object') Object.keys(it.file).forEach(k => set.add('file.' + k));
    });
    return Array.from(set).sort();
}

export function RuleList({
  title, mode, rows, fieldOptions,
  onChange, onAdd,
}: {
  title: string;
  mode: 'filter' | 'sort';
  rows: any[];
  fieldOptions: string[];
  onChange: (rows: any[]) => void;
  onAdd: () => void;
}) {
    const uniqueFieldValues = useUniqueFieldValues();
    const remove = (i:number)=>onChange(rows.filter((_,j)=>j!==i));

    return (
        <Box sx={{p: 1, bgcolor: 'action.hover', borderRadius: 1}}>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Typography variant="subtitle2">{title}</Typography>
                <IconButton onClick={onAdd} size="small" title={`新增${title}`} color="primary"><AddIcon/></IconButton>
            </Stack>

            <Stack spacing={1}>
                {rows.map((r:any,i:number)=>(
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <Select value={r.field} variant="standard" fullWidth
                            onChange={e=>{
                                const next=[...rows]; next[i]={...next[i], field:e.target.value}; onChange(next);
                            }}>
                            {fieldOptions.map(o=><MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>

                        {mode === 'filter' ? (
                            <Select value={r.op} variant="standard"
                                onChange={e=>{ const next=[...rows]; next[i]={...next[i], op:e.target.value}; onChange(next); }}>
                                {['=','!=','includes','regex','>','<'].map(op=><MenuItem key={op} value={op}>{op}</MenuItem>)}
                            </Select>
                        ) : (
                            <Select value={r.dir} variant="standard"
                                onChange={e=>{ const next=[...rows]; next[i]={...next[i], dir:e.target.value}; onChange(next); }}>
                                <MenuItem value="asc">升序</MenuItem>
                                <MenuItem value="desc">降序</MenuItem>
                            </Select>
                        )}

                        {mode === 'filter' ? (
                            <Autocomplete
                                freeSolo
                                fullWidth
                                options={uniqueFieldValues[r.field] || []}
                                value={r.value}
                                onInputChange={(_, newValue) => {
                                    const next=[...rows]; next[i]={...next[i], value: newValue}; onChange(next);
                                }}
                                renderInput={(params) => <TextField {...params} variant="standard" />}
                            />
                        ) : null}

                        <IconButton size="small" color="error" onClick={()=>remove(i)} title="删除">
                            <DeleteIcon fontSize="small"/>
                        </IconButton>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}