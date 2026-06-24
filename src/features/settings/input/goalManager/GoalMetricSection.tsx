/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Alert, Box, Button, Chip, SimpleSelect, TextField, Typography } from '@shared/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import type { GoalMetricContract, GoalMetricDirection } from '@core/public';
import { metricDirectionOptions, metricPresetKey, SectionCard } from './shared';

export function GoalMetricSection() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const goals = settings.goalSettings?.goals || [];
  const activeGoalOptions = goals
    .filter((goal) => goal.status !== 'archived')
    .map((goal) => ({ value: goal.id, label: goal.goalPath || goal.title || goal.id }));

  const [message, setMessage] = useState('');
  const [metricGoalId, setMetricGoalId] = useState(activeGoalOptions[0]?.value || '');
  const selectedMetricGoal = goals.find((goal) => goal.id === metricGoalId) || null;
  const selectedMetrics = selectedMetricGoal?.metrics || [];
  const [metricKey, setMetricKey] = useState('task.done');
  const [metricLabel, setMetricLabel] = useState('完成任务');
  const [metricDirection, setMetricDirection] = useState<GoalMetricDirection>('increase');
  const [metricTargetValue, setMetricTargetValue] = useState('10');
  const [metricUnit, setMetricUnit] = useState('个');

  const syncMetricDraft = (goalId: string) => {
    const goal = goals.find((item) => item.id === goalId) || null;
    const first = goal?.metrics?.[0];
    setMetricGoalId(goalId);
    if (first) {
      setMetricKey(first.key);
      setMetricLabel(first.label);
      setMetricDirection(first.direction);
      setMetricTargetValue(first.targetValue === undefined ? '' : String(first.targetValue));
      setMetricUnit(first.unit || '');
    }
  };

  const loadMetricDraft = (metric: GoalMetricContract) => {
    setMetricKey(metric.key);
    setMetricLabel(metric.label);
    setMetricDirection(metric.direction);
    setMetricTargetValue(metric.targetValue === undefined ? '' : String(metric.targetValue));
    setMetricUnit(metric.unit || '');
  };

  const handleSaveMetric = async () => {
    if (!metricGoalId) return;
    const key = metricKey.trim() || metricPresetKey(metricLabel);
    const label = metricLabel.trim() || key;
    const metric: GoalMetricContract = {
      key,
      label,
      direction: metricDirection,
      targetValue: metricTargetValue.trim() === '' ? undefined : Number(metricTargetValue),
      unit: metricUnit.trim() || undefined,
    };
    const nextMetrics = [...selectedMetrics.filter((item) => item.key !== key), metric];
    await useCases.goal.updateGoalMetrics(metricGoalId, nextMetrics);
    setMessage(`目标指标已保存：${label}`);
  };

  const handleRemoveMetric = async (key: string) => {
    if (!metricGoalId) return;
    await useCases.goal.updateGoalMetrics(metricGoalId, selectedMetrics.filter((metric) => metric.key !== key));
    setMessage('目标指标已删除。');
  };

  return (
    <SectionCard>
      <Typography sx={{ fontWeight: 700 }}>目标指标</Typography>
      <Typography variant="body2" color="text.secondary">指标只属于目标；视图根据记录里的 记录类型、状态和日期运行时统计。</Typography>
      {message && <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr)', gap: 1, alignItems: 'center' }}>
        <SimpleSelect value={metricGoalId} options={activeGoalOptions} onChange={(value) => syncMetricDraft(value)} placeholder="选择目标" fullWidth />
        <TextField size="small" label="指标名称" value={metricLabel} onChange={(event: any) => { setMetricLabel(event.target.value); if (!metricKey.trim()) setMetricKey(metricPresetKey(event.target.value)); }} />
        <TextField size="small" label="指标 Key" value={metricKey} onChange={(event: any) => setMetricKey(event.target.value)} placeholder="task.done" />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 120px 90px auto', gap: 1, alignItems: 'center' }}>
        <SimpleSelect value={metricDirection} options={metricDirectionOptions} onChange={(value) => setMetricDirection(value as GoalMetricDirection)} fullWidth />
        <TextField size="small" label="目标值" type="number" value={metricTargetValue} onChange={(event: any) => setMetricTargetValue(event.target.value)} />
        <TextField size="small" label="单位" value={metricUnit} onChange={(event: any) => setMetricUnit(event.target.value)} />
        <Button variant="contained" onClick={handleSaveMetric} disabled={!metricGoalId || !metricLabel.trim()}>保存/更新指标</Button>
      </Box>
      {selectedMetricGoal && <Typography variant="caption" color="text.secondary">当前目标：{selectedMetricGoal.goalPath || selectedMetricGoal.title}</Typography>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {selectedMetrics.length > 0 ? selectedMetrics.map((metric) => (
          <Chip
            key={metric.key}
            size="small"
            label={`${metric.label} · ${metric.targetValue ?? '无目标值'}${metric.unit || ''}`}
            onClick={() => loadMetricDraft(metric)}
            onDelete={() => handleRemoveMetric(metric.key)}
          />
        )) : <Typography variant="body2" color="text.secondary">当前目标还没有指标。</Typography>}
      </Box>
    </SectionCard>
  );
}
