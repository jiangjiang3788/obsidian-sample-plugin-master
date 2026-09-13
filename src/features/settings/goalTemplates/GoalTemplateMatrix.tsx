/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Modal, ThinkButton, ThinkInput, ThinkNotice } from '@shared/ui/public';
import { getTemplateRecordTypes } from '@core/recordTypes/public';
import { getGoalTemplates, resolveGoalIcon } from '@core/goal/public';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { selectSettings, useSelector, useUiPort, useUseCases } from '@/app/public';
import { GoalTemplateEditorModal } from './GoalTemplateEditorModal';
import { GoalTemplateMatrixTable } from './GoalTemplateMatrixTable';
import { orderGoalTemplateRecordTypes } from './goalTemplateCopy';
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
  const recordTypes = useMemo(() => orderGoalTemplateRecordTypes(getTemplateRecordTypes()), [settings]);
  const allGoalPaths = useMemo(() => new Set(goals.map(getGoalDisplayPath)), [goals]);

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ goal: GoalDefinition; block: TemplateRecordTypeDefinition; template: GoalTemplate | null } | null>(null);
  const [draggingGoalPath, setDraggingGoalPath] = useState<string | null>(null);
  const [goalDrop, setGoalDrop] = useState<GoalDropState>(null);
  const [iconEditorGoal, setIconEditorGoal] = useState<GoalDefinition | null>(null);
  const [iconDraft, setIconDraft] = useState('');

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
  const openEditor = (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => {
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


  const setGoalTimePresetPercent = async (path: string, percent: number | null) => {
    try {
      await useCases.goal.setGoalTimePresetPercent(path, percent);
    } catch (error) {
      ui.notice(`时间预设保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const setGoalWeeklyTargetMinutes = async (path: string, minutes: number | null) => {
    try {
      await useCases.goal.setGoalWeeklyTargetMinutes(path, minutes);
    } catch (error) {
      ui.notice(`目标时间保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const setGoalColor = async (path: string, color: string | null) => {
    try {
      await useCases.goal.setGoalColor(path, color);
    } catch (error) {
      ui.notice(`目标颜色保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteGoal = async (event: MouseEvent, goal: GoalDefinition) => {
    event.preventDefault();
    event.stopPropagation();
    const path = getGoalDisplayPath(goal);
    const descendants = goals.filter((item) => item.path !== goal.path && getGoalDisplayPath(item).startsWith(`${path}/`));
    const targets = [goal, ...descendants];
    const suffix = descendants.length > 0 ? `\n同时删除 ${descendants.length} 个子目标。` : '';
    const ok = window.confirm(`删除目标「${cleanDisplayText(path)}」？${suffix}\n\n会删除目标配置和该目标下的模板；不会删除已经写入的 Markdown 记录。`);
    if (!ok) return;
    const count = typeof (useCases.goal as any).deleteGoalCascade === 'function'
      ? await (useCases.goal as any).deleteGoalCascade(goal.path)
      : (await Promise.all(targets.map((target) => useCases.goal.deleteGoal(target.path))), targets.length);
    ui.notice(descendants.length > 0 ? `已删除目标及子目标：${count} 个` : `已删除目标：${cleanDisplayText(path)}`);
  };

  const handleEditGoalIcon = async (event: MouseEvent, goal: GoalDefinition) => {
    event.preventDefault();
    event.stopPropagation();
    setIconEditorGoal(goal);
    setIconDraft(resolveGoalIcon(goal));
  };

  const closeGoalIconEditor = () => {
    setIconEditorGoal(null);
    setIconDraft('');
  };

  const saveGoalIcon = async () => {
    if (!iconEditorGoal) return;
    const icon = iconDraft.trim();
    await useCases.goal.updateGoal(iconEditorGoal.path, { icon: icon || undefined });
    ui.notice(icon ? `已更新目标图标：${icon} ${iconEditorGoal.path}` : `已清除目标图标：${iconEditorGoal.path}`);
    closeGoalIconEditor();
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
      ) : recordTypes.length === 0 ? (
        <ThinkNotice>还没有启用的记录类型。</ThinkNotice>
      ) : (
        <GoalTemplateMatrixTable
          visibleGoals={visibleGoals}
          goals={goals}
          visibleBlocks={recordTypes}
          templates={templates}
          expandedPaths={expandedPaths}
          draggingGoalPath={draggingGoalPath}
          goalDrop={goalDrop}
          setDraggingGoalPath={setDraggingGoalPath}
          setGoalDrop={setGoalDrop}
          toggleTreePath={toggleTreePath}
          reorderGoalSiblings={reorderGoalSiblings}
          handleDeleteGoal={handleDeleteGoal}
          handleEditGoalIcon={handleEditGoalIcon}
          openEditor={openEditor}
          setGoalTimePresetPercent={setGoalTimePresetPercent}
          setGoalWeeklyTargetMinutes={setGoalWeeklyTargetMinutes}
          setGoalColor={setGoalColor}
        />
      )}

      <Modal
        isOpen={!!iconEditorGoal}
        onClose={closeGoalIconEditor}
        onSave={saveGoalIcon}
        title={iconEditorGoal ? `目标图标：${cleanDisplayText(iconEditorGoal.path)}` : '目标图标'}
        size="small"
        saveButtonText="保存"
      >
        <div className="think-settings-stack">
          <ThinkInput
            autoFocus
            value={iconDraft}
            placeholder="例如：💪 / 🧠 / 📚"
            aria-label="目标图标"
            onInput={(event) => setIconDraft((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void saveGoalIcon();
              }
            }}
          />
          <div className="think-settings-caption">输入 Emoji 或短文本；清空后保存即可移除图标。</div>
        </div>
      </Modal>

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
