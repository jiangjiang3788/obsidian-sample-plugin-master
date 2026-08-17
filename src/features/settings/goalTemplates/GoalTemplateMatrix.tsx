/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ThinkButton, ThinkInput, ThinkNotice } from '@shared/ui/public';
import { getEffectiveCoreBlocks } from '@core/blocks/public';
import { getGoalTemplates } from '@core/goal/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { selectSettings, useSelector, useUiPort, useUseCases } from '@/app/public';
import { GoalTemplateEditorModal } from './GoalTemplateEditorModal';
import { GoalTemplateMatrixTable } from './GoalTemplateMatrixTable';
import { orderGoalTemplateBlocks } from './goalTemplateCopy';
import {
  cleanDisplayText,
  filterVisibleGoalTemplateMatrixGoals,
  getGoalDisplayPath,
  getGoalParentPath,
  orderDraggedGoalSiblings,
  sortGoalsForMatrix,
  toggleGoalPath,
} from './goalTemplateMatrixModel';
import type { DropPosition, GoalDropState } from './goalTemplateMatrixModel';

export function GoalTemplateMatrix() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const ui = useUiPort();
  const goals = useMemo(
    () => sortGoalsForMatrix((settings.goalSettings?.goals || []).filter((goal) => goal.status !== 'archived')),
    [settings.goalSettings?.goals],
  );
  const templates = useMemo(() => getGoalTemplates(settings.goalSettings), [settings.goalSettings]);
  const coreBlocks = useMemo(() => orderGoalTemplateBlocks(getEffectiveCoreBlocks(settings)), [settings]);
  const allGoalPaths = useMemo(() => new Set(goals.map(getGoalDisplayPath)), [goals]);

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ goal: GoalDefinition; block: CoreBlockDefinition; template: GoalTemplate | null } | null>(null);
  const [draggingGoalPath, setDraggingGoalPath] = useState<string | null>(null);
  const [goalDrop, setGoalDrop] = useState<GoalDropState>(null);

  useEffect(() => {
    setExpandedPaths((previous) => new Set(Array.from(previous).filter((path) => allGoalPaths.has(path))));
  }, [allGoalPaths]);

  const visibleGoals = useMemo(
    () => filterVisibleGoalTemplateMatrixGoals({ goals, expandedPaths, query, templates }),
    [goals, expandedPaths, query, templates],
  );

  const toggleTreePath = (path: string) => setExpandedPaths((previous) => toggleGoalPath(previous, path));
  const expandAll = () => setExpandedPaths(new Set(Array.from(allGoalPaths)));
  const showRootsOnly = () => setExpandedPaths(new Set());
  const openEditor = (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => {
    setSelected({ goal, block, template: template || null });
  };

  const reorderGoalSiblings = async (dragGoalPath: string, targetGoalPath: string, position: DropPosition) => {
    const next = orderDraggedGoalSiblings({ goals, dragGoalPath, targetGoalPath, position });
    if (!next) {
      const dragged = goals.find((goal) => goal.path === dragGoalPath);
      const target = goals.find((goal) => goal.path === targetGoalPath);
      if (dragged && target && getGoalParentPath(dragged) !== getGoalParentPath(target)) ui.notice('当前只支持同级目标拖动排序');
      return;
    }
    await Promise.all(next.map((goal, index) => useCases.goal.updateGoal(goal.path, { sortOrder: index * 10 } as any)));
    ui.notice('目标排序已保存');
  };

  const handleDeleteGoal = async (event: MouseEvent, goal: GoalDefinition) => {
    event.preventDefault();
    event.stopPropagation();
    const path = getGoalDisplayPath(goal);
    const descendants = goals.filter((item) => item.path !== goal.path && getGoalDisplayPath(item).startsWith(`${path}/`));
    const targets = [goal, ...descendants];
    const suffix = descendants.length > 0 ? `\n同时删除 ${descendants.length} 个子目标。` : '';
    const ok = window.confirm(`删除目标「${cleanDisplayText(path)}」？${suffix}\n\n会删除目标配置和该目标下的字段预设；不会删除已经写入的 Markdown 记录。`);
    if (!ok) return;
    const count = typeof (useCases.goal as any).deleteGoalCascade === 'function'
      ? await (useCases.goal as any).deleteGoalCascade(goal.path)
      : (await Promise.all(targets.map((target) => useCases.goal.deleteGoal(target.path))), targets.length);
    ui.notice(descendants.length > 0 ? `已删除目标及子目标：${count} 个` : `已删除目标：${cleanDisplayText(path)}`);
  };

  return (
    <div className="think-goal-template-matrix">
      <div className="think-management-toolbar think-goal-template-matrix__toolbar">
        <ThinkInput
          className="think-settings-search"
          placeholder="搜索目标"
          value={query}
          onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
          aria-label="搜索目标"
        />
        <ThinkButton size="sm" variant="secondary" onClick={expandedPaths.size > 0 ? showRootsOnly : expandAll}>
          {expandedPaths.size > 0 ? '只看根目标' : '全部展开'}
        </ThinkButton>
      </div>

      {goals.length === 0 ? (
        <ThinkNotice>还没有目标。</ThinkNotice>
      ) : coreBlocks.length === 0 ? (
        <ThinkNotice>还没有启用的记录类型。</ThinkNotice>
      ) : (
        <GoalTemplateMatrixTable
          visibleGoals={visibleGoals}
          goals={goals}
          visibleBlocks={coreBlocks}
          templates={templates}
          expandedPaths={expandedPaths}
          draggingGoalPath={draggingGoalPath}
          goalDrop={goalDrop}
          setDraggingGoalPath={setDraggingGoalPath}
          setGoalDrop={setGoalDrop}
          toggleTreePath={toggleTreePath}
          reorderGoalSiblings={reorderGoalSiblings}
          handleDeleteGoal={handleDeleteGoal}
          openEditor={openEditor}
        />
      )}

      <GoalTemplateEditorModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        goal={selected?.goal || null}
        block={selected?.block || null}
        template={selected?.template || null}
        useCases={useCases}
      />
    </div>
  );
}
