// src/features/settings/ui/components/RuleBuilder.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Typography, Tooltip, Chip, Autocomplete, TextField, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';
import { DataStore } from '@/core/services/DataStore';
import { getAllFields, readField, FilterRule, SortRule } from '@/core/types/schema';

// 辅助Hook：获取库中所有字段的唯一值，用于自动补全
function useUniqueFieldValues(dataStore: DataStore) {
    return useMemo(() => {
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
    }, [dataStore]);
}

// 默认规则常量
const defaultFilterRule: FilterRule = { field: '', op: '=', value: '' };
const defaultSortRule: SortRule = { field: '', dir: 'asc' };

// RuleBuilder 组件定义
interface RuleBuilderProps {
    title: string;
    mode: 'filter' | 'sort';
    rows: (FilterRule | SortRule)[];
    fieldOptions: string[];
    onChange: (rows: (FilterRule | SortRule)[]) => void;
    dataStore: DataStore;
}

export function RuleBuilder({ title, mode, rows, fieldOptions, onChange, dataStore }: RuleBuilderProps) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState<FilterRule | SortRule>(
        isFilterMode ? defaultFilterRule : defaultSortRule
    );
    const uniqueFieldValues = useUniqueFieldValues(dataStore);
    
    const remove = (i: number) => onChange(rows.filter((_, j: number) => j !== i));
    
    const updateNewRule = (patch: Partial<FilterRule | SortRule>) => {
        setNewRule(current => ({ ...current, ...patch }));
    };
    
    const handleAddRule = () => {
        if (!newRule.field) {
            alert('请选择一个字段');
            return;
        }
    
        let updatedRows = [...rows];
        const ruleToAdd = { ...newRule };
    
        // 如果是过滤模式且已有规则，确保最后一条规则有逻辑关系
        if (isFilterMode && updatedRows.length > 0) {
            const lastRule = updatedRows[updatedRows.length - 1] as FilterRule;
            if (!lastRule.logic) {
                lastRule.logic = 'and';
            }
        }
    
        updatedRows.push(ruleToAdd);
        onChange(updatedRows);
        setNewRule(isFilterMode ? defaultFilterRule : defaultSortRule);
    };
    
    const formatRule = (rule: FilterRule | SortRule) => {
        if (isFilterMode) {
            const filterRule = rule as FilterRule;
            return `${filterRule.field} ${filterRule.op} "${filterRule.value}"`;
        }
        const sortRule = rule as SortRule;
        return `${sortRule.field} ${sortRule.dir === 'asc' ? '升序' : '降序'}`;
    };

    const fieldSelectOptions = fieldOptions.map((f: string) => ({ value: f, label: f }));
    const operatorOptions = ['=','!=','includes','regex','>','<'].map(op => ({ value: op, label: op }));
    const directionOptions = [{value: 'asc', label: '升序'}, {value: 'desc', label: '降序'}];
    const logicOptions = [
        {value: 'and', label: '且'}, 
        {value: 'or', label: '或'}
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
            <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>{title}</Typography>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 显示已添加的规则 */}
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    {rows.map((rule: FilterRule | SortRule, i: number) => {
                        const isLast = i === rows.length - 1;
                        const filterRule = rule as FilterRule;
                        
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {/* 规则标签 */}
                                <Tooltip title={`点击删除规则: ${formatRule(rule)}`}>
                                    <Chip 
                                        label={formatRule(rule)} 
                                        onClick={() => remove(i)} 
                                        size="small" 
                                    />
                                </Tooltip>
                                
                                {/* 逻辑关系选择器（仅在过滤模式且不是最后一个规则时显示） */}
                                {isFilterMode && !isLast && (
                                    <SimpleSelect 
                                        value={filterRule.logic || 'and'} 
                                        options={logicOptions} 
                                        onChange={(val: string) => {
                                            const updatedRows = [...rows];
                                            (updatedRows[i] as FilterRule).logic = val as 'and' | 'or';
                                            onChange(updatedRows);
                                        }}
                                        sx={{ minWidth: 50 }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {/* 添加新规则的表单 */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
                    <SimpleSelect 
                        fullWidth 
                        placeholder="选择字段" 
                        value={newRule.field} 
                        options={fieldSelectOptions} 
                        onChange={(val: string) => updateNewRule({ field: val })} 
                    />
                    
                    {isFilterMode ? (
                        <>
                            <SimpleSelect 
                                value={(newRule as FilterRule).op} 
                                options={operatorOptions} 
                                onChange={(val: string) => updateNewRule({ op: val as any })} 
                                sx={{ minWidth: 120 }} 
                            />
                            <Autocomplete 
                                freeSolo 
                                fullWidth 
                                size="small" 
                                disableClearable 
                                disablePortal
                                options={uniqueFieldValues[newRule.field] || []} 
                                value={(newRule as FilterRule).value} 
                                onInputChange={(_, newValue: string) => updateNewRule({ value: newValue || '' })} 
                                renderInput={(params: any) => <TextField {...params} variant="outlined" placeholder="输入值" />} 
                            />
                        </>
                    ) : (
                        <SimpleSelect 
                            value={(newRule as SortRule).dir} 
                            options={directionOptions} 
                            onChange={(val: string) => updateNewRule({ dir: val as 'asc' | 'desc' })} 
                            sx={{ minWidth: 100 }} 
                        />
                    )}
                    
                    <Button variant="contained" size="small" onClick={handleAddRule}>添加</Button>
                </div>
            </div>
        </div>
    );
}
