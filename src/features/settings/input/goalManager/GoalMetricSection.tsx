/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { SimpleSelect, ThinkButton, ThinkInput, ThinkNotice } from '@shared/ui/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import type { GoalMetricContract, GoalMetricDirection } from '@core/goal/public';
import { metricDirectionOptions, metricPresetKey } from './shared';

export function GoalMetricSection() {
  const settings = useSelector(selectSettings); const useCases = useUseCases(); const goals = settings.goalSettings?.goals || [];
  const activeGoalOptions = goals.filter((goal) => goal.status !== 'archived').map((goal) => ({ value: goal.id, label: goal.goalPath || goal.title || goal.id }));
  const [message, setMessage] = useState(''); const [metricGoalId, setMetricGoalId] = useState(activeGoalOptions[0]?.value || '');
  const selectedMetricGoal = goals.find((goal) => goal.id === metricGoalId) || null; const selectedMetrics = selectedMetricGoal?.metrics || [];
  const [metricKey, setMetricKey] = useState('task.done'); const [metricLabel, setMetricLabel] = useState('完成任务'); const [metricDirection, setMetricDirection] = useState<GoalMetricDirection>('increase'); const [metricTargetValue, setMetricTargetValue] = useState('10'); const [metricUnit, setMetricUnit] = useState('个');
  const syncMetricDraft = (goalId: string) => { const goal = goals.find((item) => item.id === goalId) || null; const first = goal?.metrics?.[0]; setMetricGoalId(goalId); if (first) { setMetricKey(first.key); setMetricLabel(first.label); setMetricDirection(first.direction); setMetricTargetValue(first.targetValue === undefined ? '' : String(first.targetValue)); setMetricUnit(first.unit || ''); } };
  const loadMetricDraft = (metric: GoalMetricContract) => { setMetricKey(metric.key); setMetricLabel(metric.label); setMetricDirection(metric.direction); setMetricTargetValue(metric.targetValue === undefined ? '' : String(metric.targetValue)); setMetricUnit(metric.unit || ''); };
  const handleSaveMetric = async () => { if (!metricGoalId) return; const key = metricKey.trim() || metricPresetKey(metricLabel); const label = metricLabel.trim() || key; const metric: GoalMetricContract = { key, label, direction: metricDirection, targetValue: metricTargetValue.trim() === '' ? undefined : Number(metricTargetValue), unit: metricUnit.trim() || undefined }; await useCases.goal.updateGoalMetrics(metricGoalId, [...selectedMetrics.filter((item) => item.key !== key), metric]); setMessage(`已保存：${label}`); };
  const handleRemoveMetric = async (key: string) => { if (!metricGoalId) return; await useCases.goal.updateGoalMetrics(metricGoalId, selectedMetrics.filter((metric) => metric.key !== key)); setMessage('已删除指标'); };
  return (
    <section className="think-settings-section think-goal-metrics">
      {message && <ThinkNotice>{message}</ThinkNotice>}
      <div className="think-settings-stack think-settings-stack--tight">
        <div className="think-settings-row"><span className="think-settings-row__label">目标</span><SimpleSelect value={metricGoalId} options={activeGoalOptions} onChange={syncMetricDraft} placeholder="选择目标" fullWidth /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">指标名称</span><ThinkInput value={metricLabel} onInput={(event) => { const value=(event.currentTarget as HTMLInputElement).value; setMetricLabel(value); if (!metricKey.trim()) setMetricKey(metricPresetKey(value)); }} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">指标 Key</span><ThinkInput value={metricKey} onInput={(event) => setMetricKey((event.currentTarget as HTMLInputElement).value)} placeholder="task.done" /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">方向</span><SimpleSelect value={metricDirection} options={metricDirectionOptions} onChange={(value) => setMetricDirection(value as GoalMetricDirection)} fullWidth /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">目标值</span><ThinkInput className="think-settings-field--sm" type="number" value={metricTargetValue} onInput={(event) => setMetricTargetValue((event.currentTarget as HTMLInputElement).value)} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">单位</span><ThinkInput className="think-settings-field--sm" value={metricUnit} onInput={(event) => setMetricUnit((event.currentTarget as HTMLInputElement).value)} /></div>
      </div>
      <div className="think-settings-actions think-settings-actions--start"><ThinkButton variant="primary" size="sm" onClick={handleSaveMetric} disabled={!metricGoalId || !metricLabel.trim()}>保存指标</ThinkButton></div>
      <div className="think-goal-metrics__items">
        {selectedMetrics.length > 0 ? selectedMetrics.map((metric) => <button key={metric.key} type="button" className="think-chip" onClick={() => loadMetricDraft(metric)} title="点击编辑；双击删除" onDblClick={() => handleRemoveMetric(metric.key)}><span className="think-chip__label">{metric.label} · {metric.targetValue ?? '—'}{metric.unit || ''}</span><span className="think-chip__remove" aria-hidden="true">×</span></button>) : <span className="think-settings-caption">当前目标没有指标</span>}
      </div>
    </section>
  );
}
