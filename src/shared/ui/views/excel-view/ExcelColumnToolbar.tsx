/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { SimpleSelect } from '../../composites/SimpleSelect';
import type { ExcelColumnToolbarProps } from './types';
import { ExcelColumnChipList } from './ExcelColumnChipList';
import { ExcelColumnContextMenu } from './ExcelColumnContextMenu';
import type { ExcelColumnMenuState } from './ExcelColumnToolbarModel';
import {
  addExcelColumnField,
  buildExcelColumnAvailableOptions,
  buildExcelColumnMenuModel,
  moveExcelColumnFieldToEnd,
  moveExcelColumnFieldToStart,
  removeExcelColumnField,
  reorderExcelColumnFieldsByDrop,
} from './ExcelColumnToolbarModel';

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
  const [menu, setMenu] = useState<ExcelColumnMenuState | null>(null);
  const canEdit = !!onFieldsChange && !disabled;
  const busy = saving || disabled;

  const availableOptions = useMemo(
    () => buildExcelColumnAvailableOptions(fields, availableFields, getFieldLabel, getFieldGroupLabel),
    [availableFields, fields, getFieldGroupLabel, getFieldLabel],
  );
  const menuModel = useMemo(
    () => buildExcelColumnMenuModel(menu, fields, canEdit, busy, getFieldLabel, getFieldGroupLabel),
    [busy, canEdit, fields, getFieldGroupLabel, getFieldLabel, menu],
  );

  const emit = (nextFields: string[]) => {
    if (!canEdit || busy || nextFields === fields) return;
    onFieldsChange?.(nextFields);
  };
  const closeMenu = () => setMenu(null);
  const addField = (field: string) => emit(addExcelColumnField(fields, field));
  const removeField = (field: string) => {
    emit(removeExcelColumnField(fields, field));
    closeMenu();
  };
  const moveFieldToStart = (field: string) => {
    emit(moveExcelColumnFieldToStart(fields, field));
    closeMenu();
  };
  const moveFieldToEnd = (field: string) => {
    emit(moveExcelColumnFieldToEnd(fields, field));
    closeMenu();
  };
  const dropField = (targetField: string) => {
    emit(reorderExcelColumnFieldsByDrop(fields, draggedField, targetField));
    setDraggedField(null);
  };
  const openMenu = (event: MouseEvent, field: string) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ field, x: event.clientX, y: event.clientY });
  };

  return (
    <div
      class="excel-column-toolbar"
      data-editable={canEdit ? 'true' : 'false'}
      aria-label="Excel 显示字段编辑"
      onClick={() => menu ? closeMenu() : undefined}
    >
      <span class="excel-column-toolbar-title">显示字段</span>
      <ExcelColumnChipList
        fields={fields}
        canEdit={canEdit}
        busy={busy}
        draggedField={draggedField}
        getFieldLabel={getFieldLabel}
        onOpenMenu={openMenu}
        onRemoveField={removeField}
        onDragStart={setDraggedField}
        onDragEnd={() => setDraggedField(null)}
        onDropField={dropField}
      />
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
      {menu && menuModel ? (
        <ExcelColumnContextMenu
          menu={menu}
          menuModel={menuModel}
          onRemoveField={removeField}
          onMoveFieldToStart={moveFieldToStart}
          onMoveFieldToEnd={moveFieldToEnd}
          onToggleInfo={() => setMenu(prev => prev ? { ...prev, showInfo: !prev.showInfo } : prev)}
        />
      ) : null}
    </div>
  );
}
