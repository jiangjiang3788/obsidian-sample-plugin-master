/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@shared/public';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';
import { GoalPresetCard } from './GoalPresetCard';
import { readGoalTemplateIcon, readGoalTemplateThemePath } from './goalTemplateCopy';
import {
  buildGoalTemplateCell,
  cleanDisplayText,
  getEventDropPosition,
  getGoalDepth,
  getGoalDisplayName,
  getGoalDisplayPath,
  getPresetCardName,
  goalHasChildren,
  goalTemplateKey,
  sortPresets,
  splitGoalsByRoot,
} from './goalTemplateMatrixModel';
import type { GoalDropState, PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

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

export interface GoalTemplateMatrixTableProps {
  visibleGoals: GoalDefinition[];
  goals: GoalDefinition[];
  visibleBlocks: CoreBlockDefinition[];
  templates: GoalTemplate[];
  themeIconByPath: Map<string, string>;
  expandedPaths: Set<string>;
  collapsedGoalIds: Set<string>;
  draggingGoalId: string | null;
  goalDrop: GoalDropState;
  draggingPreset: PresetDragState | null;
  presetDropCell: PresetDropCellState;
  setDraggingGoalId: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  setDraggingPreset: (value: PresetDragState | null) => void;
  setPresetDropCell: (value: PresetDropCellState) => void;
  toggleGoalRow: (goalId: string) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalId: string, targetGoalId: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  handlePresetDropOnCell: (event: DragEvent, goal: GoalDefinition, block: CoreBlockDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
  openPresetContextMenu: (event: MouseEvent, goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => void;
}

export function GoalTemplateMatrixTable(props: GoalTemplateMatrixTableProps) {
  const {
    visibleGoals,
    goals,
    visibleBlocks,
    templates,
    themeIconByPath,
    expandedPaths,
    collapsedGoalIds,
    draggingGoalId,
    goalDrop,
    draggingPreset,
    presetDropCell,
    setDraggingGoalId,
    setGoalDrop,
    setDraggingPreset,
    setPresetDropCell,
    toggleGoalRow,
    toggleTreePath,
    reorderGoalSiblings,
    handleDeleteGoal,
    handlePresetDropOnCell,
    openEditor,
    openPresetContextMenu,
  } = props;

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

    group.forEach((goal) => {
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

  const activeGroups = splitGoalsByRoot(visibleGoals);

  return (
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
  );
}
