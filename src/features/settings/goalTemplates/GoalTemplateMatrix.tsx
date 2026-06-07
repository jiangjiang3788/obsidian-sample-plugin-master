/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
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
  Tooltip,
  Typography,
  CancelIcon,
  EditIcon,
  TaskAltIcon,
  WarningIcon,
} from '@shared/public';
import { getEffectiveCoreBlocks, getGoalTemplates } from '@core/public';
import type { GoalDefinition } from '@core/public';
import type { CoreBlockDefinition } from '@core/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import { GoalTemplateEditorModal } from './GoalTemplateEditorModal';
import {
  buildGoalTemplateCell,
  getGoalDepth,
  getGoalDisplayPath,
  goalHasChildren,
  isGoalVisibleByExpandedState,
  sortGoalsForMatrix,
} from './goalTemplateMatrixModel';

const AnyTable = Table as any;
const AnyTableHead = TableHead as any;
const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTableBody = TableBody as any;
const AnyTooltip = Tooltip as any;
const AnyTypography = Typography as any;
const AnyChip = Chip as any;
const AnyBox = Box as any;

const PATH_COL_WIDTH = 250;
const STATUS_COL_WIDTH = 78;
const BLOCK_COL_WIDTH = 58;
const SEGMENT_HEIGHT = 40;
const SEGMENT_RADIUS = 8;

function leaf(path: string): string {
  return String(path || '').split('/').filter(Boolean).pop() || path;
}

function normalizeSearchText(value: string): string {
  return String(value || '').toLowerCase().trim();
}

function presetName(template: { name?: string; variantId?: string }): string {
  return String(template.name || template.variantId || '未命名预设').trim() || '未命名预设';
}

function sortPresets<T extends { sortOrder?: number; isDefault?: boolean; name?: string; variantId?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    if (!!left.isDefault !== !!right.isDefault) return left.isDefault ? -1 : 1;
    const bySort = (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999);
    if (bySort !== 0) return bySort;
    return presetName(left).localeCompare(presetName(right), 'zh-CN');
  });
}

type CellKind = 'inherit' | 'override' | 'multi' | 'disabled' | 'warning' | 'active' | 'archived';

function getSurfaceForKind(kind: CellKind) {
  switch (kind) {
    case 'override':
    case 'multi':
      return { bg: 'rgba(137, 99, 255, 0.16)', color: '#7b4ce2' };
    case 'disabled':
      return { bg: 'rgba(220, 76, 76, 0.14)', color: '#c83b3b' };
    case 'warning':
      return { bg: 'rgba(230, 155, 45, 0.16)', color: '#b66a00' };
    case 'active':
      return { bg: 'rgba(88, 160, 103, 0.14)', color: '#2d8a43' };
    case 'archived':
      return { bg: 'rgba(120, 120, 120, 0.12)', color: 'var(--text-muted)' };
    case 'inherit':
    default:
      return { bg: 'rgba(96, 160, 96, 0.12)', color: '#2d8a43' };
  }
}

function getSegmentRadius(prevSame: boolean, nextSame: boolean) {
  if (prevSame && nextSame) return '0';
  if (prevSame && !nextSame) return `0 0 ${SEGMENT_RADIUS}px ${SEGMENT_RADIUS}px`;
  if (!prevSame && nextSame) return `${SEGMENT_RADIUS}px ${SEGMENT_RADIUS}px 0 0`;
  return `${SEGMENT_RADIUS}px`;
}

function renderSegment(kind: CellKind, prevSame: boolean, nextSame: boolean, content: h.JSX.Element, onClick?: () => void) {
  const surface = getSurfaceForKind(kind);
  return (
    <AnyBox
      onClick={onClick}
      sx={{
        height: `${SEGMENT_HEIGHT}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: surface.bg,
        color: surface.color,
        borderRadius: getSegmentRadius(prevSame, nextSame),
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        mx: '2px',
      }}
    >
      {content}
    </AnyBox>
  );
}

function cellKind(goal: GoalDefinition, block: CoreBlockDefinition, templates: any[]): CellKind {
  const cell = buildGoalTemplateCell(goal, block, templates);
  return cell.status as CellKind;
}

function cellTitle(goal: GoalDefinition, block: CoreBlockDefinition, templates: any[]): string {
  const cell = buildGoalTemplateCell(goal, block, templates);
  const sorted = sortPresets(cell.enabledTemplates);
  if (cell.status === 'inherit') return '继承 Block 默认记录方式，点击添加预设';
  if (cell.status === 'disabled') return '该目标下隐藏此 Block，点击管理';
  if (cell.status === 'warning') return cell.description || '预设异常，点击处理';
  if (sorted.length === 1) return `${presetName(sorted[0])}，点击管理`;
  return `${sorted.map(presetName).join(' / ')}，点击管理`;
}

function cellIcon(goal: GoalDefinition, block: CoreBlockDefinition, templates: any[]) {
  const cell = buildGoalTemplateCell(goal, block, templates);
  if (cell.status === 'disabled') return <CancelIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
  if (cell.status === 'warning') return <WarningIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
  if (cell.status === 'multi') return <AnyChip label={String(cell.enabledTemplates.length)} size="small" sx={{ fontWeight: 800, backgroundColor: 'transparent', color: 'inherit', height: '24px', '& .MuiChip-label': { px: 0 } }} />;
  if (cell.status === 'override') return <EditIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
  return <TaskAltIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
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

export function GoalTemplateMatrix() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const goals = useMemo(() => sortGoalsForMatrix((settings.goalSettings?.goals || []).filter((goal) => goal.status !== 'archived')), [settings.goalSettings?.goals]);
  const templates = useMemo(() => getGoalTemplates(settings.goalSettings), [settings.goalSettings]);
  const coreBlocks = useMemo(() => getEffectiveCoreBlocks(settings), [settings]);
  const allGoalPaths = useMemo(() => new Set(goals.map(getGoalDisplayPath)), [goals]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(Array.from(allGoalPaths)));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ goal: GoalDefinition; block: CoreBlockDefinition } | null>(null);

  const visibleGoals = useMemo(() => {
    const q = normalizeSearchText(query);
    return goals.filter((goal) => {
      if (!isGoalVisibleByExpandedState(goal, expandedPaths)) return false;
      if (!q) return true;
      const text = `${goal.title || ''} ${goal.goalPath || ''} ${goal.themePath || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [goals, expandedPaths, query]);

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

  const toggleGoalPath = (path: string) => {
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => setExpandedPaths(new Set(Array.from(allGoalPaths)));
  const collapseAll = () => setExpandedPaths(new Set(goals.filter((goal) => getGoalDepth(goal) === 0).map(getGoalDisplayPath)));

  const selectedVariants = selected
    ? templates.filter((template) => template.goalId === selected.goal.id && template.coreBlockId === selected.block.id)
    : [];

  const renderGroupRows = (group: GoalDefinition[], groupIndex: number) => {
    const rows: h.JSX.Element[] = [];
    if (groupIndex > 0) {
      rows.push(
        <AnyTableRow key={`spacer-${groupIndex}`}>
          <AnyTableCell colSpan={coreBlocks.length + 2} sx={{ border: 0, p: 0, height: 10, background: 'transparent' }} />
        </AnyTableRow>
      );
    }

    group.forEach((goal, index) => {
      const path = getGoalDisplayPath(goal);
      const depth = getGoalDepth(goal);
      const hasChildren = goalHasChildren(goal, goals);
      const expanded = expandedPaths.has(path);
      const prevGoal = index > 0 ? group[index - 1] : null;
      const nextGoal = index < group.length - 1 ? group[index + 1] : null;
      const stateKind: CellKind = goal.status === 'active' ? 'active' : 'archived';
      const prevStateKind: CellKind | null = prevGoal ? (prevGoal.status === 'active' ? 'active' : 'archived') : null;
      const nextStateKind: CellKind | null = nextGoal ? (nextGoal.status === 'active' ? 'active' : 'archived') : null;
      const isRoot = depth === 0;
      const goalCellBg = isRoot ? 'rgba(122, 94, 230, 0.22)' : 'rgba(122, 94, 230, 0.07)';

      rows.push(
        <AnyTableRow key={goal.id}>
          <AnyTableCell sx={{ width: PATH_COL_WIDTH, px: 0.5, py: 0.25 }}>
            <AnyBox sx={{ minHeight: `${SEGMENT_HEIGHT}px`, display: 'flex', alignItems: 'center', borderRadius: 2, backgroundColor: goalCellBg, px: isRoot ? 1 : 0.75 }}>
              <AnyBox sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, width: '100%' }}>
                <span style={{ display: 'inline-block', width: depth * 18, flexShrink: 0 }} />
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleGoalPath(path)}
                    title={expanded ? '折叠' : '展开'}
                    style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', width: 22 }}
                  >
                    {expanded ? '▾' : '▸'}
                  </button>
                ) : <span style={{ display: 'inline-block', width: 22, flexShrink: 0 }} />}
                <AnyBox sx={{ minWidth: 0 }}>
                  <AnyTypography sx={{ fontWeight: isRoot ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leaf(path)}</AnyTypography>
                  <AnyTypography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</AnyTypography>
                </AnyBox>
              </AnyBox>
            </AnyBox>
          </AnyTableCell>

          <AnyTableCell align="center" sx={{ width: STATUS_COL_WIDTH, px: 0.25, py: 0 }}>
            {renderSegment(
              stateKind,
              prevStateKind === stateKind,
              nextStateKind === stateKind,
              <AnyChip label={goal.status === 'active' ? '激活' : goal.status === 'paused' ? '暂停' : goal.status === 'completed' ? '完成' : '归档'} size="small" sx={{ fontWeight: 700, backgroundColor: 'transparent', color: 'inherit', height: '24px', '& .MuiChip-label': { px: 0 } }} />
            )}
          </AnyTableCell>

          {coreBlocks.map((block) => {
            const kind = cellKind(goal, block, templates);
            const prevKind = prevGoal ? cellKind(prevGoal, block, templates) : null;
            const nextKind = nextGoal ? cellKind(nextGoal, block, templates) : null;
            return (
              <AnyTableCell key={block.id} align="center" sx={{ width: BLOCK_COL_WIDTH, px: 0.25, py: 0 }}>
                <AnyTooltip title={cellTitle(goal, block, templates)}>
                  {renderSegment(
                    kind,
                    prevKind === kind,
                    nextKind === kind,
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cellIcon(goal, block, templates)}</span>,
                    () => setSelected({ goal, block })
                  )}
                </AnyTooltip>
              </AnyTableCell>
            );
          })}
        </AnyTableRow>
      );
    });
    return rows;
  };

  const activeGroups = splitByRoot(visibleGoals);

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip size="small" label={`组合 ${matrixStats.total}`} />
          <Chip size="small" label={`继承 ${matrixStats.inherit}`} />
          <Chip size="small" color="primary" label={`预设 ${matrixStats.override + matrixStats.multi}`} />
          <Chip size="small" label={`多预设 ${matrixStats.multi}`} />
          <Chip size="small" color={matrixStats.warning ? 'error' : 'default'} label={`异常 ${matrixStats.warning}`} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" label="搜索目标" value={query} onChange={(event: any) => setQuery(event.target.value)} sx={{ minWidth: 220 }} />
          <Button size="small" variant="outlined" onClick={expandAll}>展开</Button>
          <Button size="small" variant="outlined" onClick={collapseAll}>折叠</Button>
        </Box>
      </Box>

      {matrixStats.warning > 0 && (
        <Alert severity="warning">
          有 {matrixStats.warning} 个单元格存在预设异常，例如多个默认预设或多个显示预设但无默认预设。点击异常单元格处理。
        </Alert>
      )}

      {goals.length === 0 ? (
        <Alert severity="info">还没有目标。请先到“目标”导入已有目标或新建目标，然后在表格单元格里配置预设。</Alert>
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
              '& th': { whiteSpace: 'nowrap', py: 0.5, px: 0.75, borderBottom: '1px solid', borderColor: 'divider' },
              '& td': { whiteSpace: 'nowrap', py: 0, px: 0.5, borderBottom: 'none' },
            }}
          >
            <AnyTableHead>
              <AnyTableRow>
                <AnyTableCell sx={{ fontWeight: 'bold', width: PATH_COL_WIDTH }}>目标路径</AnyTableCell>
                <AnyTableCell align="center" sx={{ fontWeight: 'bold', width: STATUS_COL_WIDTH }}>状态</AnyTableCell>
                {coreBlocks.map((block) => (
                  <AnyTableCell key={block.id} align="center" sx={{ fontWeight: 'bold', width: BLOCK_COL_WIDTH, minWidth: BLOCK_COL_WIDTH }}>
                    {block.name}
                  </AnyTableCell>
                ))}
              </AnyTableRow>
            </AnyTableHead>
            <AnyTableBody>
              {activeGroups.length > 0 ? activeGroups.flatMap(renderGroupRows) : (
                <AnyTableRow>
                  <AnyTableCell colSpan={coreBlocks.length + 2} sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">暂无目标</Typography>
                  </AnyTableCell>
                </AnyTableRow>
              )}
            </AnyTableBody>
          </AnyTable>
        </Box>
      )}

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
