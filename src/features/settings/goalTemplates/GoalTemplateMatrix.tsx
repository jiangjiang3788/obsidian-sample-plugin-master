/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Alert, Box, Button, Chip, TextField } from '@shared/public';
import { getEffectiveCoreBlocks, getGoalTemplates } from '@core/public';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';
import { selectSettings, useSelector, useUiPort, useUseCases } from '@/app/public';
import { GoalTemplateEditorModal } from './GoalTemplateEditorModal';
import { GoalTemplateContextMenu } from './GoalTemplateContextMenu';
import { GoalTemplateMatrixTable } from './GoalTemplateMatrixTable';
import {
  buildCopiedGoalTemplate,
  buildRetargetedGoalTemplate,
  findExistingTemplateForTheme,
  orderGoalTemplateBlocks,
  readGoalTemplateThemePath,
} from './goalTemplateCopy';
import {
  addAllGoalPaths,
  buildNextActiveBlockIds,
  buildThemeIconMap,
  cleanDisplayText,
  filterVisibleGoalTemplateMatrixGoals,
  getEventDropPosition,
  getGoalDisplayPath,
  getGoalParentPath,
  getPresetCardName,
  goalTemplateKey,
  goalTemplateVariantId,
  isSameCell,
  orderDraggedGoalSiblings,
  reorderPresetTemplatesInCell,
  sortGoalsForMatrix,
  sortPresets,
  toggleGoalCollapsed,
  toggleGoalPath,
} from './goalTemplateMatrixModel';
import type { DropPosition, GoalDropState, PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

type ContextMenuState = {
  x: number;
  y: number;
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
};

export function GoalTemplateMatrix() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const ui = useUiPort();
  const goals = useMemo(() => sortGoalsForMatrix((settings.goalSettings?.goals || []).filter((goal) => goal.status !== 'archived')), [settings.goalSettings?.goals]);
  const templates = useMemo(() => getGoalTemplates(settings.goalSettings), [settings.goalSettings]);
  const coreBlocks = useMemo(() => orderGoalTemplateBlocks(getEffectiveCoreBlocks(settings)), [settings]);
  const themeIconByPath = useMemo(() => buildThemeIconMap(settings), [settings.inputSettings?.themes]);
  const allGoalPaths = useMemo(() => new Set(goals.map(getGoalDisplayPath)), [goals]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(Array.from(allGoalPaths)));
  const [collapsedGoalIds, setCollapsedGoalIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [activeBlockIds, setActiveBlockIds] = useState<Set<string>>(() => new Set(coreBlocks.map((block) => block.id)));
  const [selected, setSelected] = useState<{ goal: GoalDefinition; block: CoreBlockDefinition; variantId?: string | null } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
  const [goalDrop, setGoalDrop] = useState<GoalDropState>(null);
  const [draggingPreset, setDraggingPreset] = useState<PresetDragState | null>(null);
  const [presetDropCell, setPresetDropCell] = useState<PresetDropCellState>(null);

  useEffect(() => {
    if (!coreBlocks.length) return;
    setActiveBlockIds((previous) => previous.size > 0 ? previous : new Set(coreBlocks.map((block) => block.id)));
  }, [coreBlocks]);

  useEffect(() => {
    setExpandedPaths((previous) => addAllGoalPaths(previous, allGoalPaths));
  }, [allGoalPaths]);

  const isBlockActive = (blockId: string): boolean => activeBlockIds.size === 0 || activeBlockIds.has(blockId);
  const visibleBlocks = useMemo(() => coreBlocks.filter((block) => isBlockActive(block.id)), [coreBlocks, activeBlockIds]);
  const visibleGoals = useMemo(() => filterVisibleGoalTemplateMatrixGoals({ goals, expandedPaths, query, templates }), [goals, expandedPaths, query, templates]);

  const toggleTreePath = (path: string) => setExpandedPaths((previous) => toggleGoalPath(previous, path));
  const toggleGoalRow = (goalId: string) => setCollapsedGoalIds((previous) => toggleGoalCollapsed(previous, goalId));
  const toggleBlock = (blockId: string) => setActiveBlockIds((previous) => buildNextActiveBlockIds(previous, blockId, coreBlocks));
  const expandAll = () => {
    setExpandedPaths(new Set(Array.from(allGoalPaths)));
    setCollapsedGoalIds(new Set());
  };
  const collapseAll = () => setCollapsedGoalIds(new Set(goals.map((goal) => goal.id)));

  const selectedVariants = selected
    ? templates.filter((template) => template.goalId === selected.goal.id && template.coreBlockId === selected.block.id)
    : [];

  const openEditor = (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => setSelected({ goal, block, variantId: template ? goalTemplateVariantId(template) : null });

  const openPresetContextMenu = (event: MouseEvent, goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, goal, block, template });
  };

  const deletePresetTemplate = async (goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => {
    const name = getPresetCardName(template, goal);
    const ok = window.confirm(`删除记录预设「${name}」？\n\n只删除 ${cleanDisplayText(goal.goalPath || goal.title)} / ${block.name} 下的这个主题预设，不会删除已经写入的 Markdown 记录。`);
    if (!ok) return;
    await useCases.goal.deleteGoalTemplate(goal.id, block.id, goalTemplateVariantId(template));
    ui.notice(`已删除记录预设：${name}`);
  };

  const copyContextTemplateToBlock = async (targetBlock: CoreBlockDefinition) => {
    if (!contextMenu) return;
    const existing = findExistingTemplateForTheme(templates, contextMenu.goal, targetBlock, contextMenu.template);
    if (existing) {
      openEditor(contextMenu.goal, targetBlock, existing);
      ui.notice(`已存在 ${targetBlock.name} 预设，已打开编辑`);
      return;
    }
    const themePath = readGoalTemplateThemePath(contextMenu.template, contextMenu.goal);
    const copied = buildCopiedGoalTemplate({
      sourceTemplate: contextMenu.template,
      sourceBlock: contextMenu.block,
      targetBlock,
      goal: contextMenu.goal,
      templates,
      themeIcon: themeIconByPath.get(themePath),
    });
    await useCases.goal.upsertGoalTemplate(copied);
    ui.notice(`已创建：${targetBlock.name} / ${getPresetCardName(copied, contextMenu.goal)}`);
  };

  const copyContextTemplateToMissingBlocks = async () => {
    if (!contextMenu) return;
    let created = 0;
    let skipped = 0;
    let nextTemplates = [...templates];
    const themePath = readGoalTemplateThemePath(contextMenu.template, contextMenu.goal);
    for (const targetBlock of coreBlocks) {
      if (targetBlock.id === contextMenu.block.id) continue;
      const existing = findExistingTemplateForTheme(nextTemplates, contextMenu.goal, targetBlock, contextMenu.template);
      if (existing) {
        skipped += 1;
        continue;
      }
      const copied = buildCopiedGoalTemplate({
        sourceTemplate: contextMenu.template,
        sourceBlock: contextMenu.block,
        targetBlock,
        goal: contextMenu.goal,
        templates: nextTemplates,
        themeIcon: themeIconByPath.get(themePath),
      });
      await useCases.goal.upsertGoalTemplate(copied);
      nextTemplates = [...nextTemplates, copied];
      created += 1;
    }
    ui.notice(`补齐完成：创建 ${created} 个，跳过 ${skipped} 个`);
  };

  const reorderGoalSiblings = async (dragGoalId: string, targetGoalId: string, position: DropPosition) => {
    const next = orderDraggedGoalSiblings({ goals, dragGoalId, targetGoalId, position });
    if (!next) {
      const dragged = goals.find((goal) => goal.id === dragGoalId);
      const target = goals.find((goal) => goal.id === targetGoalId);
      if (dragged && target && getGoalParentPath(dragged) !== getGoalParentPath(target)) ui.notice('当前只支持同级目标拖动排序');
      return;
    }
    await Promise.all(next.map((goal, index) => useCases.goal.updateGoal(goal.id, { sortOrder: index * 10 } as any)));
    ui.notice('目标排序已保存');
  };

  const reorderPresetsInCell = async (drag: PresetDragState, targetTemplateKey: string | null, position: DropPosition) => {
    const normalized = reorderPresetTemplatesInCell({ templates, goals, drag, targetTemplateKey, position });
    if (!normalized) return;
    await Promise.all(normalized.map((template) => useCases.goal.upsertGoalTemplate(template)));
    ui.notice('预设排序已保存');
  };

  const movePresetToCell = async (drag: PresetDragState, targetGoal: GoalDefinition, targetBlock: CoreBlockDefinition, targetTemplateKey: string | null, position: DropPosition) => {
    const sourceTemplate = templates.find((template) => goalTemplateKey(template) === drag.templateKey);
    const sourceGoal = goals.find((goal) => goal.id === drag.goalId);
    const sourceBlock = coreBlocks.find((block) => block.id === drag.blockId);
    if (!sourceTemplate || !sourceGoal || !sourceBlock) return;

    if (isSameCell(drag, targetGoal, targetBlock)) {
      await reorderPresetsInCell(drag, targetTemplateKey, position);
      return;
    }

    const existing = findExistingTemplateForTheme(templates, targetGoal, targetBlock, sourceTemplate);
    if (existing) {
      ui.notice('目标格里已有相同主题预设，未移动，避免重复');
      return;
    }

    const sourceThemePath = readGoalTemplateThemePath(sourceTemplate, sourceGoal);
    const moved = buildRetargetedGoalTemplate({
      sourceTemplate,
      sourceBlock,
      targetBlock,
      sourceGoal,
      targetGoal,
      templates,
      themeIcon: themeIconByPath.get(sourceThemePath),
      reason: 'move',
    });

    const targetTemplates = sortPresets(templates.filter((template) => template.goalId === targetGoal.id && template.coreBlockId === targetBlock.id && template.enabled !== false), goals);
    const reorderedTarget = targetTemplates.slice();
    if (targetTemplateKey) {
      const targetIndex = reorderedTarget.findIndex((template) => goalTemplateKey(template) === targetTemplateKey);
      if (targetIndex >= 0) reorderedTarget.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, moved);
      else reorderedTarget.push(moved);
    } else {
      reorderedTarget.push(moved);
    }
    const normalizedTarget = reorderedTarget.map((template, index) => ({ ...template, sortOrder: index * 10 }));

    await useCases.goal.deleteGoalTemplate(sourceTemplate.goalId, sourceTemplate.coreBlockId, goalTemplateVariantId(sourceTemplate));
    await Promise.all(normalizedTarget.map((template) => useCases.goal.upsertGoalTemplate(template)));
    ui.notice(`已移动到：${cleanDisplayText(targetGoal.goalPath || targetGoal.title)} / ${targetBlock.name}`);
  };

  const handlePresetDropOnCell = async (event: DragEvent, goal: GoalDefinition, block: CoreBlockDefinition) => {
    if (!draggingPreset) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement | null;
    const targetCard = target?.closest?.('[data-goal-template-key]') as HTMLElement | null;
    const targetTemplateKey = targetCard?.dataset?.goalTemplateKey || null;
    const position = targetCard ? getEventDropPosition(event, targetCard) : 'after';
    await movePresetToCell(draggingPreset, goal, block, targetTemplateKey, position);
    setDraggingPreset(null);
    setPresetDropCell(null);
  };

  const handleDeleteGoal = async (event: MouseEvent, goal: GoalDefinition) => {
    event.preventDefault();
    event.stopPropagation();
    const path = getGoalDisplayPath(goal);
    const descendants = goals.filter((item) => item.id !== goal.id && getGoalDisplayPath(item).startsWith(`${path}/`));
    const targets = [goal, ...descendants];
    const suffix = descendants.length > 0 ? `\n同时删除 ${descendants.length} 个子目标。` : '';
    const ok = window.confirm(`删除目标「${cleanDisplayText(path)}」？${suffix}\n\n会删除目标配置、该目标下的记录预设和目标关系；不会删除已经写入的 Markdown 记录。`);
    if (!ok) return;
    const count = typeof (useCases.goal as any).deleteGoalCascade === 'function'
      ? await (useCases.goal as any).deleteGoalCascade(goal.id)
      : (await Promise.all(targets.map((target) => useCases.goal.deleteGoal(target.id))), targets.length);
    ui.notice(descendants.length > 0 ? `已删除目标及子目标：${count} 个` : `已删除目标：${cleanDisplayText(path)}`);
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="搜索" value={query} onChange={(event: any) => setQuery(event.target.value)} sx={{ minWidth: 220 }} />
          <Button size="small" variant="outlined" onClick={expandAll}>展开</Button>
          <Button size="small" variant="outlined" onClick={collapseAll}>折叠</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {coreBlocks.map((block) => (
          <Chip
            key={block.id}
            size="small"
            label={block.name}
            color={isBlockActive(block.id) ? 'primary' : 'default'}
            variant={isBlockActive(block.id) ? 'filled' : 'outlined'}
            onClick={() => toggleBlock(block.id)}
          />
        ))}
      </Box>

      {goals.length === 0 ? (
        <Alert severity="info">还没有目标。请先到“目标”新建目标，然后在表格单元格里配置记录预设。</Alert>
      ) : coreBlocks.length === 0 ? (
        <Alert severity="info">还没有启用的记录类型。请先在“数据管理 / 记录类型”里启用。</Alert>
      ) : (
        <GoalTemplateMatrixTable
          visibleGoals={visibleGoals}
          goals={goals}
          visibleBlocks={visibleBlocks}
          templates={templates}
          themeIconByPath={themeIconByPath}
          expandedPaths={expandedPaths}
          collapsedGoalIds={collapsedGoalIds}
          draggingGoalId={draggingGoalId}
          goalDrop={goalDrop}
          draggingPreset={draggingPreset}
          presetDropCell={presetDropCell}
          setDraggingGoalId={setDraggingGoalId}
          setGoalDrop={setGoalDrop}
          setDraggingPreset={setDraggingPreset}
          setPresetDropCell={setPresetDropCell}
          toggleGoalRow={toggleGoalRow}
          toggleTreePath={toggleTreePath}
          reorderGoalSiblings={reorderGoalSiblings}
          handleDeleteGoal={handleDeleteGoal}
          handlePresetDropOnCell={handlePresetDropOnCell}
          openEditor={openEditor}
          openPresetContextMenu={openPresetContextMenu}
        />
      )}

      <GoalTemplateContextMenu
        state={contextMenu}
        blocks={coreBlocks}
        templates={templates}
        onClose={() => setContextMenu(null)}
        onOpenBlock={openEditor}
        onCopyToBlock={copyContextTemplateToBlock}
        onCopyMissingBlocks={copyContextTemplateToMissingBlocks}
        onDeleteTemplate={deletePresetTemplate}
      />

      <GoalTemplateEditorModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        goal={selected?.goal || null}
        block={selected?.block || null}
        variants={selectedVariants}
        initialVariantId={selected?.variantId || null}
        useCases={useCases}
      />
    </Box>
  );
}
