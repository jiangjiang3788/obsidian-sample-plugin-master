/** @jsxImportSource preact */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { normalizeGoalPath, type GoalDefinition } from '@core/goal/public';
import { ThinkIcon } from '@shared/ui/public';
import type { HierarchySingleSelectOption } from './HierarchySingleSelect';

export interface GoalSelectorOption extends HierarchySingleSelectOption {
  goal?: GoalDefinition | null;
}

export interface GoalSelectorProps {
  goals: GoalSelectorOption[];
  selectedGoalPath?: string | null;
  onSelect: (goal: GoalSelectorOption | null) => void;
  onCreateGoal?: (goalPath: string) => Promise<void> | void;
  dense?: boolean;
}

function leafLabel(path: string): string {
  const normalized = normalizeGoalPath(path) || String(path || '').trim();
  return normalized.split('/').filter(Boolean).pop() || normalized;
}

function optionOrder(option: GoalSelectorOption): number {
  return typeof option.order === 'number' && Number.isFinite(option.order)
    ? option.order
    : Number.MAX_SAFE_INTEGER;
}

function compareGoalOption(left: GoalSelectorOption, right: GoalSelectorOption): number {
  const byOrder = optionOrder(left) - optionOrder(right);
  if (byOrder !== 0) return byOrder;
  return String(left.label || leafLabel(left.value)).localeCompare(
    String(right.label || leafLabel(right.value)),
    'zh-Hans-CN',
  );
}

function parentPath(path: string): string {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function buildGoalHierarchy(goals: GoalSelectorOption[]) {
  const byValue = new Map<string, GoalSelectorOption>();

  for (const raw of goals || []) {
    const value = normalizeGoalPath(raw.value) || '';
    if (!value) continue;
    byValue.set(value, {
      ...raw,
      value,
      label: raw.label || leafLabel(value),
    });
  }

  // Keep hierarchy navigation intact even if a settings snapshot omitted an
  // intermediate Goal row. Synthetic nodes are navigation-only.
  for (const option of Array.from(byValue.values())) {
    const parts = option.value.split('/').filter(Boolean);
    for (let index = 1; index < parts.length; index += 1) {
      const value = parts.slice(0, index).join('/');
      if (byValue.has(value)) continue;
      byValue.set(value, {
        id: `synthetic:${value}`,
        value,
        label: leafLabel(value),
        order: option.order,
        synthetic: true,
        goal: null,
      });
    }
  }

  const childrenByParent = new Map<string, GoalSelectorOption[]>();
  for (const option of byValue.values()) {
    const parent = parentPath(option.value);
    const siblings = childrenByParent.get(parent) || [];
    siblings.push(option);
    childrenByParent.set(parent, siblings);
  }
  childrenByParent.forEach((siblings, key) => {
    childrenByParent.set(key, siblings.sort(compareGoalOption));
  });

  return { byValue, childrenByParent };
}

/**
 * Goal is an inline field in QuickInput. The first Goal level is always visible;
 * deeper levels open beside it. The cascade depth is data-driven rather than
 * capped at three columns. Search/recent/card/two-line presentation is
 * intentionally excluded from this field.
 */
export function GoalSelector({ goals, selectedGoalPath, onSelect, dense = false }: GoalSelectorProps) {
  const normalizedSelected = normalizeGoalPath(selectedGoalPath) || null;
  const { byValue, childrenByParent } = useMemo(() => buildGoalHierarchy(goals), [goals]);
  const [expandedPath, setExpandedPath] = useState<string | null>(() => normalizedSelected);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpandedPath(normalizedSelected);
  }, [normalizedSelected]);

  useEffect(() => {
    if (expandedPath && !byValue.has(expandedPath)) setExpandedPath(null);
  }, [byValue, expandedPath]);

  const columns = useMemo(() => {
    const result: GoalSelectorOption[][] = [];
    const roots = childrenByParent.get('') || [];
    if (roots.length > 0) result.push(roots);
    if (!expandedPath) return result;

    const parts = expandedPath.split('/').filter(Boolean);
    for (let index = 1; index <= parts.length; index += 1) {
      const current = parts.slice(0, index).join('/');
      const children = childrenByParent.get(current) || [];
      if (children.length > 0) result.push(children);
    }
    return result;
  }, [childrenByParent, expandedPath]);

  // When the hierarchy is deeper than the visible width, keep the newest
  // column in view automatically. The container remains manually scrollable.
  useEffect(() => {
    const element = listRef.current;
    if (!element || columns.length <= 1) return;
    element.scrollLeft = element.scrollWidth;
  }, [columns.length, expandedPath]);

  if (!goals || goals.length === 0) {
    return <div className="think-combobox-option think-combobox-option--empty">还没有目标。请到目标管理中新建或导入目标。</div>;
  }

  const activePath = expandedPath || normalizedSelected;
  const isOnActiveBranch = (value: string) => Boolean(
    activePath && (activePath === value || activePath.startsWith(`${value}/`)),
  );

  const renderOption = (option: GoalSelectorOption, levelIndex: number) => {
    const hasChildren = (childrenByParent.get(option.value) || []).length > 0;
    const selectable = !option.synthetic;
    const selected = normalizedSelected === option.value;
    const branchActive = isOnActiveBranch(option.value);
    const label = String(option.label || leafLabel(option.value));

    return (
      <button
        key={`${levelIndex}:${option.value}`}
        type="button"
        className="think-combobox-option think-list-row think-list-row--interactive think-quick-input-goal-row"
        role="option"
        aria-selected={selected}
        aria-current={branchActive ? 'true' : undefined}
        data-goal-path={option.value}
        title={option.value.replaceAll('/', ' › ')}
        onClick={() => {
          // Always make the clicked row the active hierarchy path. This keeps
          // the full ancestry highlighted even when the clicked Goal is a leaf.
          setExpandedPath(option.value);
          if (selectable) onSelect(option);
        }}
      >
        <span className="think-combobox-option__label">{label}</span>
        <span className="think-quick-input-goal-row__actions" aria-hidden="true">
          {selected ? <ThinkIcon name="check" /> : null}
          {hasChildren ? <ThinkIcon name="chevron-right" /> : null}
        </span>
      </button>
    );
  };

  const activePathLabel = activePath ? activePath.split('/').filter(Boolean).join(' › ') : '';

  return (
    <div className={`think-quick-input-goal-selector${dense ? ' is-dense' : ''}`}>
      {activePathLabel ? (
        <div className="think-quick-input-goal-active-path" title={activePathLabel} aria-live="polite">
          {activePathLabel}
        </div>
      ) : null}
      <div ref={listRef} className="think-list think-quick-input-goal-list" aria-label="目标层级选择">
        {columns.map((level, levelIndex) => (
          <div className="think-list think-quick-input-goal-level" role="listbox" aria-label={`目标第 ${levelIndex + 1} 层`} key={`goal-level:${levelIndex}`}>
            {level.map((option) => renderOption(option, levelIndex))}
          </div>
        ))}
      </div>
    </div>
  );
}
