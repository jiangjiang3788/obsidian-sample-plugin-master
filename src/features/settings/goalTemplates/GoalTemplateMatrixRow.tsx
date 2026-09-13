/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { OverlayPortal, ThinkIcon, ThinkIconButton, useOverlayLayer } from '@shared/ui/public';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getGoalTimePresetInfo, resolveGoalIcon } from '@core/goal/public';
import { GoalTemplateMatrixCell } from './GoalTemplateMatrixCell';
import { GoalColorControl } from './GoalColorControl';
import { GoalTimePresetInput } from './GoalTimePresetInput';
import type { GoalTimePresetDraftPreviewHandler } from './GoalTimePresetInput';
import { GoalTimePresetBalanceRow, getClosedTimePresetParents } from './GoalTimePresetBalanceRow';
import {
  cleanDisplayText,
  getEventDropPosition,
  getGoalDepth,
  getGoalDisplayName,
  getGoalDisplayPath,
  goalHasChildren,
} from './goalTemplateMatrixModel';
import type { GoalDropState } from './goalTemplateMatrixModel';
export interface GoalTemplateMatrixGroupRowsProps {
  group: GoalDefinition[];
  groupIndex: number;
  goals: GoalDefinition[];
  visibleBlocks: TemplateRecordTypeDefinition[];
  templates: GoalTemplate[];
  visibleBlockCount: number;
  expandedPaths: Set<string>;
  draggingGoalPath: string | null;
  goalDrop: GoalDropState;
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalPath: string, targetGoalPath: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  handleEditGoalIcon: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => void;
  setGoalTimePresetPercent: (path: string, percent: number | null) => Promise<void>;
  setGoalWeeklyTargetMinutes: (path: string, minutes: number | null) => Promise<void>;
  setGoalColor: (path: string, color: string | null) => Promise<void>;
  previewGoals: GoalDefinition[];
  onTimePresetDraftPreview: GoalTimePresetDraftPreviewHandler;
}
function GoalTemplateAddButton({ goal, recordTypes, openEditor }: {
  goal: GoalDefinition;
  recordTypes: TemplateRecordTypeDefinition[];
  openEditor: (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlay = useOverlayLayer(open, 'goal-template-add-menu');
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 164;
      const estimatedHeight = Math.min(360, 12 + recordTypes.length * 36);
      const margin = 8;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
      const below = rect.bottom + 4;
      const top = below + estimatedHeight <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - estimatedHeight - 4);
      setPosition({ top, left });
    };
    updatePosition();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, recordTypes.length]);
  if (recordTypes.length === 0) return null;
  return (
    <span className="think-goal-template-matrix__add">
      <button
        ref={buttonRef}
        type="button"
        className="think-goal-template-matrix__add-button"
        aria-label="添加模板"
        aria-haspopup="menu"
        aria-expanded={open}
        title="添加模板"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      >
        <ThinkIcon name="plus" />
      </button>
      {open ? (
        <OverlayPortal>
          <div
            className="think-os think-os--settings think-goal-template-matrix__add-menu-layer"
            style={{ zIndex: overlay.zIndex } as any}
            onMouseDown={() => setOpen(false)}
          >
            <div
              className="think-goal-template-matrix__add-menu"
              role="menu"
              aria-label={`给 ${goal.path} 添加模板`}
              style={{ top: position.top, left: position.left } as any}
              onMouseDown={(event: MouseEvent) => {
                event.stopPropagation();
                overlay.focus();
              }}
            >
              {recordTypes.map((recordType) => (
                <button
                  key={recordType.id}
                  type="button"
                  role="menuitem"
                  className="think-goal-template-matrix__add-option"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                    openEditor(goal, recordType, null);
                  }}
                >
                  <span>{recordType.name}</span>
                </button>
              ))}
            </div>
          </div>
        </OverlayPortal>
      ) : null}
    </span>
  );
}
function GoalDragHandle({ goal, setDraggingGoalPath, setGoalDrop }: {
  goal: GoalDefinition;
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
}) {
  return (
    <span
      className="think-goal-template-matrix__drag-handle"
      draggable
      onClick={(event: MouseEvent) => event.stopPropagation()}
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      onDragStart={(event: DragEvent) => {
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', goal.path);
        }
        setDraggingGoalPath(goal.path);
      }}
      onDragEnd={() => {
        setDraggingGoalPath(null);
        setGoalDrop(null);
      }}
      title="拖动目标排序"
    >
      <ThinkIcon name="grip-vertical" />
    </span>
  );
}

function TreeToggle({ hasChildren, expanded, path, toggleTreePath }: {
  hasChildren: boolean;
  expanded: boolean;
  path: string;
  toggleTreePath: (path: string) => void;
}) {
  if (!hasChildren) return <span className="think-goal-template-matrix__tree-spacer" />;
  return (
    <ThinkIconButton
      className="think-goal-template-matrix__tree-toggle"
      size="sm"
      label={expanded ? '折叠子目标' : '展开子目标'}
      icon={<ThinkIcon name={expanded ? 'chevron-down' : 'chevron-right'} />}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        toggleTreePath(path);
      }}
    />
  );
}

function GoalPathCell(props: {
  goal: GoalDefinition;
  goals: GoalDefinition[];
  expandedPaths: Set<string>;
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleTreePath: (path: string) => void;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  handleEditGoalIcon: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  visibleBlocks: TemplateRecordTypeDefinition[];
  templates: GoalTemplate[];
  openEditor: (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => void;
  setGoalTimePresetPercent: (path: string, percent: number | null) => Promise<void>;
  setGoalWeeklyTargetMinutes: (path: string, minutes: number | null) => Promise<void>;
  setGoalColor: (path: string, color: string | null) => Promise<void>;
  onTimePresetDraftPreview: GoalTimePresetDraftPreviewHandler;
}) {
  const { goal, goals, expandedPaths, setDraggingGoalPath, setGoalDrop, toggleTreePath, handleDeleteGoal, handleEditGoalIcon, visibleBlocks, templates, openEditor, setGoalTimePresetPercent, setGoalWeeklyTargetMinutes, setGoalColor, onTimePresetDraftPreview } = props;
  const path = getGoalDisplayPath(goal);
  const depth = getGoalDepth(goal);
  const hasChildren = goalHasChildren(goal, goals);
  const expanded = expandedPaths.has(path);
  const isRoot = depth === 0;
  const configured = new Set(templates.filter((template) => template.goalPath === path).map((template) => template.recordTypeId));
  const addableRecordTypes = visibleBlocks.filter((recordType) => !configured.has(recordType.id));

  return (
    <td className="think-goal-template-matrix__path-cell">
      <div
        className={`think-goal-template-matrix__goal${isRoot ? ' is-root' : ''}`}
        title={hasChildren ? '使用箭头展开/折叠子目标；拖动排序' : '拖动排序'}
      >
        <span className="think-goal-template-matrix__indent" style={{ '--think-goal-depth': depth } as any} />
        <GoalDragHandle goal={goal} setDraggingGoalPath={setDraggingGoalPath} setGoalDrop={setGoalDrop} />
        <TreeToggle hasChildren={hasChildren} expanded={expanded} path={path} toggleTreePath={toggleTreePath} />
        <button
          type="button"
          className="think-goal-template-matrix__goal-icon"
          aria-label={`修改 ${path} 的目标图标`}
          title="修改目标图标"
          onClick={(event: MouseEvent) => handleEditGoalIcon(event, goal)}
          onMouseDown={(event: MouseEvent) => event.stopPropagation()}
        >
          {resolveGoalIcon(goal) || '＋'}
        </button>
        <GoalColorControl goal={goal} setGoalColor={setGoalColor} />
        <span
          className="think-goal-template-matrix__goal-name"
          title="双击修改目标图标"
          onDblClick={(event: MouseEvent) => handleEditGoalIcon(event, goal)}
        >
          {cleanDisplayText(getGoalDisplayName(goal))}
        </span>
        <GoalTimePresetInput goal={goal} goals={goals} onRootCommit={setGoalTimePresetPercent} onChildCommit={setGoalWeeklyTargetMinutes} onDraftPreview={onTimePresetDraftPreview} />
        <GoalTemplateAddButton goal={goal} recordTypes={addableRecordTypes} openEditor={openEditor} />
        <ThinkIconButton
          className="think-goal-template-matrix__delete"
          size="sm"
          tone="danger"
          label="删除目标"
          icon={<ThinkIcon name="trash-2" />}
          onClick={(event: MouseEvent) => handleDeleteGoal(event, goal)}
          onMouseDown={(event: MouseEvent) => event.stopPropagation()}
        />
      </div>
    </td>
  );
}

function GoalTemplateMatrixGoalRow(props: GoalTemplateMatrixGroupRowsProps & { goal: GoalDefinition }) {
  const { goal, goals, visibleBlocks, templates, expandedPaths, draggingGoalPath, goalDrop, setDraggingGoalPath, setGoalDrop, toggleTreePath, reorderGoalSiblings, handleDeleteGoal, handleEditGoalIcon, openEditor, setGoalTimePresetPercent, setGoalWeeklyTargetMinutes, setGoalColor, onTimePresetDraftPreview } = props;
  const dropActive = goalDrop?.goalPath === getGoalDisplayPath(goal);

  return (
    <tr
      key={goal.path}
      className={dropActive ? `think-goal-template-matrix__goal-row is-drop-${goalDrop?.position}` : 'think-goal-template-matrix__goal-row'}
      onDragEnter={(event: DragEvent) => {
        if (!draggingGoalPath || draggingGoalPath === goal.path) return;
        event.preventDefault();
        setGoalDrop({ goalPath: getGoalDisplayPath(goal), position: getEventDropPosition(event) });
      }}
      onDragOver={(event: DragEvent) => {
        if (!draggingGoalPath || draggingGoalPath === goal.path) return;
        event.preventDefault();
      }}
      onDrop={async (event: DragEvent) => {
        if (!draggingGoalPath || !goalDrop) return;
        event.preventDefault();
        await reorderGoalSiblings(draggingGoalPath, goals.find((item) => getGoalDisplayPath(item) === goalDrop.goalPath)?.path || goal.path, goalDrop.position);
        setDraggingGoalPath(null);
        setGoalDrop(null);
      }}
      onDragEnd={() => {
        setDraggingGoalPath(null);
        setGoalDrop(null);
      }}
    >
      <GoalPathCell
        goal={goal}
        goals={goals}
        expandedPaths={expandedPaths}
        setDraggingGoalPath={setDraggingGoalPath}
        setGoalDrop={setGoalDrop}
        toggleTreePath={toggleTreePath}
        handleDeleteGoal={handleDeleteGoal}
        handleEditGoalIcon={handleEditGoalIcon}
        visibleBlocks={visibleBlocks}
        templates={templates}
        openEditor={openEditor}
        setGoalTimePresetPercent={setGoalTimePresetPercent}
        setGoalWeeklyTargetMinutes={setGoalWeeklyTargetMinutes}
        setGoalColor={setGoalColor}
        onTimePresetDraftPreview={onTimePresetDraftPreview}
      />
      {visibleBlocks.map((block) => (
        <td key={block.id} className="think-goal-template-matrix__block-cell">
          <GoalTemplateMatrixCell goal={goal} block={block} templates={templates} openEditor={openEditor} />
        </td>
      ))}
    </tr>
  );
}

export function GoalTemplateMatrixGroupRows(props: GoalTemplateMatrixGroupRowsProps): h.JSX.Element[] {
  const rows: h.JSX.Element[] = [];
  if (props.groupIndex > 0) {
    rows.push(
      <tr key={`spacer-${props.groupIndex}`} className="think-goal-template-matrix__spacer-row">
        <td colSpan={props.visibleBlockCount + 1} />
      </tr>,
    );
  }
  props.group.forEach((goal, index) => {
    rows.push(<GoalTemplateMatrixGoalRow key={goal.path} {...props} goal={goal} />);
    const next = props.group[index + 1];
    getClosedTimePresetParents(goal, next, props.previewGoals).forEach((parent) => {
      const parentPath = getGoalDisplayPath(parent);
      if (!props.expandedPaths.has(parentPath)) return;
      const info = getGoalTimePresetInfo(parent.path, props.previewGoals);
      if (!info?.configured || info.directChildrenCount <= 0) return;
      rows.push(
        <GoalTimePresetBalanceRow
          key={`balance-${parent.path}-${index}`}
          goal={parent}
          goals={props.previewGoals}
          visibleBlocks={props.visibleBlocks}
        />,
      );
    });
  });
  return rows;
}
