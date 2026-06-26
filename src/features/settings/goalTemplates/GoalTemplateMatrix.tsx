/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  Alert,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@shared/public';
import { getEffectiveCoreBlocks, getGoalTemplates, sortGoalTemplatesBySettingsOrder } from '@core/public';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';
import { selectSettings, useSelector, useUiPort, useUseCases } from '@/app/public';
import { GoalTemplateEditorModal } from './GoalTemplateEditorModal';
import { GoalTemplateContextMenu } from './GoalTemplateContextMenu';
import { GoalPresetCard } from './GoalPresetCard';
import {
  buildCopiedGoalTemplate,
  buildRetargetedGoalTemplate,
  findExistingTemplateForTheme,
  getGoalTemplateDisplayName,
  orderGoalTemplateBlocks,
  readGoalTemplateIcon,
  readGoalTemplateThemePath,
} from './goalTemplateCopy';
import {
  buildGoalTemplateCell,
  getGoalDepth,
  getGoalDisplayName,
  getGoalDisplayPath,
  getGoalParentPath,
  goalHasChildren,
  isGoalVisibleByExpandedState,
  sortGoalsForMatrix,
} from './goalTemplateMatrixModel';

const AnyTable = Table as any;
const AnyTableHead = TableHead as any;
const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTableBody = TableBody as any;
const AnyTypography = Typography as any;
const AnyBox = Box as any;

const PATH_COL_WIDTH = 250;
const BLOCK_COL_WIDTH = 136;
const SEGMENT_HEIGHT = 36;
const ADD_BUTTON_HEIGHT = SEGMENT_HEIGHT;

type ContextMenuState = {
  x: number;
  y: number;
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
};

type DropPosition = 'before' | 'after';

type GoalDropState = { goalId: string; position: DropPosition } | null;
type PresetDragState = { goalId: string; blockId: string; templateKey: string };
type PresetDropCellState = { goalId: string; blockId: string };

function normalizeSearchText(value: string): string {
  return String(value || '').toLowerCase().trim();
}

function cleanDisplayText(value: unknown): string {
  return String(value ?? '').replace(/^[#＃]+\s*/, '').trim();
}

function leafPath(value: unknown): string {
  const text = String(value ?? '').trim();
  return text.split('/').filter(Boolean).pop() || text;
}

function isGeneratedPresetName(value: unknown): boolean {
  const text = String(value ?? '').trim();
  return !text || /^预设\s*\d+$/i.test(text) || /^preset[-_\s]*\d+$/i.test(text) || text === '记录预设' || text === '未命名预设';
}

function getPresetCardName(template: GoalTemplate, goal: GoalDefinition): string {
  const raw = getGoalTemplateDisplayName(template);
  if (!isGeneratedPresetName(raw)) return raw;
  return cleanDisplayText(leafPath(readGoalTemplateThemePath(template, goal))) || raw;
}

function goalTemplateKey(template: GoalTemplate): string {
  return template.id || `${template.goalId}:${template.coreBlockId}:${template.variantId || 'default'}`;
}

function goalTemplateVariantId(template: GoalTemplate): string {
  return String(template.variantId || 'default').trim() || 'default';
}

function sortPresets<T extends GoalTemplate>(items: T[], goals: GoalDefinition[] = []): T[] {
  return sortGoalTemplatesBySettingsOrder(items, goals);
}

function buildThemeIconMap(settings: any): Map<string, string> {
  const map = new Map<string, string>();
  for (const theme of settings.inputSettings?.themes || []) {
    if (theme?.path) map.set(String(theme.path), String(theme.icon || ''));
  }
  return map;
}

function presetSearchText(template: GoalTemplate, goal: GoalDefinition): string {
  return `${getPresetCardName(template, goal)} ${readGoalTemplateThemePath(template, goal)} ${readGoalTemplateIcon(template)}`.toLowerCase();
}

function getEventDropPosition(event: DragEvent, target?: HTMLElement | null): DropPosition {
  const element = target || event.currentTarget as HTMLElement | null;
  if (!element) return 'after';
  const rect = element.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function isSameCell(left: PresetDragState, goal: GoalDefinition, block: CoreBlockDefinition): boolean {
  return left.goalId === goal.id && left.blockId === block.id;
}

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
  const [presetDropCell, setPresetDropCell] = useState<PresetDropCellState | null>(null);

  useEffect(() => {
    if (!coreBlocks.length) return;
    setActiveBlockIds((previous) => {
      if (previous.size > 0) return previous;
      return new Set(coreBlocks.map((block) => block.id));
    });
  }, [coreBlocks]);

  useEffect(() => {
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      allGoalPaths.forEach((path) => next.add(path));
      return next;
    });
  }, [allGoalPaths]);

  const isBlockActive = (blockId: string): boolean => activeBlockIds.size === 0 || activeBlockIds.has(blockId);
  const visibleBlocks = useMemo(() => coreBlocks.filter((block) => isBlockActive(block.id)), [coreBlocks, activeBlockIds]);

  const visibleGoals = useMemo(() => {
    const q = normalizeSearchText(query);
    return goals.filter((goal) => {
      if (!isGoalVisibleByExpandedState(goal, expandedPaths)) return false;
      if (!q) return true;
      const goalText = `${getGoalDisplayName(goal)} ${getGoalDisplayPath(goal)} ${goal.themePath || ''}`.toLowerCase();
      if (goalText.includes(q)) return true;
      return templates.some((template) => template.goalId === goal.id && presetSearchText(template, goal).includes(q));
    });
  }, [goals, expandedPaths, query, templates]);


  const toggleTreePath = (path: string) => {
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleGoalRow = (goalId: string) => {
    setCollapsedGoalIds((previous) => {
      const next = new Set(previous);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  const toggleBlock = (blockId: string) => {
    setActiveBlockIds((previous) => {
      const next = new Set(previous);
      if (next.size === 0) coreBlocks.forEach((block) => next.add(block.id));
      if (next.has(blockId) && next.size > 1) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPaths(new Set(Array.from(allGoalPaths)));
    setCollapsedGoalIds(new Set());
  };
  const collapseAll = () => {
    setCollapsedGoalIds(new Set(goals.map((goal) => goal.id)));
  };

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
    const ok = window.confirm(`删除记录预设「${name}」？

只删除 ${cleanDisplayText(goal.goalPath || goal.title)} / ${block.name} 下的这个主题预设，不会删除已经写入的 Markdown 记录。`);
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
    if (dragGoalId === targetGoalId) return;
    const dragged = goals.find((goal) => goal.id === dragGoalId);
    const target = goals.find((goal) => goal.id === targetGoalId);
    if (!dragged || !target) return;
    const draggedParent = getGoalParentPath(dragged);
    const targetParent = getGoalParentPath(target);
    if (draggedParent !== targetParent) {
      ui.notice('当前只支持同级目标拖动排序');
      return;
    }
    const siblings = sortGoalsForMatrix(goals.filter((goal) => getGoalParentPath(goal) === draggedParent));
    const next = siblings.filter((goal) => goal.id !== dragged.id);
    const targetIndex = next.findIndex((goal) => goal.id === target.id);
    if (targetIndex < 0) return;
    next.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, dragged);
    await Promise.all(next.map((goal, index) => useCases.goal.updateGoal(goal.id, { sortOrder: index * 10 } as any)));
    ui.notice('目标排序已保存');
  };

  const reorderPresetsInCell = async (drag: PresetDragState, targetTemplateKey: string | null, position: DropPosition) => {
    const cellTemplates = sortPresets(templates.filter((template) => template.goalId === drag.goalId && template.coreBlockId === drag.blockId && template.enabled !== false), goals);
    const dragged = cellTemplates.find((template) => goalTemplateKey(template) === drag.templateKey);
    if (!dragged) return;
    const next = cellTemplates.filter((template) => goalTemplateKey(template) !== drag.templateKey);
    if (targetTemplateKey) {
      const targetIndex = next.findIndex((template) => goalTemplateKey(template) === targetTemplateKey);
      if (targetIndex >= 0) next.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, dragged);
      else next.push(dragged);
    } else {
      next.push(dragged);
    }
    await Promise.all(next.map((template, index) => useCases.goal.upsertGoalTemplate({ ...template, sortOrder: index * 10 })));
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
    const ok = window.confirm(`删除目标「${cleanDisplayText(path)}」？${suffix}\n\n会删除目标配置、该目标下的记录预设和旧目标关系；不会删除已经写入的 Markdown 记录。`);
    if (!ok) return;
    const count = typeof (useCases.goal as any).deleteGoalCascade === 'function'
      ? await (useCases.goal as any).deleteGoalCascade(goal.id)
      : (await Promise.all(targets.map((target) => useCases.goal.deleteGoal(target.id))), targets.length);
    ui.notice(descendants.length > 0 ? `已删除目标及子目标：${count} 个` : `已删除目标：${cleanDisplayText(path)}`);
  };

  const renderAddPresetButton = (goal: GoalDefinition, block: CoreBlockDefinition) => (
    <button
      type="button"
      onClick={(event: any) => {
        event.stopPropagation();
        openEditor(goal, block);
      }}
      title="添加预设"
      style={{
        width: '100%',
        height: ADD_BUTTON_HEIGHT,
        minHeight: ADD_BUTTON_HEIGHT,
        border: '1px dashed var(--background-modifier-border)',
        borderRadius: 8,
        background: 'var(--background-secondary)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        font: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
        boxShadow: 'none',
        lineHeight: 1,
      }}
    >
      ＋
    </button>
  );

  const renderPresetCard = (goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => {
    const themePath = readGoalTemplateThemePath(template, goal);
    const icon = readGoalTemplateIcon(template, themeIconByPath.get(themePath));
    const name = getPresetCardName(template, goal);
    const key = goalTemplateKey(template);
    return (
      <GoalPresetCard
        goal={goal}
        block={block}
        template={template}
        templateKey={key}
        name={name}
        icon={icon}
        themePath={themePath}
        isDragging={draggingPreset?.templateKey === key}
        onOpen={() => openEditor(goal, block, template)}
        onContextMenu={(event) => openPresetContextMenu(event, goal, block, template)}
        onDragStart={(event) => {
          event.stopPropagation();
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', key);
          }
          setDraggingPreset({ goalId: goal.id, blockId: block.id, templateKey: key });
        }}
        onDragEnd={() => {
          setDraggingPreset(null);
          setPresetDropCell(null);
        }}
      />
    );
  };

  const renderBlockCell = (goal: GoalDefinition, block: CoreBlockDefinition, collapsed: boolean) => {
    const cell = buildGoalTemplateCell(goal, block, templates);
    const presets = sortPresets(cell.enabledTemplates, goals);
    const isDropCell = presetDropCell?.goalId === goal.id && presetDropCell.blockId === block.id;
    return (
      <div
        title="＋ 添加；左键编辑；右键复制；拖动排序或移动"
        onDragEnter={(event: any) => {
          if (!draggingPreset) return;
          event.preventDefault();
          event.stopPropagation();
          if (!presetDropCell || presetDropCell.goalId !== goal.id || presetDropCell.blockId !== block.id) setPresetDropCell({ goalId: goal.id, blockId: block.id });
        }}
        onDragOver={(event: any) => {
          if (!draggingPreset) return;
          event.preventDefault();
        }}
        onDrop={(event: any) => handlePresetDropOnCell(event, goal, block)}
        style={{
          display: 'grid',
          gridAutoRows: 'min-content',
          alignContent: 'start',
          justifyItems: 'stretch',
          gap: 4,
          minHeight: ADD_BUTTON_HEIGHT + 8,
          padding: '0 4px 4px',
          borderRadius: 10,
          background: 'transparent',
          outline: isDropCell ? '2px dashed #7c3cff' : 'none',
          outlineOffset: isDropCell ? -2 : 0,
        }}
      >
        {renderAddPresetButton(goal, block)}
        {!collapsed && presets.map((template) => renderPresetCard(goal, block, template))}
      </div>
    );
  };

  const renderGroupRows = (group: GoalDefinition[], groupIndex: number) => {
    const rows: h.JSX.Element[] = [];
    if (groupIndex > 0) {
      rows.push(
        <AnyTableRow key={`spacer-${groupIndex}`}>
          <AnyTableCell colSpan={visibleBlocks.length + 1} sx={{ border: 0, p: 0, height: 10, background: 'transparent' }} />
        </AnyTableRow>
      );
    }

    group.forEach((goal, index) => {
      const path = getGoalDisplayPath(goal);
      const depth = getGoalDepth(goal);
      const hasChildren = goalHasChildren(goal, goals);
      const expanded = expandedPaths.has(path);
      const collapsed = collapsedGoalIds.has(goal.id);
      const isRoot = depth === 0;
      const goalCellBg = isRoot ? 'rgba(122, 94, 230, 0.18)' : 'rgba(122, 94, 230, 0.06)';
      const dropActive = goalDrop?.goalId === goal.id;

      rows.push(
        <AnyTableRow
          key={goal.id}
          onDragEnter={(event: any) => {
            if (!draggingGoalId || draggingGoalId === goal.id) return;
            event.preventDefault();
            setGoalDrop({ goalId: goal.id, position: getEventDropPosition(event) });
          }}
          onDragOver={(event: any) => {
            if (!draggingGoalId || draggingGoalId === goal.id) return;
            event.preventDefault();
          }}
          onDrop={async (event: any) => {
            if (!draggingGoalId || !goalDrop) return;
            event.preventDefault();
            await reorderGoalSiblings(draggingGoalId, goalDrop.goalId, goalDrop.position);
            setDraggingGoalId(null);
            setGoalDrop(null);
          }}
          onDragEnd={() => {
            setDraggingGoalId(null);
            setGoalDrop(null);
          }}
          sx={{
            boxShadow: dropActive ? `inset 0 ${goalDrop?.position === 'before' ? '3px' : '-3px'} 0 #7c3cff` : 'none',
          }}
        >
          <AnyTableCell sx={{ width: PATH_COL_WIDTH, px: 0.5, py: 0.35, position: 'sticky', left: 0, zIndex: 2, background: 'var(--background-primary)', verticalAlign: 'top' }}>
            <AnyBox
              onClick={() => toggleGoalRow(goal.id)}
              title="单击折叠/展开本目标；拖动 ☰ 排序"
              sx={{
                minHeight: `${SEGMENT_HEIGHT}px`,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
                backgroundColor: goalCellBg,
                px: isRoot ? 1 : 0.75,
                cursor: 'pointer',
              }}
            >
              <AnyBox sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, width: '100%' }}>
                <span style={{ display: 'inline-block', width: depth * 18, flexShrink: 0 }} />
                <span
                  draggable
                  onClick={(event: any) => event.stopPropagation()}
                  onMouseDown={(event: any) => event.stopPropagation()}
                  onDragStart={(event: any) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', goal.id);
                    setDraggingGoalId(goal.id);
                  }}
                  onDragEnd={() => {
                    setDraggingGoalId(null);
                    setGoalDrop(null);
                  }}
                  title="拖动目标排序"
                  style={{ color: 'var(--text-muted)', cursor: 'grab', userSelect: 'none', width: 18, textAlign: 'center', flexShrink: 0 }}
                >
                  ☰
                </span>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(event: any) => {
                      event.stopPropagation();
                      toggleTreePath(path);
                    }}
                    title="折叠/展开子目标"
                    style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', width: 18, padding: 0, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {expanded ? '▾' : '▸'}
                  </button>
                ) : <span style={{ display: 'inline-block', width: 18, flexShrink: 0 }} />}
                <span style={{ color: collapsed ? 'var(--text-muted)' : 'var(--text-faint)', width: 16, textAlign: 'center', flexShrink: 0 }}>{collapsed ? '▸' : '▾'}</span>
                <AnyBox sx={{ minWidth: 0, flex: 1 }}>
                  <AnyTypography sx={{ fontWeight: isRoot ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanDisplayText(getGoalDisplayName(goal))}</AnyTypography>
                </AnyBox>
                <button
                  type="button"
                  title="删除目标"
                  onClick={(event: any) => handleDeleteGoal(event, goal)}
                  onMouseDown={(event: any) => event.stopPropagation()}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    flexShrink: 0,
                    padding: 0,
                    margin: 0,
                  }}
                >
                  ×
                </button>
              </AnyBox>
            </AnyBox>
          </AnyTableCell>

          {visibleBlocks.map((block) => (
            <AnyTableCell key={block.id} align="center" sx={{ width: BLOCK_COL_WIDTH, minWidth: BLOCK_COL_WIDTH, px: 0.35, py: 0.35, verticalAlign: 'top' }}>
              {renderBlockCell(goal, block, collapsed)}
            </AnyTableCell>
          ))}
        </AnyTableRow>
      );
    });
    return rows;
  };

  const activeGroups = splitByRoot(visibleGoals);

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
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <AnyTable
            size="small"
            sx={{
              tableLayout: 'fixed',
              width: 'max-content',
              minWidth: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 0',
              '& th': { whiteSpace: 'nowrap', py: 0.75, px: 0.75, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'rgba(124, 60, 255, .12)' },
              '& td': { whiteSpace: 'nowrap', py: 0, px: 0.5, borderBottom: 'none', verticalAlign: 'top' },
            }}
          >
            <AnyTableHead>
              <AnyTableRow>
                <AnyTableCell sx={{ fontWeight: 'bold', width: PATH_COL_WIDTH, position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'rgba(124, 60, 255, .18)' }}>目标</AnyTableCell>
                {visibleBlocks.map((block) => (
                  <AnyTableCell key={block.id} align="center" sx={{ fontWeight: 'bold', width: BLOCK_COL_WIDTH, minWidth: BLOCK_COL_WIDTH }}>
                    {block.name}
                  </AnyTableCell>
                ))}
              </AnyTableRow>
            </AnyTableHead>
            <AnyTableBody>
              {activeGroups.length > 0 ? activeGroups.flatMap(renderGroupRows) : (
                <AnyTableRow>
                  <AnyTableCell colSpan={visibleBlocks.length + 1} sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">暂无匹配目标</Typography>
                  </AnyTableCell>
                </AnyTableRow>
              )}
            </AnyTableBody>
          </AnyTable>
        </Box>
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

function splitByRoot(goals: GoalDefinition[]): GoalDefinition[][] {
  const groups: GoalDefinition[][] = [];
  let current: GoalDefinition[] = [];
  goals.forEach((goal) => {
    if (getGoalDepth(goal) === 0) {
      if (current.length > 0) groups.push(current);
      current = [goal];
    } else if (current.length > 0) {
      current.push(goal);
    } else {
      current = [goal];
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}
