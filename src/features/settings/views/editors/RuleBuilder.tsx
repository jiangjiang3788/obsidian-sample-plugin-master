// src/features/settings/ui/components/RuleBuilder.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  SimpleSelect,
  ThinkButton,
  ThinkIcon,
  ThinkIconButton,
} from '@shared/ui/public';
import type { DataStore } from '@core/services/public';
import type { FilterRule, SortRule } from '@core/types/public';
import { FieldPickerAutocomplete } from './FieldPickerAutocomplete';
import {
    appendRule,
    buildRuleLabel,
    buildUniqueFieldValues,
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
    showHeader?: boolean;
}

export function RuleBuilder({ title, mode, rows, fieldOptions, onChange, dataStore, variant = 'compact', showHeader = true }: RuleBuilderProps) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState<RuleBuilderRule>(makeDefaultRule(mode));
    const uniqueFieldValues = useMemo(() => buildUniqueFieldValues(dataStore), [dataStore]);
    const shouldShowValueInput = shouldShowRuleValueInput(mode, newRule);

    const remove = (index: number) => onChange(removeRuleAt(rows, index));
    const updateNewRule = (patch: Partial<FilterRule | SortRule>) => setNewRule(current => patchRule(mode, current, patch as Partial<RuleBuilderRule>));
    const updateRow = (index: number, patch: Partial<FilterRule | SortRule>) => onChange(patchRuleRows(mode, rows, index, patch as Partial<RuleBuilderRule>));
    const updateLogic = (index: number, logic: 'and' | 'or') => onChange(patchRuleLogic(rows, index, logic, isFilterMode));

    const handleAddRule = () => {
        if (!newRule.field) return;
        onChange(appendRule(mode, rows, newRule));
        setNewRule(makeDefaultRule(mode));
    };

    const renderFieldInput = (field: string, onFieldChange: (field: string) => void, placeholder = '搜索 / 选择字段') => (
        <FieldPickerAutocomplete value={field} options={fieldOptions} onChange={onFieldChange} placeholder={placeholder} />
    );

    const renderValueInput = (rule: FilterRule, onValueChange: (value: any) => void) => (
        <RuleBuilderValueInput rule={rule} uniqueFieldValues={uniqueFieldValues} onValueChange={onValueChange} />
    );

    const existingRules = (
        <div className="think-rule-builder__chips">
            {rows.map((rule: RuleBuilderRule, index: number) => {
                const isLast = index === rows.length - 1;
                const filterRule = rule as FilterRule;
                const label = buildRuleLabel(mode, rule);
                return (
                    <div key={index} className="think-rule-builder__chip-row">
                        <button type="button" className="think-chip" title={`点击删除规则: ${label}`} onClick={() => remove(index)}>
                            <span className="think-chip__label">{label}</span>
                            <span className="think-chip__remove" aria-hidden="true">×</span>
                        </button>
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
        <div className="think-rule-builder__panel-rows">
            {rows.map((rule: RuleBuilderRule, index: number) => {
                const filterRule = rule as FilterRule;
                const sortRule = rule as SortRule;
                const isLast = index === rows.length - 1;
                const showValueInput = isFilterMode && operatorNeedsValue(filterRule.op);
                return (
                    <div key={index} className="think-rule-builder__row-shell">
                        <div className={`think-rule-builder__row-grid ${isFilterMode ? (showValueInput ? 'is-filter is-with-value' : 'is-filter is-no-value') : 'is-sort'}`}>
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
                                <span className="think-rule-builder__end-label">{isFilterMode ? '末尾' : ''}</span>
                            )}

                            <ThinkIconButton
                                label="删除规则"
                                icon={<ThinkIcon name="trash-2" />}
                                onClick={() => remove(index)}
                                size="sm"
                                tone="danger"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (variant === 'panel') {
        return (
            <div className="think-rule-builder">
                {showHeader && <div className="think-editor-header"><span className="think-settings-label-strong">{title}规则</span></div>}

                {rows.length > 0 ? (
                    <div className="think-rule-builder__rules">
                        <div className={`think-rule-builder__column-head ${isFilterMode ? 'is-filter is-with-value' : 'is-sort'}`}>
                            <span>字段</span>
                            <span>{isFilterMode ? '条件' : '排序'}</span>
                            {isFilterMode && <span>值</span>}
                            <span>连接</span>
                            <span>操作</span>
                        </div>
                        {panelRuleRows}
                    </div>
                ) : (
                    <span className="think-rule-builder__empty">暂无规则</span>
                )}

                <div className={`think-rule-builder__add-grid ${isFilterMode ? (shouldShowValueInput ? 'is-filter is-with-value' : 'is-filter is-no-value') : 'is-sort'}`}>
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
                    <ThinkButton variant="primary" size="sm" onClick={handleAddRule} disabled={!newRule.field} className="think-rule-builder__add">添加规则</ThinkButton>
                </div>
            </div>
        );
    }

    return (
        <div className="think-rule-builder__compact">
            <span className="think-settings-row__label think-settings-row__label--top">{title}</span>
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
                    <ThinkButton variant="primary" size="sm" onClick={handleAddRule} disabled={!newRule.field}>添加</ThinkButton>
                </div>
            </div>
        </div>
    );
}
