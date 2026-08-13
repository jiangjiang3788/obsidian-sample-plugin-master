/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkIcon } from '@shared/ui/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';

interface GoalPresetCardProps {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
  templateKey: string;
  name: string;
  icon?: string;
  themePath?: string;
  isDragging?: boolean;
  onOpen: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}

export function GoalPresetCard({
  templateKey,
  name,
  icon,
  themePath,
  isDragging = false,
  onOpen,
  onContextMenu,
  onDragStart,
  onDragEnd,
}: GoalPresetCardProps) {
  return (
    <div
      key={templateKey}
      data-goal-template-key={templateKey}
      className={`think-goal-preset${isDragging ? ' is-dragging' : ''}`}
      role="button"
      tabIndex={0}
      title={`${name}${themePath ? ` · ${themePath}` : ''}\n左键编辑；右键更多；拖动排序或移动`}
      onClick={onOpen}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      onContextMenu={onContextMenu as any}
    >
      <span
        className="think-goal-preset__drag"
        draggable
        onMouseDown={(event: MouseEvent) => event.stopPropagation()}
        onClick={(event: MouseEvent) => event.stopPropagation()}
        onDragStart={onDragStart as any}
        onDragEnd={onDragEnd as any}
        title="拖动预设排序或移动"
      >
        <ThinkIcon name="grip-vertical" />
      </span>
      <span className="think-goal-preset__icon">{icon || '◇'}</span>
      <span className="think-goal-preset__name">{name}</span>
    </div>
  );
}
