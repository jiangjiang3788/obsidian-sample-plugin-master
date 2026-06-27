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
        <div className="think-rule-builder__chips">
            {rows.map((rule: RuleBuilderRule, index: number) => {
                const isLast = index === rows.length - 1;
                const filterRule = rule as FilterRule;

                return (
                    <div key={index} className="think-rule-builder__chip-row">
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
                                className="think-rule-builder__logic"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );

    const panelRuleRows = (
        <Box className="think-rule-builder__panel-rows">
            {rows.map((rule: RuleBuilderRule, index: number) => {
                const filterRule = rule as FilterRule;
                const sortRule = rule as SortRule;
                const isLast = index === rows.length - 1;
                const showValueInput = isFilterMode && operatorNeedsValue(filterRule.op);

                return (
                    <Box key={index} className="think-rule-builder__row-shell">
                        <Box
                            className="think-rule-builder__row-grid"
                            sx={{ gridTemplateColumns: getPanelRuleGridTemplate(mode, showValueInput) }}
                        >
                            {renderFieldInput(rule.field, (field) => updateRow(index, { field }))}

                            {isFilterMode ? (
                                <>
                                    <SimpleSelect
                                        value={filterRule.op}
                                        options={RULE_OPERATOR_OPTIONS}
                                        onChange={(val: string) => updateRow(index, { op: val as FilterRule['op'] })}
                                        className="think-rule-builder__field"
                                    />
                                    {renderValueInput(filterRule, (value) => updateRow(index, { value }))}
                                </>
                            ) : (
                                <SimpleSelect
                                    value={sortRule.dir}
                                    options={RULE_DIRECTION_OPTIONS}
                                    onChange={(val: string) => updateRow(index, { dir: val as 'asc' | 'desc' })}
                                    className="think-rule-builder__operator"
                                />
                            )}

                            {isFilterMode && !isLast ? (
                                <SimpleSelect
                                    value={filterRule.logic || 'and'}
                                    options={RULE_LOGIC_OPTIONS}
                                    onChange={(val: string) => updateLogic(index, val as 'and' | 'or')}
                                    className="think-rule-builder__value"
                                />
                            ) : (
                                <Typography variant="body2" color="text.secondary" className="think-rule-builder__end-label">
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
            <Box className="think-rule-builder">
                <Box className="think-editor-header">
                    <div>
                        <Typography className="think-settings-label-strong">{title}规则</Typography>
                        <Typography variant="body2" color="text.secondary">
                            字段支持搜索；已有规则可直接编辑。“属于任一 / 不属于任一”支持多选 chip，也可输入后回车添加；区间用“开始~结束”。
                        </Typography>
                    </div>
                </Box>

                {rows.length > 0 ? (
                    <Box className="think-rule-builder__rules">
                        <Box
                            className="think-rule-builder__column-head"
                            sx={{ gridTemplateColumns: getPanelRuleGridTemplate(mode, isFilterMode) }}
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
                    <Box className="think-editor-card think-editor-card--dashed">
                        <Typography variant="body2" color="text.secondary">还没有规则。先在下方选择字段、条件和值，然后添加规则。</Typography>
                    </Box>
                )}

                <Box
                    className="think-rule-builder__add-grid"
                    sx={{ gridTemplateColumns: getPanelAddRuleGridTemplate(mode, shouldShowValueInput) }}
                >
                    {renderFieldInput(newRule.field, (field) => updateNewRule({ field }))}

                    {isFilterMode ? (
                        <>
                            <SimpleSelect
                                value={(newRule as FilterRule).op}
                                options={RULE_OPERATOR_OPTIONS}
                                onChange={(val: string) => updateNewRule({ op: val as FilterRule['op'] })}
                                className="think-rule-builder__field"
                            />
                            {shouldShowValueInput && renderValueInput(newRule as FilterRule, (value) => updateNewRule({ value }))}
                        </>
                    ) : (
                        <SimpleSelect
                            value={(newRule as SortRule).dir}
                            options={RULE_DIRECTION_OPTIONS}
                            onChange={(val: string) => updateNewRule({ dir: val as 'asc' | 'desc' })}
                            className="think-rule-builder__operator"
                        />
                    )}

                    <Button variant="contained" size="small" onClick={handleAddRule} className="think-rule-builder__add">添加规则</Button>
                </Box>
            </Box>
        );
    }

    return (
        <div className="think-rule-builder__compact">
            <Typography className="think-settings-row__label think-settings-row__label--top">{title}</Typography>
            <div className="think-rule-builder__compact-body">
                {existingRules}

                <div className="think-rule-builder__compact-add">
                    {renderFieldInput(newRule.field, (field) => updateNewRule({ field }))}

                    {isFilterMode ? (
                        <>
                            <SimpleSelect
                                value={(newRule as FilterRule).op}
                                options={RULE_OPERATOR_OPTIONS}
                                onChange={(val: string) => updateNewRule({ op: val as FilterRule['op'] })}
                                className="think-rule-builder__operator"
                            />
                            {shouldShowValueInput && renderValueInput(newRule as FilterRule, (value) => updateNewRule({ value }))}
                        </>
                    ) : (
                        <SimpleSelect
                            value={(newRule as SortRule).dir}
                            options={RULE_DIRECTION_OPTIONS}
                            onChange={(val: string) => updateNewRule({ dir: val as 'asc' | 'desc' })}
                            className="think-rule-builder__operator"
                        />
                    )}

                    <Button variant="contained" size="small" onClick={handleAddRule}>添加</Button>
                </div>
            </div>
        </div>
    );
}
