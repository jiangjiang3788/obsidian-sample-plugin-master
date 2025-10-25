// src/features/settings/ui/components/RuleBuilder.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Typography, Stack, Tooltip, Chip, Autocomplete, TextField, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
// [修改] 从注册表导入 dataStore
import { dataStore } from '@state/storeRegistry';
import { getAllFields, readField } from '@core/domain/schema';

// 辅助Hook：获取库中所有字段的唯一值，用于自动补全
function useUniqueFieldValues() {
    return useMemo(() => {
        // [修复] 直接使用从注册表导入的 dataStore 实例
        if (!dataStore) return {}; // 安全保护，防止 dataStore 未初始化
        const items = dataStore.queryItems();
        const allKnownFields = new Set<string>(getAllFields(items));
        const valueMap: Record<string, Set<string>> = {};
        allKnownFields.forEach(field => valueMap[field] = new Set());
        for (const item of items) {
            for (const field of allKnownFields) {
                const value = readField(item, field);
                if (value === null || value === undefined || String(value).trim() === '') continue;
                const values = Array.isArray(value) ? value : [value];
                values.forEach(v => {
                    const strV = String(v).trim();
                    if (strV) valueMap[field].add(strV);
                });
            }
        }
        const result: Record<string, string[]> = {};
        for(const field in valueMap) {
            if(valueMap[field].size > 0) {
               result[field] = Array.from(valueMap[field]).sort((a,b) => a.localeCompare(b, 'zh-CN'));
            }
        }
        return result;
    }, []);
}

// 默认规则常量
const defaultFilterRule = { field: '', op: '=', value: '' };
const defaultSortRule = { field: '', dir: 'asc' };

// RuleBuilder 组件定义
export function RuleBuilder({ title, mode, rows, fieldOptions, onChange }: any) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState(isFilterMode ? defaultFilterRule : defaultSortRule);
    const uniqueFieldValues = useUniqueFieldValues();
    const remove = (i:number)=>onChange(rows.filter((_,j)=>j!==i));
    const updateNewRule = (patch: Partial<typeof newRule>) => {
        setNewRule(current => ({ ...current, ...patch }));
    };
    const handleAddRule = () => {
        if (!newRule.field) {
            alert('请选择一个字段');
            return;
        }
        onChange([...rows, newRule]);
        setNewRule(isFilterMode ? defaultFilterRule : defaultSortRule);
    };
    const formatRule = (rule: any) => {
        if (isFilterMode) {
            return `${rule.field} ${rule.op} "${rule.value}"`;
        }
        return `${rule.field} ${rule.dir === 'asc' ? '升序' : '降序'}`;
    };

    const fieldSelectOptions = fieldOptions.map((f: string) => ({ value: f, label: f }));
    const operatorOptions = ['=','!=','includes','regex','>','<'].map(op => ({ value: op, label: op }));
    const directionOptions = [{value: 'asc', label: '升序'}, {value: 'desc', label: '降序'}];

    return (
        <Stack direction="row" spacing={2}>
            <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>{title}</Typography>
            <Stack spacing={1.5} sx={{flexGrow: 1}}>
                <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
                    {rows.map((rule: any, i: number) => (
                        <Tooltip key={i} title={`点击删除规则: ${formatRule(rule)}`}>
                            <Chip label={formatRule(rule)} onClick={() => remove(i)} size="small" />
                        </Tooltip>
                    ))}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <SimpleSelect fullWidth placeholder="选择字段" value={newRule.field} options={fieldSelectOptions} onChange={val => updateNewRule({ field: val })} />
                    {isFilterMode ? (
                        <SimpleSelect value={newRule.op} options={operatorOptions} onChange={val => updateNewRule({ op: val })} sx={{ minWidth: 120 }} />
                    ) : (
                        <SimpleSelect value={newRule.dir} options={directionOptions} onChange={val => updateNewRule({ dir: val })} sx={{ minWidth: 100 }} />
                    )}
                    {isFilterMode && (
                        <Autocomplete freeSolo fullWidth size="small" disableClearable options={uniqueFieldValues[newRule.field] || []} value={newRule.value} onInputChange={(_, newValue) => updateNewRule({ value: newValue || '' })} renderInput={(params) => <TextField {...params} variant="outlined" placeholder="输入值" />} />
                    )}
                    <Button variant="contained" size="small" onClick={handleAddRule} startIcon={<AddIcon />}>添加</Button>
                </Stack>
            </Stack>
        </Stack>
    );
}