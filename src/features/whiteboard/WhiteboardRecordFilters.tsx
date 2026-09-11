/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ThinkButton, ThinkCheckbox, ThinkInput, ThinkSelect } from '@shared/ui/public';
import {
  WHITEBOARD_SOURCE_DATE_ROLES,
  type WhiteboardGoalTreeNode,
  type WhiteboardRecordSourceTimeState,
  type WhiteboardRecordTypeOption,
} from './WhiteboardRecordSourceQuery';

export interface WhiteboardRecordFiltersProps {
  recordTypeOptions: WhiteboardRecordTypeOption[];
  selectedRecordTypes: string[];
  onRecordTypesChange: (recordTypes: string[]) => void;
  goalTree: WhiteboardGoalTreeNode[];
  selectedGoalPaths: string[];
  onGoalPathsChange: (goalPaths: string[]) => void;
  time: WhiteboardRecordSourceTimeState | null;
  onTimeChange: (time: WhiteboardRecordSourceTimeState | null) => void;
  dateError?: string | null;
}

interface GoalNodeViewProps {
  node: WhiteboardGoalTreeNode;
  selected: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  onToggleExpanded: (goalPath: string) => void;
  onToggleSubtree: (node: WhiteboardGoalTreeNode, checked: boolean) => void;
}

function GoalNodeView({ node, selected, expanded, onToggleExpanded, onToggleSubtree }: GoalNodeViewProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const selectedCount = node.selectableGoalPaths.reduce((count, path) => count + (selected.has(path) ? 1 : 0), 0);
  const checked = node.selectableGoalPaths.length > 0 && selectedCount === node.selectableGoalPaths.length;
  const mixed = selectedCount > 0 && !checked;
  const isExpanded = expanded.has(node.value);

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <div class="think-whiteboard-goal-tree__node" data-goal-path={node.value}>
      <div class="think-whiteboard-goal-tree__row think-list-row think-list-row--compact">
        <label class="think-selection-control think-selection-control--compact think-whiteboard-goal-tree__check" title={node.value}>
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            aria-checked={mixed ? 'mixed' : checked ? 'true' : 'false'}
            onChange={(event) => onToggleSubtree(node, (event.currentTarget as HTMLInputElement).checked)}
          />
          <span class="think-selection-control__text"><span class="think-selection-control__label">{node.label}</span></span>
        </label>
        {node.children.length > 0 ? (
          <button
            type="button"
            class="think-whiteboard-goal-tree__toggle"
            aria-label={`${isExpanded ? '折叠' : '展开'} ${node.label}`}
            aria-expanded={isExpanded}
            onClick={() => onToggleExpanded(node.value)}
          >{isExpanded ? '⌄' : '›'}</button>
        ) : <span class="think-whiteboard-goal-tree__toggle-placeholder" aria-hidden="true" />}
      </div>
      {isExpanded && node.children.length > 0 && (
        <div class="think-whiteboard-goal-tree__children">
          {node.children.map((child) => (
            <GoalNodeView
              key={child.value}
              node={child}
              selected={selected}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              onToggleSubtree={onToggleSubtree}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WhiteboardRecordFilters({
  recordTypeOptions,
  selectedRecordTypes,
  onRecordTypesChange,
  goalTree,
  selectedGoalPaths,
  onGoalPathsChange,
  time,
  onTimeChange,
  dateError = null,
}: WhiteboardRecordFiltersProps) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(() => new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const selectedTypes = useMemo(() => new Set(selectedRecordTypes), [selectedRecordTypes]);
  const selectedGoals = useMemo(() => new Set(selectedGoalPaths), [selectedGoalPaths]);

  const toggleRecordType = (recordType: string, checked: boolean) => {
    if (checked) onRecordTypesChange(Array.from(new Set([...selectedRecordTypes, recordType])));
    else onRecordTypesChange(selectedRecordTypes.filter((value) => value !== recordType));
  };

  const toggleGoalSubtree = (node: WhiteboardGoalTreeNode, checked: boolean) => {
    const next = new Set(selectedGoalPaths);
    for (const goalPath of node.selectableGoalPaths) {
      if (checked) next.add(goalPath);
      else next.delete(goalPath);
    }
    onGoalPathsChange(Array.from(next));
  };

  const toggleGoalExpanded = (goalPath: string) => {
    setExpandedGoals((current) => {
      const next = new Set(current);
      if (next.has(goalPath)) next.delete(goalPath);
      else next.add(goalPath);
      return next;
    });
  };

  const enableTime = (enabled: boolean) => {
    if (!enabled) {
      onTimeChange(null);
      return;
    }
    onTimeChange(time ?? { role: 'default', startDate: '', endDate: '' });
  };

  const updateTime = (patch: Partial<WhiteboardRecordSourceTimeState>) => {
    const current = time ?? { role: 'default' as const, startDate: '', endDate: '' };
    onTimeChange({ ...current, ...patch });
  };

  const hasActiveFilters = selectedRecordTypes.length > 0 || selectedGoalPaths.length > 0 || Boolean(time);

  return (
    <section class={`think-whiteboard-source-filters${filtersExpanded ? '' : ' is-collapsed'}`} aria-label="筛选范围">
      <div class="think-whiteboard-source-filters__heading">
        <button
          type="button"
          class="think-whiteboard-source-filters__toggle"
          aria-expanded={filtersExpanded}
          onClick={() => setFiltersExpanded((current) => !current)}
        >
          <span>筛选范围</span>
          <span aria-hidden="true">{filtersExpanded ? '⌃' : '⌄'}</span>
        </button>
        {hasActiveFilters && (
          <ThinkButton
            size="sm"
            variant="secondary"
            onClick={() => {
              onRecordTypesChange([]);
              onGoalPathsChange([]);
              onTimeChange(null);
            }}
          >清除筛选</ThinkButton>
        )}
      </div>

      {filtersExpanded && (
        <div class="think-whiteboard-source-filters__body">
          <div class="think-whiteboard-source-filter-group">
            <div class="think-whiteboard-source-filter-group__label">类型</div>
            <div class="think-whiteboard-source-filter-types" role="group" aria-label="Record Type 筛选">
              {recordTypeOptions.map((option) => (
                <span key={option.value} class="think-record-type-marker think-whiteboard-source-filter-type-marker" data-record-type={option.value}>
                  <ThinkCheckbox
                    compact
                    className="think-whiteboard-source-filter-type"
                    checked={selectedTypes.has(option.value)}
                    onChange={(event) => toggleRecordType(option.value, (event.currentTarget as HTMLInputElement).checked)}
                    label={option.label}
                  />
                </span>
              ))}
            </div>
          </div>

          <div class="think-whiteboard-source-filter-group">
            <div class="think-whiteboard-source-filter-group__label">目标</div>
            <div class="think-whiteboard-goal-tree" role="tree" aria-label="目标筛选">
              {goalTree.length > 0 ? goalTree.map((node) => (
                <GoalNodeView
                  key={node.value}
                  node={node}
                  selected={selectedGoals}
                  expanded={expandedGoals}
                  onToggleExpanded={toggleGoalExpanded}
                  onToggleSubtree={toggleGoalSubtree}
                />
              )) : <div class="think-whiteboard-goal-tree__empty">暂无目标</div>}
            </div>
          </div>

          <div class="think-whiteboard-source-filter-group">
            <div class="think-whiteboard-source-filter-group__label">时间</div>
            <ThinkCheckbox
              compact
              checked={Boolean(time)}
              onChange={(event) => enableTime((event.currentTarget as HTMLInputElement).checked)}
              label="限定时间范围"
            />
            {time && (
              <div class="think-whiteboard-source-filter-time">
                <ThinkSelect
                  value={time.role}
                  aria-label="时间依据"
                  onChange={(event: Event) => updateTime({ role: (event.currentTarget as HTMLSelectElement).value as WhiteboardRecordSourceTimeState['role'] })}
                >
                  {WHITEBOARD_SOURCE_DATE_ROLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </ThinkSelect>
                <div class="think-whiteboard-source-filter-time__dates">
                  <ThinkInput
                    type="date"
                    value={time.startDate}
                    aria-label="开始日期"
                    invalid={Boolean(dateError)}
                    onInput={(event: Event) => updateTime({ startDate: (event.currentTarget as HTMLInputElement).value })}
                  />
                  <span aria-hidden="true">—</span>
                  <ThinkInput
                    type="date"
                    value={time.endDate}
                    aria-label="结束日期"
                    invalid={Boolean(dateError)}
                    onInput={(event: Event) => updateTime({ endDate: (event.currentTarget as HTMLInputElement).value })}
                  />
                </div>
                {dateError && <div class="think-whiteboard-source-filter-error" role="status">{dateError}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
