/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Alert, Box, Button, Chip, TextField, Typography } from '@shared/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
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

export function GoalEntitySection() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const goals = settings.goalSettings?.goals || [];
  const [goalPath, setGoalPath] = useState('');
  const [goalThemePath, setGoalThemePath] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

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
    const goal = await useCases.goal.addGoal({ title: pathLeaf(path), goalPath: path, themePath: goalThemePath.trim() || null });
    setMessage(alreadyExists ? `目标已存在：${path}` : goal ? `已添加目标：${goal.goalPath || goal.title}` : '目标未添加');
    if (goal && !alreadyExists) {
      setGoalPath('');
      setGoalThemePath('');
    }
  };


  const handleEditGoalTheme = async (goal: any) => {
    const current = String(goal.themePath || '');
    const next = window.prompt('默认主题（留空表示无）', current);
    if (next === null) return;
    await useCases.goal.updateGoal(goal.id, { themePath: next.trim() || null });
    setMessage(`已更新主题：${goal.goalPath || goal.title || goal.id}`);
  };

  const handleDeleteGoal = async (goal: any) => {
    const label = goal.goalPath || goal.title || goal.id;
    const path = String(goal.goalPath || goal.title || '').trim();
    const descendantCount = path
      ? goals.filter((item: any) => item.id !== goal.id && String(item.goalPath || item.title || '').trim().startsWith(`${path}/`)).length
      : 0;
    const suffix = descendantCount > 0 ? `\n同时删除 ${descendantCount} 个子目标。` : '';
    if (!window.confirm(`删除目标「${label}」？${suffix}\n\n这会删除目标实体、子目标、目标记录关系和该目标下的记录预设；不会删除已有 Markdown 文件。`)) return;
    const count = typeof (useCases.goal as any).deleteGoalCascade === 'function'
      ? await (useCases.goal as any).deleteGoalCascade(goal.id)
      : (await useCases.goal.deleteGoal(goal.id), 1);
    setMessage(count > 1 ? `已删除目标及子目标：${count} 个` : `已删除目标：${label}`);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>}

      <SectionCard>
        <Typography sx={{ fontWeight: 800 }}>新建目标</Typography>
        <Typography variant="body2" color="text.secondary">目标回答“我要追踪什么”。默认主题只是快捷输入的上下文字段，不决定模板；周期请在计划/总结预设里设置。</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) minmax(180px, 0.65fr) auto' }, gap: 1, alignItems: 'center' }}>
          <TextField size="small" label="目标路径" value={goalPath} onChange={(event: any) => setGoalPath(event.target.value)} placeholder="例如：产品化/插件/目标中心" />
          <TextField size="small" label="默认主题（可选）" value={goalThemePath} onChange={(event: any) => setGoalThemePath(event.target.value)} placeholder="例如：电脑/记录系统" />
          <Button variant="contained" onClick={handleAddGoal} disabled={!goalPath.trim()}>新建目标</Button>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>目标库</Typography>
            <Typography variant="body2" color="text.secondary">目标库只管理目标本身：新建、暂停、完成、归档、删除。统计周期属于记录表单，请到“目标 × 记录类型 预设表”的单元格里设置。</Typography>
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
                    {goal.themePath ? <Chip size="small" label={`主题 ${goal.themePath}`} /> : <Chip size="small" label="无默认主题" variant="outlined" />}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button size="small" variant="text" onClick={() => handleEditGoalTheme(goal)}>主题</Button>
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
          <Alert severity="info">目标库还是空的。请在上方新建一个目标。</Alert>
        )}
      </SectionCard>
    </Box>
  );
}
