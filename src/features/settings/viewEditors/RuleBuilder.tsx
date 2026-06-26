// src/features/settings/ui/components/RuleBuilder.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Box, Button, Chip, Tooltip, Typography } from '@shared/public';
import { DeleteOutlineIcon, IconAction, SimpleSelect } from '@shared/public';
import type { DataStore, FilterRule, SortRule } from '@core/public';
import { FieldPickerAutocomplete } from './FieldPickerAutocomplete';
import {
    appendRule,
    buildRuleLabel,
    buildUniqueFieldValues,
    getPanelAddRuleGridTemplate,
    getPanelRuleGridTemplate,
    makeDefaultRule,
    operatorNeedsValue,
    patchRule,
    patchRuleLogic,
    patchRuleRows,
    removeRuleAt,
    RULE_DIRECTION_OPTIONS,
    RULE_LOGIC_OPTIONS,
    RULE_OPERATOR_OPTIONS,
    shouldShowRuleValueInput,
    type RuleBuilderRule,
    type RuleBuilderVariant,
} from './RuleBuilderModel';
import { RuleBuilderValueInput } from './RuleBuilderValueInput';

interface RuleBuilderProps {
    title: string;
    mode: 'filter' | 'sort';
    rows: RuleBuilderRule[];
    fieldOptions: string[];
    onChange: (rows: RuleBuilderRule[]) => void;
    dataStore: DataStore;
    variant?: RuleBuilderVariant;
}

export function RuleBuilder({ title, mode, rows, fieldOptions, onChange, dataStore, variant = 'compact' }: RuleBuilderProps) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState<RuleBuilderRule>(makeDefaultRule(mode));
    const uniqueFieldValues = useMemo(() => buildUniqueFieldValues(dataStore), [dataStore]);
    const shouldShowValueInput = shouldShowRuleValueInput(mode, newRule);

    const remove = (index: number) => onChange(removeRuleAt(rows, index));

    const updateNewRule = (patch: Partial<FilterRule | SortRule>) => {
        setNewRule(current => patchRule(mode, current, patch as Partial<RuleBuilderRule>));
    };

    const updateRow = (index: number, patch: Partial<FilterRule | SortRule>) => {
        onChange(patchRuleRows(mode, rows, index, patch as Partial<RuleBuilderRule>));
    };

    const updateLogic = (index: number, logic: 'and' | 'or') => {
        onChange(patchRuleLogic(rows, index, logic, isFilterMode));
    };

    const handleAddRule = () => {
        if (!newRule.field) {
            alert('请选择一个字段');
            return;
        }
        onChange(appendRule(mode, rows, newRule));
        setNewRule(makeDefaultRule(mode));
    };

    const renderFieldInput = (
        field: string,
        onFieldChange: (field: string) => void,
        placeholder = '搜索 / 选择字段'
    ) => (
        <FieldPickerAutocomplete
            value={field}
            options={fieldOptions}
            onChange={onFieldChange}
            placeholder={placeholder}
            helperText={variant === 'panel' ? '字段按核心字段 / 文件字段 / 自定义字段分组。' : undefined}
        />
    );

    const renderValueInput = (rule: FilterRule, onValueChange: (value: any) => void) => (
        <RuleBuilderValueInput
            rule={rule}
            uniqueFieldValues={uniqueFieldValues}
            variant={variant}
            onValueChange={onValueChange}
        />
    );

    const existingRules = (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {rows.map((rule: RuleBuilderRule, index: number) => {
                const isLast = index === rows.length - 1;
                const filterRule = rule as FilterRule;

                return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Tooltip title={`点击删除规则: ${buildRuleLabel(mode, rule)}`}>
                            <Chip
                                label={buildRuleLabel(mode, rule)}
                                onClick={() => remove(index)}
                                size="small"
                            />
                        </Tooltip>

                        {isFilterMode && !isLast && (
                            <SimpleSelect
                                value={filterRule.logic || 'and'}
                                options={RULE_LOGIC_OPTIONS}
                                onChange={(val: string) => updateLogic(index, val as 'and' | 'or')}
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
            {rows.map((rule: RuleBuilderRule, index: number) => {
                const filterRule = rule as FilterRule;
                const sortRule = rule as SortRule;
                const isLast = index === rows.length - 1;
                const showValueInput = isFilterMode && operatorNeedsValue(filterRule.op);

                return (
                    <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: getPanelRuleGridTemplate(mode, showValueInput),
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
                                        options={RULE_OPERATOR_OPTIONS}
                                        onChange={(val: string) => updateRow(index, { op: val as FilterRule['op'] })}
                                        sx={{ minWidth: 140 }}
                                    />
                                    {renderValueInput(filterRule, (value) => updateRow(index, { value }))}
                                </>
                            ) : (
                                <SimpleSelect
                                    value={sortRule.dir}
                                    options={RULE_DIRECTION_OPTIONS}
                                    onChange={(val: string) => updateRow(index, { dir: val as 'asc' | 'desc' })}
                                    sx={{ minWidth: 120 }}
                                />
                            )}

                            {isFilterMode && !isLast ? (
                                <SimpleSelect
                                    value={filterRule.logic || 'and'}
                                    options={RULE_LOGIC_OPTIONS}
                                    onChange={(val: string) => updateLogic(index, val as 'and' | 'or')}
                                    sx={{ minWidth: 80 }}
                                />
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                                    {isFilterMode ? '末尾' : ''}
                                </Typography>
                            )}

                            <IconAction
                                label="删除规则"
                                icon={<DeleteOutlineIcon fontSize="small" />}
                                onClick={() => remove(index)}
                                size="small"
                            />
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
                                gridTemplateColumns: getPanelRuleGridTemplate(mode, isFilterMode),
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
                        gridTemplateColumns: getPanelAddRuleGridTemplate(mode, shouldShowValueInput),
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
                                options={RULE_OPERATOR_OPTIONS}
                                onChange={(val: string) => updateNewRule({ op: val as FilterRule['op'] })}
                                sx={{ minWidth: 140 }}
                            />
                            {shouldShowValueInput && renderValueInput(newRule as FilterRule, (value) => updateNewRule({ value }))}
                        </>
                    ) : (
                        <SimpleSelect
                            value={(newRule as SortRule).dir}
                            options={RULE_DIRECTION_OPTIONS}
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
                                options={RULE_OPERATOR_OPTIONS}
                                onChange={(val: string) => updateNewRule({ op: val as FilterRule['op'] })}
                                sx={{ minWidth: 120 }}
                            />
                            {shouldShowValueInput && renderValueInput(newRule as FilterRule, (value) => updateNewRule({ value }))}
                        </>
                    ) : (
                        <SimpleSelect
                            value={(newRule as SortRule).dir}
                            options={RULE_DIRECTION_OPTIONS}
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
