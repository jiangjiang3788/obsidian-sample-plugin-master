/** @jsxImportSource preact */
import { h } from 'preact';

import type { RecurrenceInfo } from '@core/records/public';
import { ThinkButton, ThinkInput, ThinkSegmentedControl, ThinkSelect } from '@shared/ui/public';

export interface RecurringTaskSeriesEditorProps {
  recurrence: RecurrenceInfo;
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

function fixedModeAnchor(anchor: RecurrenceInfo['anchor']): RecurrenceInfo['anchor'] {
  return anchor === 'completion' ? 'scheduled' : anchor;
}

export function RecurringTaskSeriesEditor({
  recurrence,
  onRecurrenceChange,
  onSkipCurrent,
  onStopSeries,
  skipping = false,
  stopping = false,
}: RecurringTaskSeriesEditorProps) {
  const mode = recurrence.anchor === 'completion' ? 'after_completion' : 'fixed';
  const compatibilityAnchor = recurrence.anchor === 'start'
    ? '当前重复规则沿用旧设置：按开始时间推进。你不切换重复方式就会原样保留。'
    : recurrence.anchor === 'due'
      ? '当前重复规则沿用旧设置：按截止时间推进。你不切换重复方式就会原样保留。'
      : '';

  return (
    <section className="think-quick-input-series-editor" aria-label="任务重复设置">
      <div className="think-quick-input-series-editor__header">
        <div>
          <div className="think-quick-input-series-editor__title">🔁 重复设置</div>
          <div className="think-quick-input-series-editor__subtitle">这里仍然是同一个任务。保存后，当前修改会作为以后自动生成任务的新默认值；历史任务不回写。</div>
        </div>
      </div>

      <div className="think-quick-input-series-editor__rules">
        <div className="think-quick-input-series-editor__row">
          <span className="think-quick-input-series-editor__label">重复方式</span>
          <ThinkSegmentedControl
            label="重复方式"
            value={mode}
            options={[
              { value: 'fixed', label: '固定计划' },
              { value: 'after_completion', label: '完成后重复' },
            ]}
            onChange={(value) => onRecurrenceChange({
              ...recurrence,
              anchor: value === 'after_completion' ? 'completion' : fixedModeAnchor(recurrence.anchor),
            })}
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
              onInput={(event: Event) => {
                const next = Math.max(1, Math.round(Number((event.currentTarget as HTMLInputElement).value) || 1));
                onRecurrenceChange({ ...recurrence, interval: next });
              }}
            />
            <ThinkSelect
              value={recurrence.unit}
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
        <div className="think-quick-input-series-editor__help">跳过只影响本次并生成下一次；停止重复会保留当前任务，但以后不再自动生成。</div>
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
