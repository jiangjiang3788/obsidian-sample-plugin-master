/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ThinkButton, ThinkInput } from '@shared/ui/public';
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

  const handleAddGoal = async () => {
    const path = goalPath.trim();
    if (!path) return;
    const alreadyExists = goals.some((goal) => String(goal.goalPath || goal.title || '').trim() === path);
    const goal = await useCases.goal.addGoal({ title: pathLeaf(path), goalPath: path, themePath: goalThemePath.trim() || null });
    setMessage(alreadyExists ? `目标已存在：${path}` : goal ? `已添加：${goal.goalPath || goal.title}` : '目标未添加');
    if (goal && !alreadyExists) {
      setGoalPath('');
      setGoalThemePath('');
    }
  };

  return (
    <div className="think-goal-manager">
      <div className="think-settings-row think-settings-row--top think-goal-manager__create-row">
        <span className="think-settings-row__label think-settings-row__label--top">新增目标</span>
        <div className="think-settings-row__body">
          <div className="think-goal-manager__create">
            <ThinkInput aria-label="目标路径" value={goalPath} onInput={(event) => setGoalPath((event.currentTarget as HTMLInputElement).value)} placeholder="目标路径，例如 了解自我/情绪" />
            <ThinkInput aria-label="目标主题" value={goalThemePath} onInput={(event) => setGoalThemePath((event.currentTarget as HTMLInputElement).value)} placeholder="主题（可选）" />
            <ThinkButton variant="primary" size="sm" onClick={handleAddGoal} disabled={!goalPath.trim()}>添加</ThinkButton>
          </div>
          {message && <div className="think-settings-caption think-goal-manager__status" role="status">{message}</div>}
        </div>
      </div>
      <GoalTemplateMatrix />
    </div>
  );
}
