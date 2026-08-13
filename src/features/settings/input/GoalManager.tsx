/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ThinkButton, ThinkInput, ThinkNotice } from '@shared/ui/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import { GoalTemplateMatrix } from '@features/settings/goalTemplates/GoalTemplateMatrix';
import { pathLeaf } from './goalManager/shared';

export function GoalManager() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const goals = settings.goalSettings?.goals || [];
  const [goalPath, setGoalPath] = useState('');
  const [goalThemePath, setGoalThemePath] = useState('');
  const [message, setMessage] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const handleAddGoal = async () => {
    const path = goalPath.trim(); if (!path) return;
    const alreadyExists = goals.some((goal) => String(goal.goalPath || goal.title || '').trim() === path);
    const goal = await useCases.goal.addGoal({ title: pathLeaf(path), goalPath: path, themePath: goalThemePath.trim() || null });
    setMessage(alreadyExists ? `目标已存在：${path}` : goal ? `已添加：${goal.goalPath || goal.title}` : '目标未添加');
    if (goal && !alreadyExists) { setGoalPath(''); setGoalThemePath(''); }
  };
  const handleCleanup = async () => {
    if (cleaning) return; setCleaning(true);
    try {
      const goalUseCase = useCases.goal as any;
      if (typeof goalUseCase.cleanupGoalSettings !== 'function') { setMessage('当前版本不支持整理预设'); return; }
      const result = await goalUseCase.cleanupGoalSettings();
      setMessage(result.changed ? `已整理：预设 ${result.beforeTemplateCount} → ${result.afterTemplateCount}` : '预设数据已是干净状态');
    } finally { setCleaning(false); }
  };
  return (
    <div className="think-goal-manager">
      {message && <ThinkNotice>{message}</ThinkNotice>}
      <div className="think-goal-manager__create">
        <ThinkInput aria-label="添加目标" value={goalPath} onInput={(event) => setGoalPath((event.currentTarget as HTMLInputElement).value)} placeholder="目标路径，例如 了解自我/情绪" />
        <ThinkInput aria-label="目标主题" value={goalThemePath} onInput={(event) => setGoalThemePath((event.currentTarget as HTMLInputElement).value)} placeholder="目标主题（可选）" />
        <ThinkButton variant="primary" size="sm" onClick={handleAddGoal} disabled={!goalPath.trim()}>添加</ThinkButton>
      </div>
      <div className="think-goal-manager__presets">
        <div className="think-goal-manager__presets-header">
          <h2 className="think-goal-manager__title">记录预设</h2>
          <ThinkButton size="sm" variant="secondary" onClick={handleCleanup} disabled={cleaning}>{cleaning ? '整理中…' : '整理预设'}</ThinkButton>
        </div>
        <GoalTemplateMatrix />
      </div>
    </div>
  );
}
