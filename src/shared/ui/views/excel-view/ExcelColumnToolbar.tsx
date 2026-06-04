/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { SimpleSelect } from '../../composites/SimpleSelect';
import type { ExcelColumnToolbarProps } from './types';

function moveItem(fields: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex) return fields;
  if (fromIndex < 0 || fromIndex >= fields.length) return fields;
  if (toIndex < 0 || toIndex >= fields.length) return fields;
  const next = [...fields];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

interface ColumnMenuState {
  field: string;
  x: number;
  y: number;
  showInfo?: boolean;
}

export function ExcelColumnToolbar({
  fields,
  availableFields,
  disabled = false,
  saving = false,
  error,
  getFieldLabel = (field: string) => field,
  getFieldGroupLabel,
  onFieldsChange,
}: ExcelColumnToolbarProps) {
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [menu, setMenu] = useState<ColumnMenuState | null>(null);
  const canEdit = !!onFieldsChange && !disabled;
  const busy = saving || disabled;

  const availableOptions = useMemo(() => {
    const selected = new Set(fields);
    return availableFields
      .filter(field => !selected.has(field))
      .map(field => ({
        value: field,
        label: getFieldLabel(field),
        group: getFieldGroupLabel?.(field),
      }));
  }, [availableFields, fields, getFieldGroupLabel, getFieldLabel]);

  const emit = (nextFields: string[]) => {
    if (!canEdit || busy) return;
    onFieldsChange?.(nextFields);
  };

  const closeMenu = () => setMenu(null);

  const addField = (field: string) => {
    if (!field || fields.includes(field)) return;
    emit([...fields, field]);
  };

  const removeField = (field: string) => {
    if (fields.length <= 1) return;
    emit(fields.filter(item => item !== field));
    closeMenu();
  };

  const moveFieldToStart = (field: string) => {
    const index = fields.indexOf(field);
    if (index <= 0) return closeMenu();
    emit(moveItem(fields, index, 0));
    closeMenu();
  };

  const moveFieldToEnd = (field: string) => {
    const index = fields.indexOf(field);
    if (index < 0 || index === fields.length - 1) return closeMenu();
    emit(moveItem(fields, index, fields.length - 1));
    closeMenu();
  };

  const dropField = (targetField: string) => {
    const sourceField = draggedField;
    setDraggedField(null);
    if (!sourceField || sourceField === targetField) return;
    emit(moveItem(fields, fields.indexOf(sourceField), fields.indexOf(targetField)));
  };

  const openMenu = (event: MouseEvent, field: string) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ field, x: event.clientX, y: event.clientY });
  };

  const menuField = menu?.field;
  const menuLabel = menuField ? getFieldLabel(menuField) : '';
  const menuGroup = menuField ? getFieldGroupLabel?.(menuField) : undefined;
  const canRemoveMenuField = !!menuField && canEdit && !busy && fields.length > 1;
  return (
    <div
      class="excel-column-toolbar"
      data-editable={canEdit ? 'true' : 'false'}
      aria-label="Excel 显示字段编辑"
      onClick={() => menu ? closeMenu() : undefined}
    >
      <span class="excel-column-toolbar-title">显示字段</span>
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
              onContextMenu={(event: MouseEvent) => openMenu(event, field)}
              onDblClick={(event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                if (canRemove) removeField(field);
              }}
              onDragStart={(event: DragEvent) => {
                if (!canEdit || busy) return;
                setDraggedField(field);
                event.dataTransfer?.setData('text/plain', field);
                if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setDraggedField(null)}
              onDragOver={(event: DragEvent) => {
                if (!canEdit || busy || !draggedField) return;
                event.preventDefault();
                if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                if (!canEdit || busy) return;
                dropField(field);
              }}
            >
              <span class="excel-column-chip-handle" aria-hidden="true">⋮⋮</span>
              <span class="excel-column-chip-label">{label}</span>
            </span>
          );
        })}
      </div>
      {canEdit ? (
        <div class="excel-column-add-field">
          <SimpleSelect
            value=""
            options={availableOptions}
            placeholder={availableOptions.length ? '+ 添加字段' : '所有字段已显示'}
            disabled={busy || !availableOptions.length}
            onChange={addField}
            sx={{ minWidth: '150px' }}
          />
        </div>
      ) : (
        <span class="excel-column-toolbar-readonly">字段配置只读</span>
      )}
      {saving ? <span class="excel-column-toolbar-status">保存字段设置中…</span> : null}
      {error ? <span class="excel-column-toolbar-error" title={error}>{error}</span> : null}
      {menu && menuField ? (
        <div
          class="excel-column-context-menu"
          style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
          role="menu"
          onMouseDown={(event: MouseEvent) => event.stopPropagation()}
          onClick={(event: MouseEvent) => event.stopPropagation()}
        >
          <div class="excel-column-context-menu-title">{menuLabel}</div>
          <button type="button" role="menuitem" disabled={!canRemoveMenuField} onClick={() => removeField(menuField)}>隐藏此列</button>
          <button type="button" role="menuitem" disabled={!canEdit || busy || fields.indexOf(menuField) <= 0} onClick={() => moveFieldToStart(menuField)}>移到最前</button>
          <button type="button" role="menuitem" disabled={!canEdit || busy || fields.indexOf(menuField) === fields.length - 1} onClick={() => moveFieldToEnd(menuField)}>移到最后</button>
          <button type="button" role="menuitem" onClick={() => setMenu(prev => prev ? { ...prev, showInfo: !prev.showInfo } : prev)}>查看字段说明</button>
          {menu.showInfo ? (
            <div class="excel-column-context-info">
              <div><span>名称</span><strong>{menuLabel}</strong></div>
              {menuGroup ? <div><span>分组</span><strong>{menuGroup}</strong></div> : null}
              <div><span>字段键</span><code>{menuField}</code></div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
