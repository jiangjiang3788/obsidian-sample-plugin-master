/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  Modal,
  ThinkButton,
  ThinkIcon,
} from '@shared/ui/public';
import { DataStore } from '@core/services/public';
import { getAllFields } from '@core/types/public';
import { getFieldLabel } from '@core/fields/public';
import type { FilterRule, RecordViewItem } from '@core/types/public';
import { normalizeViewFilters } from '@core/view/public';
import { RuleBuilder } from '@features/settings/views/editors/RuleBuilder';
import { CommonFilterPanel, splitDefaultQuickFilterRules } from '@features/settings/views/editors/CommonFilterPanel';

interface DataFilterPanelProps {
  dataStore: DataStore;
  filters: FilterRule[];
  items?: RecordViewItem[];
  onChange: (filters: FilterRule[]) => void;
}

function asDisplayList(value: any): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (value === null || value === undefined) return [];
  return String(value).split(/[,，\n]/).map(v => v.trim()).filter(Boolean);
}

function describeRule(rule: FilterRule): string {
  if (rule.op === 'empty') return `${getFieldLabel(rule.field)} 为空`;
  if (rule.op === 'notEmpty') return `${getFieldLabel(rule.field)} 非空`;
  if (rule.op === 'in' || rule.op === 'notIn') {
    const values = asDisplayList(rule.value);
    const opText = rule.op === 'in' ? '属于任一' : '不属于任一';
    return `${getFieldLabel(rule.field)} ${opText} ${values.join('、') || '未选择'}`;
  }
  if (rule.op === 'between') {
    const values = asDisplayList(rule.value);
    return `${getFieldLabel(rule.field)} 区间 ${values.join(' ~ ') || String(rule.value ?? '')}`;
  }
  return `${getFieldLabel(rule.field)} ${rule.op} ${String(rule.value ?? '')}`;
}

export function DataFilterPanel({ dataStore, filters, items, onChange }: DataFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const activeCount = filters.length;
  const sourceItems = items ?? dataStore.queryItems();
  const fieldOptions = useMemo(() => getAllFields(sourceItems), [sourceItems]);
  const { quickRules, advancedRules } = useMemo(() => splitDefaultQuickFilterRules(filters), [filters]);
  const advancedFilterCount = advancedRules.length;

  const handleOpen = () => setOpen(true);
  const handleClear = () => onChange([]);
  const handleDeleteRule = (index: number) => onChange(filters.filter((_, currentIndex) => currentIndex !== index));
  const handleAdvancedChange = (rows: FilterRule[]) => onChange(normalizeViewFilters([...quickRules, ...rows]));

  return (
    <div class="tp-toolbar-data-filter">
      <ThinkButton
        size="sm"
        variant="secondary"
        aria-pressed={activeCount > 0}
        leadingIcon={<ThinkIcon name="filter" />}
        onClick={handleOpen}
      >
        数据筛选{activeCount > 0 ? ` (${activeCount})` : ''}
      </ThinkButton>

      {activeCount > 0 && (
        <div class="think-filter-popover__selected-chips" aria-label="当前筛选">
          {filters.slice(0, 3).map((rule, index) => (
            <button
              key={`${rule.field}-${rule.op}-${index}`}
              type="button"
              className="think-chip"
              onClick={() => handleDeleteRule(index)}
              title="移除此筛选"
            >
              <span className="think-chip__label">{describeRule(rule)}</span>
              <span className="think-chip__remove" aria-hidden="true">×</span>
            </button>
          ))}
          {filters.length > 3 && <span className="think-chip">+{filters.length - 3}</span>}
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="全局数据筛选"
        size="large"
        className="think-os--settings think-data-filter-dialog"
        footer={(
          <div className="think-data-filter-dialog__actions">
            <ThinkButton size="sm" variant="secondary" onClick={handleClear} disabled={activeCount === 0}>清空全部</ThinkButton>
            <ThinkButton size="sm" variant="primary" onClick={() => setOpen(false)}>完成</ThinkButton>
          </div>
        )}
      >
        <div className="think-data-filter-dialog__content">
          <div className="think-data-filter-dialog__meta-line">
            <span>{fieldOptions.length} 个字段</span>
            <span>{activeCount} 条规则</span>
          </div>

          <CommonFilterPanel
            dataStore={dataStore}
            filters={filters}
            items={sourceItems}
            fieldOptions={fieldOptions}
            onChange={onChange}
            showHeader={false}
          />

          <div className="think-filter-rule-section">
            <div className="think-filter-rule-section__head">
              <span>高级规则</span>
              <span className="think-filter-rule-section__meta">{advancedFilterCount} 条</span>
            </div>
            <RuleBuilder
              title="筛选"
              mode="filter"
              rows={advancedRules}
              fieldOptions={fieldOptions}
              onChange={(rows) => handleAdvancedChange(rows as FilterRule[])}
              dataStore={dataStore}
              showHeader={false}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
