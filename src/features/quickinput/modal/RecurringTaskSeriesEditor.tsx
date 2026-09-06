/** @jsxImportSource preact */
import { h } from 'preact';

import type { RecurrenceInfo, TaskSeriesEditScope } from '@core/records/public';
import { ThinkButton, ThinkInput, ThinkSegmentedControl, ThinkSelect } from '@shared/ui/public';

export interface RecurringTaskSeriesEditorProps {
  scope: TaskSeriesEditScope;
  recurrence: RecurrenceInfo;
  onScopeChange: (scope: TaskSeriesEditScope) => void;
  onRecurrenceChange: (recurrence: RecurrenceInfo) => void;
  onSkipCurrent: () => void;
  onStopSeries: () => void;
  skipping?: boolean;
  stopping?: boolean;
}

const UNIT_OPTIONS = [
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' },
];

const SCOPE_HELP: Record<TaskSeriesEditScope, string> = {
  current: '只保存当前这一次任务。周期规则和以后任务保持不变。',
  current_and_future: '保存当前任务，并把内容/预计时长等默认值和周期规则用于以后任务。历史任务不回写。',
  series_rules: '只修改重复规则；当前任务、历史任务以及系列默认内容/优先级等都不改。',
};

function fixedModeAnchor(anchor: RecurrenceInfo['anchor']): RecurrenceInfo['anchor'] {
  return anchor === 'completion' ? 'scheduled' : anchor;
}

export function RecurringTaskSeriesEditor({
  scope,
  recurrence,
  onScopeChange,
  onRecurrenceChange,
  onSkipCurrent,
  onStopSeries,
  skipping = false,
  stopping = false,
}: RecurringTaskSeriesEditorProps) {
  const editable = scope !== 'current';
  const mode = recurrence.anchor === 'completion' ? 'after_completion' : 'fixed';
  const compatibilityAnchor = recurrence.anchor === 'start'
    ? '当前系列沿用旧规则：按开始时间推进。你不切换重复方式就会原样保留。'
    : recurrence.anchor === 'due'
      ? '当前系列沿用旧规则：按截止时间推进。你不切换重复方式就会原样保留。'
      : '';

  return (
    <section className="think-quick-input-series-editor" aria-label="周期任务设置">
      <div className="think-quick-input-series-editor__header">
        <div>
          <div className="think-quick-input-series-editor__title">🔁 周期设置</div>
          <div className="think-quick-input-series-editor__subtitle">先选这次修改影响到哪里，再保存。</div>
        </div>
      </div>

      <div className="think-quick-input-series-editor__scope">
        <span className="think-quick-input-series-editor__label">作用范围</span>
        <ThinkSegmentedControl
          label="周期任务编辑作用范围"
          value={scope}
          options={[
            { value: 'current', label: '仅本次' },
            { value: 'current_and_future', label: '本次及以后' },
            { value: 'series_rules', label: '系列规则' },
          ]}
          onChange={(value) => onScopeChange(value as TaskSeriesEditScope)}
        />
      </div>
      <div className="think-quick-input-series-editor__help">{SCOPE_HELP[scope]}</div>

      <div className={`think-quick-input-series-editor__rules${editable ? '' : ' is-disabled'}`}>
        <div className="think-quick-input-series-editor__row">
          <span className="think-quick-input-series-editor__label">重复方式</span>
          <ThinkSegmentedControl
            label="重复方式"
            value={mode}
            options={[
              { value: 'fixed', label: '固定计划' },
              { value: 'after_completion', label: '完成后重复' },
            ]}
            onChange={(value) => {
              if (!editable) return;
              onRecurrenceChange({
                ...recurrence,
                anchor: value === 'after_completion' ? 'completion' : fixedModeAnchor(recurrence.anchor),
              });
            }}
          />
        </div>

        <div className="think-quick-input-series-editor__row">
          <span className="think-quick-input-series-editor__label">每隔</span>
          <div className="think-quick-input-series-editor__interval">
            <ThinkInput
              type="number"
              min={1}
              step={1}
              value={String(recurrence.interval)}
              disabled={!editable}
              onInput={(event: Event) => {
                const next = Math.max(1, Math.round(Number((event.currentTarget as HTMLInputElement).value) || 1));
                onRecurrenceChange({ ...recurrence, interval: next });
              }}
            />
            <ThinkSelect
              value={recurrence.unit}
              disabled={!editable}
              onChange={(event: Event) => onRecurrenceChange({
                ...recurrence,
                unit: (event.currentTarget as HTMLSelectElement).value as RecurrenceInfo['unit'],
              })}
            >
              {UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </ThinkSelect>
          </div>
        </div>

        {compatibilityAnchor ? <div className="think-quick-input-series-editor__compat">{compatibilityAnchor}</div> : null}
      </div>

      <div className="think-quick-input-series-editor__danger">
        <div className="think-quick-input-series-editor__help">周期任务不要直接删除当前实例：跳过会生成下一次；停止重复会保留当前任务但不再生成后续。</div>
        <div className="think-quick-input-series-editor__lifecycle-actions">
          <ThinkButton type="button" size="sm" variant="secondary" disabled={skipping || stopping} onClick={onSkipCurrent}>
            {skipping ? '跳过中…' : '⏭️ 跳过本次'}
          </ThinkButton>
          <ThinkButton type="button" size="sm" variant="danger" disabled={stopping || skipping} onClick={onStopSeries}>
            {stopping ? '停止中…' : '停止重复'}
          </ThinkButton>
        </div>
      </div>
    </section>
  );
}
