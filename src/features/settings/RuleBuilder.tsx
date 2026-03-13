// src/features/settings/ui/components/RuleBuilder.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Typography, Tooltip, Chip, Autocomplete, TextField, Button } from '@mui/material';
import { SimpleSelect } from '@shared/public';
import { DataStore } from '@core/public';
import { getAllFields, readField, FilterRule, SortRule } from '@core/public';

function useUniqueFieldValues(dataStore: DataStore) {
    return useMemo(() => {
        if (!dataStore) return {};
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
        for (const field in valueMap) {
            if (valueMap[field].size > 0) {
                result[field] = Array.from(valueMap[field]).sort((a, b) => a.localeCompare(b, 'zh-CN'));
            }
        }
        return result;
    }, [dataStore]);
}

const defaultFilterRule: FilterRule = { field: '', op: '=', value: '' };
const defaultSortRule: SortRule = { field: '', dir: 'asc' };

interface RuleBuilderProps {
    title: string;
    mode: 'filter' | 'sort';
    rows: (FilterRule | SortRule)[];
    fieldOptions: string[];
    onChange: (rows: (FilterRule | SortRule)[]) => void;
    dataStore: DataStore;
}

function cloneRule<T extends FilterRule | SortRule>(rule: T): T {
    return { ...rule };
}

export function RuleBuilder({ title, mode, rows, fieldOptions, onChange, dataStore }: RuleBuilderProps) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState<FilterRule | SortRule>(
        isFilterMode ? defaultFilterRule : defaultSortRule
    );
    const uniqueFieldValues = useUniqueFieldValues(dataStore);

    const remove = (i: number) => onChange(rows.filter((_, j: number) => j !== i).map(cloneRule));

    const updateNewRule = (patch: Partial<FilterRule | SortRule>) => {
        setNewRule(current => ({ ...current, ...patch }));
    };

    const updateLogic = (index: number, logic: 'and' | 'or') => {
        const updatedRows = rows.map((row, rowIndex) => {
            if (rowIndex !== index || !isFilterMode) return cloneRule(row);
            return { ...(row as FilterRule), logic };
        });
        onChange(updatedRows);
    };

    const handleAddRule = () => {
        if (!newRule.field) {
            alert('请选择一个字段');
            return;
        }

        const updatedRows = rows.map(cloneRule);
        const ruleToAdd = cloneRule(newRule);

        if (isFilterMode && updatedRows.length > 0) {
            const lastIndex = updatedRows.length - 1;
            const lastRule = updatedRows[lastIndex] as FilterRule;
            if (!lastRule.logic) {
                updatedRows[lastIndex] = {
                    ...lastRule,
                    logic: 'and',
                };
            }
        }

        updatedRows.push(ruleToAdd);
        onChange(updatedRows);
        setNewRule(isFilterMode ? { ...defaultFilterRule } : { ...defaultSortRule });
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
    const operatorOptions = ['=', '!=', 'includes', 'regex', '>', '<'].map(op => ({ value: op, label: op }));
    const directionOptions = [{ value: 'asc', label: '升序' }, { value: 'desc', label: '降序' }];
    const logicOptions = [
        { value: 'and', label: '且' },
        { value: 'or', label: '或' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
            <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>{title}</Typography>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    {rows.map((rule: FilterRule | SortRule, i: number) => {
                        const isLast = i === rows.length - 1;
                        const filterRule = rule as FilterRule;

                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Tooltip title={`点击删除规则: ${formatRule(rule)}`}>
                                    <Chip
                                        label={formatRule(rule)}
                                        onClick={() => remove(i)}
                                        size="small"
                                    />
                                </Tooltip>

                                {isFilterMode && !isLast && (
                                    <SimpleSelect
                                        value={filterRule.logic || 'and'}
                                        options={logicOptions}
                                        onChange={(val: string) => updateLogic(i, val as 'and' | 'or')}
                                        sx={{ minWidth: 50 }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

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
