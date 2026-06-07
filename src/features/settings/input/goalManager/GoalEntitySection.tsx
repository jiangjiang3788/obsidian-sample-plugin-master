/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Alert, Box, Button, Chip, TextField, Typography } from '@shared/public';
import { selectSettings, useDataStore, useSelector, useUseCases } from '@/app/public';
import { inferGoalCandidatesFromItems } from '@core/public';
import { pathLeaf, SectionCard } from './shared';

function goalStatusLabel(status?: string): string {
  switch (status) {
    case 'paused': return '已暂停';
    case 'completed': return '已完成';
    case 'archived': return '已归档';
    case 'active':
    default: return '进行中';
  }
}

function topBlocks(coreBlockCounts: Record<string, number> = {}): string {
  return Object.entries(coreBlockCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([name, count]) => `${name.replace(/^core\./, '')} ${count}`)
    .join(' · ');
}

export function GoalEntitySection() {
  const settings = useSelector(selectSettings);
  const dataStore = useDataStore();
  const useCases = useUseCases();
  const goals = settings.goalSettings?.goals || [];
  const [goalPath, setGoalPath] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const candidates = useMemo(
    () => inferGoalCandidatesFromItems(dataStore.queryItems(), goals).filter((item) => item.source !== 'existing-goal'),
    [dataStore, goals]
  );

  const visibleGoals = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...goals].sort((left, right) => {
      const statusRank = (value?: string) => value === 'active' ? 0 : value === 'paused' ? 1 : value === 'completed' ? 2 : 3;
      const byStatus = statusRank(left.status) - statusRank(right.status);
      if (byStatus !== 0) return byStatus;
      return String(left.goalPath || left.title || '').localeCompare(String(right.goalPath || right.title || ''), 'zh-CN');
    });
    if (!q) return sorted;
    return sorted.filter((goal) => `${goal.title || ''} ${goal.goalPath || ''} ${goal.themePath || ''}`.toLowerCase().includes(q));
  }, [goals, query]);

  const handleAddGoal = async () => {
    const path = goalPath.trim();
    if (!path) return;
    const alreadyExists = goals.some((goal) => String(goal.goalPath || goal.title || '').trim() === path);
    const goal = await useCases.goal.addGoal({ title: pathLeaf(path), goalPath: path, themePath: null, granularity: 'day' as any });
    setMessage(alreadyExists ? `目标已存在：${path}` : goal ? `已添加目标：${goal.goalPath || goal.title}` : '目标未添加');
    if (goal && !alreadyExists) {
      setGoalPath('');
    }
  };

  const handleImportOne = async (candidate: any) => {
    const result = await useCases.goal.applyLegacyGoalMigration([candidate]);
    setMessage(result.createdGoals > 0 ? `已导入已有目标：${candidate.goalPath}` : `目标已在目标库中：${candidate.goalPath}`);
  };

  const handleImportAll = async () => {
    const result = await useCases.goal.applyLegacyGoalMigration(candidates);
    setMessage(`已从旧记录导入 ${result.createdGoals} 个目标。`);
  };

  const handleDeleteGoal = async (goal: any) => {
    const label = goal.goalPath || goal.title || goal.id;
    if (!window.confirm(`删除目标「${label}」？\n\n这会删除目标实体、目标记录关系和该目标下的记录预设；不会删除已有 Markdown 文件。`)) return;
    await useCases.goal.deleteGoal(goal.id);
    setMessage(`已删除目标：${label}`);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>}

      <SectionCard>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
            从已有记录导入目标{candidates.length > 0 ? ` · ${candidates.length} 个可导入` : ' · 无待导入'}
          </summary>
          <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                扫描旧记录里的“目标:: / 目标路径 / goalPaths”字段，把它们变成目标库里的目标；不会改写 Markdown 内容。
              </Typography>
              <Button variant="contained" onClick={handleImportAll} disabled={candidates.length === 0}>导入全部 {candidates.length}</Button>
            </Box>

            {candidates.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1 }}>
                {candidates.slice(0, 12).map((candidate) => (
                  <Box key={candidate.goalPath} sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 2, p: 1, display: 'grid', gap: 0.75, background: 'var(--background-secondary)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.goalPath}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {candidate.count} 条记录{candidate.lastDate ? ` · 最近 ${candidate.lastDate}` : ''}
                        </Typography>
                      </Box>
                      <Chip size="small" label={candidate.source === 'mixed' ? '部分存在' : '可导入'} color={candidate.source === 'mixed' ? 'warning' : 'primary'} />
                    </Box>
                    {topBlocks(candidate.coreBlockCounts) && <Typography variant="caption" color="text.secondary">记录类型：{topBlocks(candidate.coreBlockCounts)}</Typography>}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" variant="outlined" onClick={() => handleImportOne(candidate)}>导入这个目标</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="success">没有待导入的旧目标。目标库已经和现有记录保持一致。</Alert>
            )}
          </Box>
        </details>
      </SectionCard>

      <SectionCard>
        <Typography sx={{ fontWeight: 800 }}>新建目标</Typography>
        <Typography variant="body2" color="text.secondary">只需要填目标路径。目标只回答“我要追踪什么”；主题和统计周期都不在目标库绑定。周期请在对应的目标 × Block 预设表单里设置。</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <TextField size="small" label="目标路径" value={goalPath} onChange={(event: any) => setGoalPath(event.target.value)} placeholder="例如：产品化/插件/目标中心" />
          <Button variant="contained" onClick={handleAddGoal} disabled={!goalPath.trim()}>新建目标</Button>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>目标库</Typography>
            <Typography variant="body2" color="text.secondary">目标库只管理目标本身：新建、暂停、完成、归档、删除。统计周期属于记录表单，请到“目标 × Block 预设表”的单元格里设置。</Typography>
          </Box>
          <TextField size="small" label="搜索目标" value={query} onChange={(event: any) => setQuery(event.target.value)} sx={{ minWidth: 220 }} />
        </Box>

        {visibleGoals.length > 0 ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {visibleGoals.slice(0, 40).map((goal) => (
              <Box key={goal.id} sx={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: 1, alignItems: 'center', border: '1px solid var(--background-modifier-border)', borderRadius: 2, p: 1, background: goal.status === 'archived' ? 'var(--background-secondary)' : 'var(--background-primary)' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.goalPath || goal.title}</Typography>
                    <Chip size="small" label={goalStatusLabel(goal.status)} color={goal.status === 'active' ? 'primary' : 'default'} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button size="small" variant="text" onClick={() => goal.status === 'paused' ? useCases.goal.restoreGoal(goal.id) : useCases.goal.pauseGoal(goal.id)}>{goal.status === 'paused' ? '恢复' : '暂停'}</Button>
                  <Button size="small" variant="text" onClick={() => useCases.goal.completeGoal(goal.id)}>完成</Button>
                  <Button size="small" variant="text" onClick={() => goal.status === 'archived' ? useCases.goal.restoreGoal(goal.id) : useCases.goal.archiveGoal(goal.id)}>
                    {goal.status === 'archived' ? '恢复' : '归档'}
                  </Button>
                  <Button size="small" variant="text" onClick={() => handleDeleteGoal(goal)}>删除</Button>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info">目标库还是空的。可以展开“从已有记录导入目标”，或在上方新建一个目标。</Alert>
        )}
      </SectionCard>
    </Box>
  );
}
