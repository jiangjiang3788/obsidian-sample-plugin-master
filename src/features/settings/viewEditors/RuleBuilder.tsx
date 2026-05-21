// src/features/settings/ui/components/RuleBuilder.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    IconButton,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { SimpleSelect } from '@shared/public';
import { DataStore } from '@core/public';
import { getAllFields, readField, getFieldLabel, FilterRule, SortRule } from '@core/public';

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
    variant?: 'compact' | 'panel';
}

function cloneRule<T extends FilterRule | SortRule>(rule: T): T {
    return { ...rule };
}

function operatorNeedsValue(op: FilterRule['op']): boolean {
    return !['empty', 'notEmpty'].includes(op);
}

function isMultiValueOperator(op?: FilterRule['op']): boolean {
    return op === 'in' || op === 'notIn';
}

function getValuePlaceholder(op?: FilterRule['op']): string {
    if (op === 'between') return '输入区间，如 1~5 或 2026-01-01~2026-01-31';
    if (isMultiValueOperator(op)) return '选择或输入多个值，回车确认';
    return '输入值';
}

function normalizeMultiValue(value: any): string[] {
    const rawValues = Array.isArray(value) ? value : [value];
    const normalized = rawValues
        .flatMap(v => String(v ?? '').split(/[,，\n]/))
        .map(part => part.trim())
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

function formatRuleValue(rule: FilterRule): string {
    if (!operatorNeedsValue(rule.op)) return '';
    if (isMultiValueOperator(rule.op)) {
        const values = normalizeMultiValue(rule.value);
        return values.length > 0 ? values.join('、') : '未选择';
    }
    if (rule.op === 'between' && Array.isArray(rule.value)) {
        return rule.value.map(v => String(v)).join(' ~ ');
    }
    return String(rule.value ?? '');
}

function normalizeFilterPatch(patch: Partial<FilterRule>, current?: FilterRule): Partial<FilterRule> {
    const nextOp = (patch.op ?? current?.op) as FilterRule['op'] | undefined;
    const normalized: Partial<FilterRule> = { ...patch };

    if (nextOp && !operatorNeedsValue(nextOp)) {
        return { ...normalized, value: '' };
    }

    if (patch.field !== undefined && patch.field !== current?.field) {
        normalized.value = nextOp && isMultiValueOperator(nextOp) ? [] : '';
    }

    if (nextOp && isMultiValueOperator(nextOp)) {
        if ('value' in normalized || patch.op !== undefined) {
            normalized.value = normalizeMultiValue(normalized.value ?? current?.value);
        }
    } else if (current && isMultiValueOperator(current.op) && patch.op !== undefined) {
        normalized.value = normalizeMultiValue(current.value).join(',');
    }

    return normalized;
}

export function RuleBuilder({ title, mode, rows, fieldOptions, onChange, dataStore, variant = 'compact' }: RuleBuilderProps) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState<FilterRule | SortRule>(
        isFilterMode ? { ...defaultFilterRule } : { ...defaultSortRule }
    );
    const uniqueFieldValues = useUniqueFieldValues(dataStore);
    const currentFilterRule = newRule as FilterRule;
    const shouldShowValueInput = !isFilterMode || operatorNeedsValue(currentFilterRule.op);

    const remove = (i: number) => onChange(rows.filter((_, j: number) => j !== i).map(cloneRule));

    const updateNewRule = (patch: Partial<FilterRule | SortRule>) => {
        setNewRule(current => {
            const nextPatch = isFilterMode ? normalizeFilterPatch(patch as Partial<FilterRule>, current as FilterRule) : patch;
            return { ...current, ...nextPatch };
        });
    };

    const updateRow = (index: number, patch: Partial<FilterRule | SortRule>) => {
        const updatedRows = rows.map((row, rowIndex) => {
            if (rowIndex !== index) return cloneRule(row);
            const nextPatch = isFilterMode ? normalizeFilterPatch(patch as Partial<FilterRule>, row as FilterRule) : patch;
            return { ...row, ...nextPatch };
        });
        onChange(updatedRows);
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
            if (filterRule.op === 'empty') return `${getFieldLabel(filterRule.field)} 为空`;
            if (filterRule.op === 'notEmpty') return `${getFieldLabel(filterRule.field)} 非空`;
            const valueText = formatRuleValue(filterRule);
            const opText = filterRule.op === 'in' ? '属于任一' : filterRule.op === 'notIn' ? '不属于任一' : filterRule.op;
            return `${getFieldLabel(filterRule.field)} ${opText} "${valueText}"`;
        }
        const sortRule = rule as SortRule;
        return `${getFieldLabel(sortRule.field)} ${sortRule.dir === 'asc' ? '升序' : '降序'}`;
    };

    const fieldSelectOptions = fieldOptions.map((f: string) => ({ value: f, label: getFieldLabel(f) }));
    const operatorOptions = [
        { value: '=', label: '=' },
        { value: '!=', label: '!=' },
        { value: 'includes', label: '包含' },
        { value: 'regex', label: '正则' },
        { value: '>', label: '>' },
        { value: '<', label: '<' },
        { value: 'in', label: '属于任一' },
        { value: 'notIn', label: '不属于任一' },
        { value: 'between', label: '区间' },
        { value: 'empty', label: '为空' },
        { value: 'notEmpty', label: '非空' },
    ];
    const directionOptions = [{ value: 'asc', label: '升序' }, { value: 'desc', label: '降序' }];
    const logicOptions = [
        { value: 'and', label: '且' },
        { value: 'or', label: '或' }
    ];

    const renderFieldInput = (
        field: string,
        onFieldChange: (field: string) => void,
        placeholder = '搜索 / 选择字段'
    ) => {
        const selectedFieldOption = fieldSelectOptions.find(option => option.value === field) || null;
        return (
            <Autocomplete
                size="small"
                fullWidth
                disablePortal
                options={fieldSelectOptions}
                value={selectedFieldOption}
                getOptionLabel={(option: any) => option?.label || ''}
                isOptionEqualToValue={(option: any, value: any) => option?.value === value?.value}
                onChange={(_, option: any) => onFieldChange(option?.value || '')}
                renderInput={(params: any) => <TextField {...params} variant="outlined" placeholder={placeholder} />}
            />
        );
    };

    const renderValueInput = (
        rule: FilterRule,
        onValueChange: (value: any) => void
    ) => {
        if (!operatorNeedsValue(rule.op)) return null;

        if (isMultiValueOperator(rule.op)) {
            return (
                <Autocomplete
                    multiple
                    freeSolo
                    fullWidth
                    size="small"
                    disablePortal
                    options={uniqueFieldValues[rule.field] || []}
                    value={normalizeMultiValue(rule.value)}
                    onChange={(_, newValue: string[]) => onValueChange(normalizeMultiValue(newValue))}
                    renderInput={(params: any) => (
                        <TextField
                            {...params}
                            variant="outlined"
                            placeholder={getValuePlaceholder(rule.op)}
                            helperText={variant === 'panel' ? '同一字段内多选表示“或”：匹配其中任一值即可。' : undefined}
                        />
                    )}
                />
            );
        }

        return (
            <Autocomplete
                freeSolo
                fullWidth
                size="small"
                disableClearable
                disablePortal
                options={uniqueFieldValues[rule.field] || []}
                value={String(rule.value ?? '')}
                inputValue={String(rule.value ?? '')}
                onInputChange={(_, newValue: string) => onValueChange(newValue || '')}
                renderInput={(params: any) => <TextField {...params} variant="outlined" placeholder={getValuePlaceholder(rule.op)} />}
            />
        );
    };

    const existingRules = (
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
    );

    const panelRuleRows = (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rows.map((rule: FilterRule | SortRule, index: number) => {
                const filterRule = rule as FilterRule;
                const sortRule = rule as SortRule;
                const isLast = index === rows.length - 1;
                const gridTemplateColumns = isFilterMode && operatorNeedsValue(filterRule.op)
                    ? 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(260px, 1.2fr) minmax(96px, 0.35fr) 40px'
                    : 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(96px, 0.35fr) 40px';

                return (
                    <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns,
                                gap: 1,
                                alignItems: 'center',
                                p: 1,
                                border: '1px solid var(--background-modifier-border)',
                                borderRadius: '8px',
                                background: 'var(--background-primary)',
                            }}
                        >
                            {renderFieldInput(rule.field, (field) => updateRow(index, { field }))}

                            {isFilterMode ? (
                                <>
                                    <SimpleSelect
                                        value={filterRule.op}
                                        options={operatorOptions}
                                        onChange={(val: string) => updateRow(index, { op: val as FilterRule['op'] })}
                                        sx={{ minWidth: 140 }}
                                    />
                                    {renderValueInput(filterRule, (value) => updateRow(index, { value }))}
                                </>
                            ) : (
                                <SimpleSelect
                                    value={sortRule.dir}
                                    options={directionOptions}
                                    onChange={(val: string) => updateRow(index, { dir: val as 'asc' | 'desc' })}
                                    sx={{ minWidth: 120 }}
                                />
                            )}

                            {isFilterMode && !isLast ? (
                                <SimpleSelect
                                    value={filterRule.logic || 'and'}
                                    options={logicOptions}
                                    onChange={(val: string) => updateLogic(index, val as 'and' | 'or')}
                                    sx={{ minWidth: 80 }}
                                />
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                                    {isFilterMode ? '末尾' : ''}
                                </Typography>
                            )}

                            <Tooltip title="删除规则">
                                <IconButton size="small" onClick={() => remove(index)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );

    if (variant === 'panel') {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <div>
                        <Typography sx={{ fontWeight: 600 }}>{title}规则</Typography>
                        <Typography variant="body2" color="text.secondary">
                            字段支持搜索；已有规则可直接编辑。“属于任一 / 不属于任一”支持多选 chip，也可输入后回车添加；区间用“开始~结束”。
                        </Typography>
                    </div>
                </Box>

                {rows.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: isFilterMode
                                    ? 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(260px, 1.2fr) minmax(96px, 0.35fr) 40px'
                                    : 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(96px, 0.35fr) 40px',
                                gap: 1,
                                px: 1,
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="caption">字段</Typography>
                            <Typography variant="caption">{isFilterMode ? '条件' : '排序'}</Typography>
                            {isFilterMode && <Typography variant="caption">值</Typography>}
                            <Typography variant="caption">连接</Typography>
                            <Typography variant="caption">操作</Typography>
                        </Box>
                        {panelRuleRows}
                    </Box>
                ) : (
                    <Box sx={{ p: 2, border: '1px dashed var(--background-modifier-border)', borderRadius: '8px' }}>
                        <Typography variant="body2" color="text.secondary">还没有规则。先在下方选择字段、条件和值，然后添加规则。</Typography>
                    </Box>
                )}

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: isFilterMode && shouldShowValueInput
                            ? 'minmax(260px, 1.4fr) minmax(150px, 0.6fr) minmax(260px, 1.3fr) auto'
                            : 'minmax(260px, 1.4fr) minmax(150px, 0.6fr) auto',
                        gap: 1,
                        alignItems: 'center',
                        p: 1.5,
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '8px',
                        background: 'var(--background-secondary)',
                    }}
                >
                    {renderFieldInput(newRule.field, (field) => updateNewRule({ field }))}

                    {isFilterMode ? (
                        <>
                            <SimpleSelect
                                value={(newRule as FilterRule).op}
                                options={operatorOptions}
                                onChange={(val: string) => updateNewRule({ op: val as FilterRule['op'] })}
                                sx={{ minWidth: 140 }}
                            />
                            {shouldShowValueInput && renderValueInput(newRule as FilterRule, (value) => updateNewRule({ value }))}
                        </>
                    ) : (
                        <SimpleSelect
                            value={(newRule as SortRule).dir}
                            options={directionOptions}
                            onChange={(val: string) => updateNewRule({ dir: val as 'asc' | 'desc' })}
                            sx={{ minWidth: 120 }}
                        />
                    )}

                    <Button variant="contained" size="small" onClick={handleAddRule} sx={{ whiteSpace: 'nowrap' }}>添加规则</Button>
                </Box>
            </Box>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
            <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>{title}</Typography>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {existingRules}

                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
                    {renderFieldInput(newRule.field, (field) => updateNewRule({ field }))}

                    {isFilterMode ? (
                        <>
                            <SimpleSelect
                                value={(newRule as FilterRule).op}
                                options={operatorOptions}
                                onChange={(val: string) => updateNewRule({ op: val as FilterRule['op'] })}
                                sx={{ minWidth: 120 }}
                            />
                            {shouldShowValueInput && renderValueInput(newRule as FilterRule, (value) => updateNewRule({ value }))}
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
