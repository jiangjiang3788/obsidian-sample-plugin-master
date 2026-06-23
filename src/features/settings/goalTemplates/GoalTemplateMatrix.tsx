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
import { getEffectiveCoreBlocks, getGoalTemplates } from '@core/public';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';
import { selectSettings, useSelector, useUiPort, useUseCases } from '@/app/public';
import { GoalTemplateEditorModal } from './GoalTemplateEditorModal';
import { GoalTemplateContextMenu } from './GoalTemplateContextMenu';
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
const AnyChip = Chip as any;
const AnyBox = Box as any;

const PATH_COL_WIDTH = 250;
const STATUS_COL_WIDTH = 74;
const BLOCK_COL_WIDTH = 170;
const SEGMENT_HEIGHT = 40;
const SEGMENT_RADIUS = 8;
const ADD_BUTTON_HEIGHT = SEGMENT_HEIGHT;
const PRESET_CARD_HEIGHT = 34;

type ContextMenuState = {
  x: number;
  y: number;
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
};

type CellKind = 'inherit' | 'override' | 'multi' | 'disabled' | 'warning' | 'active' | 'archived';
type DropPosition = 'before' | 'after';

type GoalDropState = { goalId: string; position: DropPosition } | null;
type PresetDragState = { goalId: string; blockId: string; templateKey: string } | null;
type PresetDropCellState = { goalId: string; blockId: string } | null;

function normalizeSearchText(value: string): string {
  return String(value || '').toLowerCase().trim();
}

function cleanDisplayText(value: unknown): string {
  return String(value ?? '').replace(/^[#＃]+\s*/, '').trim();
}

function goalTemplateKey(template: GoalTemplate): string {
  return template.id || `${template.goalId}:${template.coreBlockId}:${template.variantId || 'default'}`;
}

function goalTemplateVariantId(template: GoalTemplate): string {
  return String(template.variantId || 'default').trim() || 'default';
}

function sortPresets<T extends { sortOrder?: number; name?: string; variantId?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const bySort = (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999);
    if (bySort !== 0) return bySort;
    return getGoalTemplateDisplayName(left as any).localeCompare(getGoalTemplateDisplayName(right as any), 'zh-CN');
  });
}

function getSurfaceForKind(kind: CellKind) {
  switch (kind) {
    case 'active':
      return { bg: 'rgba(88, 160, 103, 0.14)', color: '#2d8a43' };
    case 'archived':
      return { bg: 'rgba(120, 120, 120, 0.12)', color: 'var(--text-muted)' };
    case 'warning':
      return { bg: 'rgba(230, 155, 45, 0.10)', color: '#b66a00' };
    case 'disabled':
      return { bg: 'transparent', color: '#c83b3b' };
    case 'multi':
    case 'override':
    case 'inherit':
    default:
      return { bg: 'transparent', color: '#2d8a43' };
  }
}

function getSegmentRadius(prevSame: boolean, nextSame: boolean) {
  if (prevSame && nextSame) return '0';
  if (prevSame && !nextSame) return `0 0 ${SEGMENT_RADIUS}px ${SEGMENT_RADIUS}px`;
  if (!prevSame && nextSame) return `${SEGMENT_RADIUS}px ${SEGMENT_RADIUS}px 0 0`;
  return `${SEGMENT_RADIUS}px`;
}

function renderStatusSegment(kind: CellKind, prevSame: boolean, nextSame: boolean, content: h.JSX.Element) {
  const surface = getSurfaceForKind(kind);
  return (
    <AnyBox
      sx={{
        height: `${SEGMENT_HEIGHT}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: surface.bg,
        color: surface.color,
        borderRadius: getSegmentRadius(prevSame, nextSame),
        userSelect: 'none',
        mx: '2px',
      }}
    >
      {content}
    </AnyBox>
  );
}

function statusLabel(goal: GoalDefinition): string {
  if (goal.status === 'active') return '激活';
  if (goal.status === 'paused') return '暂停';
  if (goal.status === 'completed') return '完成';
  return '归档';
}

function buildThemeIconMap(settings: any): Map<string, string> {
  const map = new Map<string, string>();
  for (const theme of settings.inputSettings?.themes || []) {
    if (theme?.path) map.set(String(theme.path), String(theme.icon || ''));
  }
  return map;
}

function presetSearchText(template: GoalTemplate, goal: GoalDefinition): string {
  return `${getGoalTemplateDisplayName(template)} ${readGoalTemplateThemePath(template, goal)} ${readGoalTemplateIcon(template)}`.toLowerCase();
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
  const [selected, setSelected] = useState<{ goal: GoalDefinition; block: CoreBlockDefinition } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
  const [goalDrop, setGoalDrop] = useState<GoalDropState>(null);
  const [draggingPreset, setDraggingPreset] = useState<PresetDragState>(null);
  const [presetDropCell, setPresetDropCell] = useState<PresetDropCellState>(null);

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

  const matrixStats = useMemo(() => {
    let inherit = 0;
    let override = 0;
    let multi = 0;
    let disabled = 0;
    let warning = 0;
    for (const goal of goals) {
      for (const block of coreBlocks) {
        const cell = buildGoalTemplateCell(goal, block, templates);
        if (cell.status === 'inherit') inherit += 1;
        if (cell.status === 'override') override += 1;
        if (cell.status === 'multi') multi += 1;
        if (cell.status === 'disabled') disabled += 1;
        if (cell.status === 'warning') warning += 1;
      }
    }
    return { inherit, override, multi, disabled, warning, total: goals.length * coreBlocks.length };
  }, [goals, coreBlocks, templates]);

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

  const openEditor = (goal: GoalDefinition, block: CoreBlockDefinition) => setSelected({ goal, block });

  const openPresetContextMenu = (event: MouseEvent, goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, goal, block, template });
  };

  const copyContextTemplateToBlock = async (targetBlock: CoreBlockDefinition) => {
    if (!contextMenu) return;
    const existing = findExistingTemplateForTheme(templates, contextMenu.goal, targetBlock, contextMenu.template);
    if (existing) {
      openEditor(contextMenu.goal, targetBlock);
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
    ui.notice(`已创建：${targetBlock.name} / ${getGoalTemplateDisplayName(copied)}`);
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
    const cellTemplates = sortPresets(templates.filter((template) => template.goalId === drag.goalId && template.coreBlockId === drag.blockId && template.enabled !== false));
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

    const targetTemplates = sortPresets(templates.filter((template) => template.goalId === targetGoal.id && template.coreBlockId === targetBlock.id && template.enabled !== false));
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
    const name = getGoalTemplateDisplayName(template);
    const key = goalTemplateKey(template);
    const isDragging = draggingPreset?.templateKey === key;
    return (
      <div
        key={key}
        data-goal-template-key={key}
        role="button"
        tabIndex={0}
        title={`${name}${themePath ? ` · ${themePath}` : ''}\n左键：编辑；右键/⋯：复制到其它 Block；拖动 ☰：排序或移动到其它目标/Block`}
        onClick={() => openEditor(goal, block)}
        onContextMenu={(event: any) => openPresetContextMenu(event, goal, block, template)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '16px 20px minmax(0, 1fr) 18px',
          alignItems: 'center',
          gap: 5,
          border: '1px solid var(--background-modifier-border)',
          borderRadius: 8,
          background: 'var(--background-primary)',
          color: 'var(--text-normal)',
          minHeight: PRESET_CARD_HEIGHT,
          height: PRESET_CARD_HEIGHT,
          padding: '0 6px',
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'left',
          opacity: isDragging ? 0.48 : 1,
          boxShadow: 'none',
          userSelect: 'none',
        }}
      >
        <span
          draggable
          onMouseDown={(event: any) => event.stopPropagation()}
          onClick={(event: any) => event.stopPropagation()}
          onDragStart={(event: any) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', key);
            setDraggingPreset({ goalId: goal.id, blockId: block.id, templateKey: key });
          }}
          onDragEnd={() => {
            setDraggingPreset(null);
            setPresetDropCell(null);
          }}
          title="拖动预设排序或移动"
          style={{ color: 'var(--text-muted)', cursor: 'grab', userSelect: 'none', textAlign: 'center', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
        >
          ☰
        </span>
        <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{icon || '◇'}</span>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 700, lineHeight: 1.2 }}>{name}</span>
        <button
          type="button"
          title="打开复制菜单"
          onMouseDown={(event: any) => {
            event.preventDefault();
            event.stopPropagation();
            setContextMenu({ x: event.clientX, y: event.clientY, goal, block, template });
          }}
          onClick={(event: any) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          style={{
            all: 'unset',
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 700,
            lineHeight: '18px',
            borderRadius: 4,
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          ⋯
        </button>
      </div>
    );
  };

  const renderBlockCell = (goal: GoalDefinition, block: CoreBlockDefinition, collapsed: boolean) => {
    const cell = buildGoalTemplateCell(goal, block, templates);
    const presets = sortPresets(cell.enabledTemplates);
    const isDropCell = presetDropCell?.goalId === goal.id && presetDropCell.blockId === block.id;
    return (
      <div
        title="顶部 ＋ 添加预设；卡片左键编辑；右键/⋯ 复制；拖动 ☰ 排序或移动到其它目标/Block"
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
          gap: 5,
          minHeight: ADD_BUTTON_HEIGHT + 8,
          padding: 4,
          borderRadius: 10,
          background: 'transparent',
          outline: isDropCell ? '2px dashed #7c3cff' : cell.status === 'warning' ? '1px solid rgba(230, 155, 45, .45)' : 'none',
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
          <AnyTableCell colSpan={visibleBlocks.length + 2} sx={{ border: 0, p: 0, height: 10, background: 'transparent' }} />
        </AnyTableRow>
      );
    }

    group.forEach((goal, index) => {
      const path = getGoalDisplayPath(goal);
      const depth = getGoalDepth(goal);
      const hasChildren = goalHasChildren(goal, goals);
      const expanded = expandedPaths.has(path);
      const collapsed = collapsedGoalIds.has(goal.id);
      const prevGoal = index > 0 ? group[index - 1] : null;
      const nextGoal = index < group.length - 1 ? group[index + 1] : null;
      const stateKind: CellKind = goal.status === 'active' ? 'active' : 'archived';
      const prevStateKind: CellKind | null = prevGoal ? (prevGoal.status === 'active' ? 'active' : 'archived') : null;
      const nextStateKind: CellKind | null = nextGoal ? (nextGoal.status === 'active' ? 'active' : 'archived') : null;
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
                <AnyBox sx={{ minWidth: 0 }}>
                  <AnyTypography sx={{ fontWeight: isRoot ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanDisplayText(getGoalDisplayName(goal))}</AnyTypography>
                </AnyBox>
              </AnyBox>
            </AnyBox>
          </AnyTableCell>

          <AnyTableCell align="center" sx={{ width: STATUS_COL_WIDTH, px: 0.25, py: 0.35, verticalAlign: 'top' }}>
            {renderStatusSegment(
              stateKind,
              prevStateKind === stateKind,
              nextStateKind === stateKind,
              <AnyChip label={statusLabel(goal)} size="small" sx={{ fontWeight: 700, backgroundColor: 'transparent', color: 'inherit', height: '24px', '& .MuiChip-label': { px: 0 } }} />
            )}
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
          <TextField size="small" label="搜索目标 / 主题 / 预设" value={query} onChange={(event: any) => setQuery(event.target.value)} sx={{ minWidth: 260 }} />
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

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip size="small" label={`目标 ${goals.length}`} />
        <Chip size="small" label={`Block ${coreBlocks.length}`} />
        <Chip size="small" color="primary" label={`有预设 ${matrixStats.override + matrixStats.multi}`} />
        <Chip size="small" label={`多预设 ${matrixStats.multi}`} />
        <Chip size="small" variant="outlined" label={`继承默认 ${matrixStats.inherit}`} />
      </Box>

      {matrixStats.warning > 0 && (
        <Alert severity="warning">
          有 {matrixStats.warning} 个单元格存在预设异常，例如多个默认预设。点击异常单元格处理。
        </Alert>
      )}

      {goals.length === 0 ? (
        <Alert severity="info">还没有目标。请先到“目标”新建目标，然后在表格单元格里配置记录预设。</Alert>
      ) : coreBlocks.length === 0 ? (
        <Alert severity="info">还没有启用的 Block。请先在快速输入设置里启用固定 Block。</Alert>
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
                <AnyTableCell align="center" sx={{ fontWeight: 'bold', width: STATUS_COL_WIDTH }}>状态</AnyTableCell>
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
                  <AnyTableCell colSpan={visibleBlocks.length + 2} sx={{ py: 2 }}>
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
      />

      <GoalTemplateEditorModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        goal={selected?.goal || null}
        block={selected?.block || null}
        variants={selectedVariants}
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
