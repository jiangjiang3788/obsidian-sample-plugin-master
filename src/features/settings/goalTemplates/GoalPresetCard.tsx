/** @jsxImportSource preact */
import { h } from 'preact';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';

const PRESET_CARD_HEIGHT = 30;

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
      role="button"
      tabIndex={0}
      title={`${name}${themePath ? ` · ${themePath}` : ''}\n左键：编辑；右键：复制/删除；拖动 ☰：排序或移动到其它目标/记录类型`}
      onClick={onOpen}
      onContextMenu={onContextMenu as any}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '14px 18px minmax(0, 1fr)',
        alignItems: 'center',
        gap: 4,
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
        onDragStart={onDragStart as any}
        onDragEnd={onDragEnd as any}
        title="拖动预设排序或移动"
        style={{ color: 'var(--text-muted)', cursor: 'grab', userSelect: 'none', textAlign: 'center', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
      >
        ☰
      </span>
      <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{icon || '◇'}</span>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 700, lineHeight: 1.2 }}>{name}</span>
    </div>
  );
}
