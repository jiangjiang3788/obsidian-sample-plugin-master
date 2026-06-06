/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Alert, Box, Button, Chip, Divider, SimpleSelect, TextField, Typography } from '@shared/public';
import { selectSettings, useDataStore, useSelector, useUseCases } from '@/app/public';
import { buildGoalMarkdownBackfillDiffPreview, getEffectiveCoreBlocks, inferGoalCandidatesFromItems } from '@core/public';
import type { CycleGranularity, GoalMetricContract, GoalMetricDirection } from '@core/public';

const cycleGranularityOptions = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
  { value: 'custom', label: '自定义' },
];

const metricDirectionOptions = [
  { value: 'increase', label: '增加到目标值' },
  { value: 'decrease', label: '降低到目标值' },
  { value: 'maintain', label: '维持目标值' },
  { value: 'boolean', label: '是否达成' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number): string {
  const date = new Date(base || today());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function Card({ children }: { children: any }) {
  return (
    <Box sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 2, p: 1.5, display: 'grid', gap: 1 }}>
      {children}
    </Box>
  );
}

function pathLeaf(path: string): string {
  return String(path || '').split('/').filter(Boolean).pop() || path;
}

function metricPresetKey(label: string): string {
  const text = label.toLowerCase();
  if (/完成|done|complete/.test(text)) return 'task.done';
  if (/任务|task/.test(text)) return 'task.total';
  if (/打卡|habit|check/.test(text)) return 'habit.count';
  if (/事件|证据|event|evidence/.test(text)) return 'evidence.count';
  if (/阻碍|风险|blocker|risk/.test(text)) return 'blocker.count';
  if (/里程碑|milestone/.test(text)) return 'milestone.count';
  if (/总结|复盘|review/.test(text)) return 'review.count';
  if (/计划|plan/.test(text)) return 'plan.count';
  return label.trim() || 'goal.metric';
}

export function GoalManager() {
  const settings = useSelector(selectSettings);
  const dataStore = useDataStore();
  const useCases = useUseCases();
  const [goalPath, setGoalPath] = useState('');
  const [themePath, setThemePath] = useState('');
  const [message, setMessage] = useState('');

  const goals = settings.goalSettings?.goals || [];
  const cycles = settings.goalSettings?.cycles || [];
  const bindings = settings.goalSettings?.goalBlockBindings || [];
  const coreBlocks = useMemo(() => getEffectiveCoreBlocks(settings), [settings]);
  const goalOptions = goals.map((goal) => ({ value: goal.id, label: goal.goalPath || goal.title || goal.id }));
  const activeGoalOptions = goals.filter((goal) => goal.status !== 'archived').map((goal) => ({ value: goal.id, label: goal.goalPath || goal.title || goal.id }));
  const blockOptions = coreBlocks.map((block) => ({ value: block.id, label: block.name }));

  const candidates = useMemo(
    () => inferGoalCandidatesFromItems(dataStore.queryItems(), goals).filter((item) => item.source !== 'existing-goal'),
    [dataStore, goals]
  );
  const topCandidates = candidates.slice(0, 8);
  const markdownBackfillDiff = useMemo(
    () => buildGoalMarkdownBackfillDiffPreview(dataStore.queryItems(), goals, 12),
    [dataStore, goals]
  );

  const [cycleGoalId, setCycleGoalId] = useState(activeGoalOptions[0]?.value || '');
  const [cycleTitle, setCycleTitle] = useState('本周推进');
  const [cycleGranularity, setCycleGranularity] = useState<CycleGranularity>('week');
  const [cycleStartDate, setCycleStartDate] = useState(today());
  const [cycleEndDate, setCycleEndDate] = useState(addDays(today(), 6));

  const [bindingGoalId, setBindingGoalId] = useState(activeGoalOptions[0]?.value || '');
  const [bindingBlockId, setBindingBlockId] = useState(blockOptions[0]?.value || 'core.task');
  const currentBinding = bindings.find((binding) => binding.goalId === bindingGoalId && binding.coreBlockId === bindingBlockId) || null;
  const selectedBindingBlock = coreBlocks.find((block) => block.id === bindingBlockId) || null;
  const selectedBindingFields = selectedBindingBlock?.fields || [];
  const [bindingEnabled, setBindingEnabled] = useState(true);
  const [bindingTargetFile, setBindingTargetFile] = useState('');
  const [bindingHeader, setBindingHeader] = useState('## {{goalPath}}');
  const [bindingTemplate, setBindingTemplate] = useState('');
  const [bindingRequiredFields, setBindingRequiredFields] = useState<string[]>([]);
  const [bindingDefaultValuesText, setBindingDefaultValuesText] = useState('');

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

  const syncBindingDraft = (goalId: string, blockId: string) => {
    const found = bindings.find((binding) => binding.goalId === goalId && binding.coreBlockId === blockId) || null;
    setBindingEnabled(found?.enabled !== false);
    setBindingTargetFile(found?.targetFile || '');
    setBindingHeader(found?.appendUnderHeader || '## {{goalPath}}');
    setBindingTemplate(found?.outputTemplate || '');
    setBindingRequiredFields(found?.requiredFields || []);
    setBindingDefaultValuesText(found?.defaultValues ? JSON.stringify(found.defaultValues, null, 2) : '');
  };

  const handleAddGoal = async () => {
    const path = goalPath.trim();
    if (!path) return;
    const goal = await useCases.goal.addGoal({ title: pathLeaf(path), goalPath: path, themePath: themePath.trim() || null });
    setMessage(goal ? `已添加目标：${goal.goalPath || goal.title}` : '目标未添加');
    if (goal) {
      setGoalPath('');
      setThemePath('');
      if (!cycleGoalId) setCycleGoalId(goal.id);
      if (!bindingGoalId) setBindingGoalId(goal.id);
      if (!metricGoalId) syncMetricDraft(goal.id);
    }
  };

  const handleMigrate = async () => {
    const result = await useCases.goal.applyLegacyGoalMigration(candidates);
    setMessage(`迁移完成：新增 ${result.createdGoals} 个目标，建立 ${result.relationCount} 条记录关系。`);
  };

  const handleApplyBackfill = async () => {
    if (markdownBackfillDiff.total <= 0) return;
    const ok = typeof window === 'undefined' ? true : window.confirm(`确认写回 ${markdownBackfillDiff.total} 条记录的目标字段？建议先备份笔记。`);
    if (!ok) return;
    const result = await useCases.goal.applyMarkdownGoalBackfill(500);
    setMessage(`回填完成：更新 ${result.updated} 条，失败 ${result.failed} 条，涉及 ${result.paths.length} 个文件。`);
  };

  const handleAddCycle = async () => {
    if (!cycleGoalId || !cycleTitle.trim()) return;
    const cycle = await useCases.goal.addCycle({
      goalId: cycleGoalId,
      title: cycleTitle,
      granularity: cycleGranularity,
      startDate: cycleStartDate,
      endDate: cycleEndDate,
      status: 'active',
    });
    setMessage(cycle ? `已添加周期：${cycle.title}` : '周期未添加');
  };

  const parseBindingDefaultValues = (): Record<string, unknown> => {
    const text = bindingDefaultValuesText.trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      setMessage('字段默认值 JSON 格式不正确，已跳过保存默认值。');
      return {};
    }
  };

  const toggleRequiredField = (key: string) => {
    setBindingRequiredFields((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const handleSaveBinding = async () => {
    if (!bindingGoalId || !bindingBlockId) return;
    await useCases.goal.upsertGoalBlockBindingDraft({
      goalId: bindingGoalId,
      coreBlockId: bindingBlockId,
      enabled: bindingEnabled,
      targetFile: bindingTargetFile,
      appendUnderHeader: bindingHeader,
      outputTemplate: bindingTemplate,
      defaultValues: parseBindingDefaultValues(),
      requiredFields: bindingRequiredFields,
    });
    setMessage('目标专属模板绑定已保存。');
  };

  const handleSaveMetric = async () => {
    if (!metricGoalId) return;
    const key = (metricKey.trim() || metricPresetKey(metricLabel));
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
    <Box sx={{ maxWidth: 1040, mx: 'auto', display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h6">目标中心</Typography>
        <Typography variant="body2" color="text.secondary">
          目标是快捷输入的主上下文；主题降级为表单里的层级单选字段；目标绑定可以覆盖核心 Block 的输出路径、标题位置和模板。
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Chip label={`已定义目标 ${goals.length}`} size="small" />
        <Chip label={`周期 ${cycles.length}`} size="small" />
        <Chip label={`目标模板绑定 ${bindings.length}`} size="small" />
        <Chip label={`旧记录候选 ${candidates.length}`} size="small" color={candidates.length > 0 ? 'primary' : 'default'} />
        <Chip label={`可回填 ${markdownBackfillDiff.total}`} size="small" color={markdownBackfillDiff.total > 0 ? 'primary' : 'default'} />
      </Box>

      {message && <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>}

      <Card>
        <Typography sx={{ fontWeight: 700 }}>1. 目标实体</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(160px, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <TextField size="small" label="目标路径" value={goalPath} onChange={(event: any) => setGoalPath(event.target.value)} placeholder="例如：产品化/插件/目标中心" />
          <TextField size="small" label="默认主题路径" value={themePath} onChange={(event: any) => setThemePath(event.target.value)} placeholder="例如：电脑/记录系统" />
          <Button variant="contained" onClick={handleAddGoal} disabled={!goalPath.trim()}>添加目标</Button>
        </Box>
        {goals.length > 0 && (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {goals.slice(0, 12).map((goal) => (
              <Box key={goal.id} sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1, alignItems: 'center', borderTop: '1px solid var(--background-modifier-border-hover)', pt: 0.75 }}>
                <span>{goal.goalPath || goal.title}</span>
                <span style={{ color: 'var(--text-muted)' }}>{goal.themePath || '未绑定主题'} · {goal.status}</span>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button size="small" variant="text" onClick={() => goal.status === 'paused' ? useCases.goal.restoreGoal(goal.id) : useCases.goal.pauseGoal(goal.id)}>{goal.status === 'paused' ? '恢复' : '暂停'}</Button>
                  <Button size="small" variant="text" onClick={() => useCases.goal.completeGoal(goal.id)}>完成</Button>
                  <Button size="small" variant="text" onClick={() => goal.status === 'archived' ? useCases.goal.restoreGoal(goal.id) : useCases.goal.archiveGoal(goal.id)}>
                    {goal.status === 'archived' ? '恢复' : '归档'}
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card>
        <Typography sx={{ fontWeight: 700 }}>2. 旧目标字段迁移预览</Typography>
        <Typography variant="body2" color="text.secondary">从已有记录的 `目标::` / `goalPaths` 推断目标实体，不会自动改写 Markdown。</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {topCandidates.length > 0 ? topCandidates.map((candidate) => <Chip key={candidate.goalPath} size="small" label={`${candidate.goalPath} · ${candidate.count}条`} />) : <Typography variant="body2" color="text.secondary">没有发现需要迁移的旧目标字段。</Typography>}
          </Box>
          <Button variant="outlined" onClick={handleMigrate} disabled={candidates.length === 0}>生成目标实体</Button>
        </Box>
      </Card>

      <Card>
        <Typography sx={{ fontWeight: 700 }}>3. Markdown 目标字段回填 Diff</Typography>
        <Typography variant="body2" color="text.secondary">先预览 before/after，再手动确认写回。写回只补 `目标ID`、`目标`、`核心Block` 和必要主题。</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip size="small" label={`缺目标ID ${markdownBackfillDiff.missingGoalIdCount}`} />
          <Chip size="small" label={`缺核心Block ${markdownBackfillDiff.missingCoreBlockCount}`} />
          <Chip size="small" label={`预览 ${markdownBackfillDiff.items.length}/${markdownBackfillDiff.total}`} />
        </Box>
        {markdownBackfillDiff.items.length > 0 ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {markdownBackfillDiff.items.map((item) => (
              <Box key={`${item.itemId}-${item.goalId}`} sx={{ display: 'grid', gap: 0.35, borderTop: '1px solid var(--background-modifier-border-hover)', pt: 0.75 }}>
                <Typography variant="caption" color="text.secondary">{item.itemId} · 缺少：{item.missingFields.join('、')}</Typography>
                <code style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text-muted)' }}>- {item.beforeSnippet}</code>
                <code style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>+ {item.afterSnippet}</code>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={handleApplyBackfill}>确认写回预览项</Button>
            </Box>
          </Box>
        ) : <Typography variant="body2" color="text.secondary">暂未发现需要回填的目标字段。</Typography>}
      </Card>

      <Card>
        <Typography sx={{ fontWeight: 700 }}>4. 目标周期</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(120px, 1fr) 110px 130px 130px auto', gap: 1, alignItems: 'center' }}>
          <SimpleSelect value={cycleGoalId} options={activeGoalOptions} onChange={setCycleGoalId} placeholder="选择目标" fullWidth />
          <TextField size="small" label="周期标题" value={cycleTitle} onChange={(event: any) => setCycleTitle(event.target.value)} />
          <SimpleSelect value={cycleGranularity} options={cycleGranularityOptions} onChange={(value) => setCycleGranularity(value as CycleGranularity)} fullWidth />
          <input className="think-native-input" type="date" value={cycleStartDate} onInput={(event: any) => setCycleStartDate(event.target.value)} />
          <input className="think-native-input" type="date" value={cycleEndDate} onInput={(event: any) => setCycleEndDate(event.target.value)} />
          <Button variant="contained" onClick={handleAddCycle} disabled={!cycleGoalId || !cycleTitle.trim()}>添加周期</Button>
        </Box>
        {cycles.length > 0 && (
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            {cycles.slice(0, 12).map((cycle) => (
              <Box key={cycle.id} sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1, alignItems: 'center', color: 'text.secondary' }}>
                <span>{cycle.title} · {goalOptions.find((goal) => goal.value === cycle.goalId)?.label || cycle.goalId}</span>
                <span>{cycle.startDate} → {cycle.endDate} · {cycle.status}</span>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button size="small" variant="text" onClick={() => useCases.goal.reopenCycle(cycle.id)}>激活</Button>
                  <Button size="small" variant="text" onClick={() => useCases.goal.markCycleReviewing(cycle.id)}>复盘</Button>
                  <Button size="small" variant="text" onClick={() => useCases.goal.closeCycle(cycle.id)}>关闭</Button>
                  <Button size="small" variant="text" onClick={() => useCases.goal.deleteCycle(cycle.id)}>删除</Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card>
        <Typography sx={{ fontWeight: 700 }}>5. 目标指标（表单化）</Typography>
        <Typography variant="body2" color="text.secondary">不再必须写 JSON。key/label 会自动映射任务、完成任务、打卡、事件、阻碍等统计。</Typography>
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
      </Card>

      <Card>
        <Typography sx={{ fontWeight: 700 }}>6. 目标专属核心 Block 绑定</Typography>
        <Typography variant="body2" color="text.secondary">用于让某个目标下的任务/计划/总结等写到不同文件、标题或使用不同模板。空字段表示继承核心 Block / 主题模板。</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(140px, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <SimpleSelect value={bindingGoalId} options={activeGoalOptions} onChange={(value) => { setBindingGoalId(value); syncBindingDraft(value, bindingBlockId); }} placeholder="选择目标" fullWidth />
          <SimpleSelect value={bindingBlockId} options={blockOptions} onChange={(value) => { setBindingBlockId(value); syncBindingDraft(bindingGoalId, value); }} placeholder="选择核心 Block" fullWidth />
          <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <input type="checkbox" checked={bindingEnabled} onChange={(event: any) => setBindingEnabled(!!event.target.checked)} />启用
          </label>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(160px, 1fr)', gap: 1 }}>
          <TextField size="small" label="目标文件覆盖" value={bindingTargetFile} onChange={(event: any) => setBindingTargetFile(event.target.value)} placeholder="例如：01/项目目标.md" />
          <TextField size="small" label="标题位置覆盖" value={bindingHeader} onChange={(event: any) => setBindingHeader(event.target.value)} placeholder="例如：## {{goalPath}}" />
        </Box>
        <textarea
          className="think-native-input think-native-input--textarea"
          rows={5}
          value={bindingTemplate}
          onInput={(event: any) => setBindingTemplate(event.target.value)}
          placeholder="可选：目标专属 outputTemplate。留空则继承主题/核心Block模板。"
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(220px, 1fr)', gap: 1 }}>
          <Box sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 1, p: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>必填字段覆盖</Typography>
            <Typography variant="caption" color="text.secondary">勾选后，目标专属模板会把这些字段标记为 required。</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
              {selectedBindingFields.length > 0 ? selectedBindingFields.map((field: any) => {
                const key = field.key || field.label;
                return (
                  <label key={key} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', border: '1px solid var(--background-modifier-border)', borderRadius: '999px', padding: '4px 8px' }}>
                    <input type="checkbox" checked={bindingRequiredFields.includes(key)} onChange={() => toggleRequiredField(key)} />
                    {field.label || field.key}
                  </label>
                );
              }) : <Typography variant="caption" color="text.secondary">当前核心 Block 没有字段。</Typography>}
            </Box>
          </Box>
          <Box sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 1, p: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>字段默认值 JSON</Typography>
            <textarea
              className="think-native-input think-native-input--textarea"
              rows={5}
              value={bindingDefaultValuesText}
              onInput={(event: any) => setBindingDefaultValuesText(event.target.value)}
              placeholder={'例如：{\n  "优先级": "高",\n  "周期": "本周"\n}'}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant="text" disabled={!currentBinding} onClick={async () => { await useCases.goal.deleteGoalBlockBinding(bindingGoalId, bindingBlockId); setMessage('目标专属模板绑定已删除。'); syncBindingDraft(bindingGoalId, bindingBlockId); }}>删除绑定</Button>
          <Button variant="contained" disabled={!bindingGoalId || !bindingBlockId} onClick={handleSaveBinding}>保存绑定</Button>
        </Box>
      </Card>

      <Divider />
    </Box>
  );
}
