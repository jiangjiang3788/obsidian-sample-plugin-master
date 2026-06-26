/** @jsxImportSource preact */
import { h } from 'preact';

export interface ExcelColumnChipListProps {
  fields: string[];
  canEdit: boolean;
  busy: boolean;
  draggedField: string | null;
  getFieldLabel: (field: string) => string;
  onOpenMenu(event: MouseEvent, field: string): void;
  onRemoveField(field: string): void;
  onDragStart(field: string): void;
  onDragEnd(): void;
  onDropField(field: string): void;
}

export function ExcelColumnChipList({
  fields,
  canEdit,
  busy,
  draggedField,
  getFieldLabel,
  onOpenMenu,
  onRemoveField,
  onDragStart,
  onDragEnd,
  onDropField,
}: ExcelColumnChipListProps) {
  return (
    <div class="excel-column-chip-list" role="list" aria-label="当前显示字段顺序">
      {fields.map((field) => {
        const label = getFieldLabel(field);
        const canRemove = canEdit && !busy && fields.length > 1;
        return (
          <span
            key={field}
            class={`excel-column-chip ${draggedField === field ? 'is-dragging' : ''}`}
            role="listitem"
            draggable={canEdit && !busy}
            title={canEdit
              ? (canRemove ? '拖动调整列顺序；双击隐藏该列；右键更多操作' : '至少保留一个显示字段')
              : '当前字段配置不可直接编辑'}
            onContextMenu={(event: MouseEvent) => onOpenMenu(event, field)}
            onDblClick={(event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              if (canRemove) onRemoveField(field);
            }}
            onDragStart={(event: DragEvent) => {
              if (!canEdit || busy) return;
              onDragStart(field);
              event.dataTransfer?.setData('text/plain', field);
              if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={onDragEnd}
            onDragOver={(event: DragEvent) => {
              if (!canEdit || busy || !draggedField) return;
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event: DragEvent) => {
              event.preventDefault();
              if (!canEdit || busy) return;
              onDropField(field);
            }}
          >
            <span class="excel-column-chip-handle" aria-hidden="true">⋮⋮</span>
            <span class="excel-column-chip-label">{label}</span>
          </span>
        );
      })}
    </div>
  );
}
