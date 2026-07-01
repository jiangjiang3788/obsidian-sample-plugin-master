/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@shared/ui/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import { GoalTemplateMatrix } from '@features/settings/goalTemplates';
import { pathLeaf } from './goalManager/shared';

/**
 * 目标：把“目标管理”和“预设管理”合并成一个工作区。
 * 上方只保留新建目标；下方直接在目标 × 记录类型矩阵里管理预设。
 */
export function GoalManager() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const goals = settings.goalSettings?.goals || [];
  const [goalPath, setGoalPath] = useState('');
  const [goalThemePath, setGoalThemePath] = useState('');
  const [message, setMessage] = useState('');
  const [cleaning, setCleaning] = useState(false);

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

  const handleCleanup = async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      const goalUseCase = useCases.goal as any;
      if (typeof goalUseCase.cleanupGoalSettings !== 'function') {
        setMessage('当前版本还没有整理预设数据能力');
        return;
      }
      const result = await goalUseCase.cleanupGoalSettings();
      const parts = [
        `预设 ${result.beforeTemplateCount} → ${result.afterTemplateCount}`,
        result.removedDuplicateTemplates ? `去重 ${result.removedDuplicateTemplates}` : '',
      ].filter(Boolean);
      setMessage(result.changed ? `已整理：${parts.join('，')}` : '预设数据已经是干净状态');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto', width: '100%', display: 'grid', gap: 1.25 }}>
      {message && <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) minmax(180px, 0.55fr) auto' }, gap: 1, alignItems: 'center' }}>
        <TextField size="small" label="添加目标" value={goalPath} onChange={(event: any) => setGoalPath(event.target.value)} placeholder="例如：了解自我/情绪" />
        <TextField size="small" label="目标主题" value={goalThemePath} onChange={(event: any) => setGoalThemePath(event.target.value)} placeholder="可选" />
        <Button variant="contained" onClick={handleAddGoal} disabled={!goalPath.trim()}>添加</Button>
      </Box>

      <Box sx={{ display: 'grid', gap: 1, border: '1px solid var(--background-modifier-border)', borderRadius: 2, p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>记录预设</Typography>
            <Typography variant="caption" color="text.secondary">点击某个目标主题预设卡片后，字段编辑页会以悬浮窗打开。</Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={handleCleanup} disabled={cleaning}>{cleaning ? '整理中…' : '整理预设'}</Button>
        </Box>
        <GoalTemplateMatrix />
      </Box>
    </Box>
  );
}
