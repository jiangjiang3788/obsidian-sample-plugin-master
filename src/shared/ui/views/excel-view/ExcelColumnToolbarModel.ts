export interface ExcelColumnOptionModel {
  value: string;
  label: string;
  group?: string;
}

export interface ExcelColumnMenuState {
  field: string;
  x: number;
  y: number;
  showInfo?: boolean;
}

export interface ExcelColumnMenuModel {
  field: string;
  label: string;
  group?: string;
  index: number;
  canRemove: boolean;
  canMoveToStart: boolean;
  canMoveToEnd: boolean;
}

export function moveExcelColumnField(fields: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex) return fields;
  if (fromIndex < 0 || fromIndex >= fields.length) return fields;
  if (toIndex < 0 || toIndex >= fields.length) return fields;
  const next = [...fields];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function buildExcelColumnAvailableOptions(
  fields: string[],
  availableFields: string[],
  getFieldLabel: (field: string) => string,
  getFieldGroupLabel?: (field: string) => string | undefined,
): ExcelColumnOptionModel[] {
  const selected = new Set(fields);
  return availableFields
    .filter(field => !selected.has(field))
    .map(field => ({
      value: field,
      label: getFieldLabel(field),
      group: getFieldGroupLabel?.(field),
    }));
}

export function canEditExcelColumnFields(canEdit: boolean, busy: boolean): boolean {
  return canEdit && !busy;
}

export function canRemoveExcelColumnField(fields: string[], canEdit: boolean, busy: boolean): boolean {
  return canEditExcelColumnFields(canEdit, busy) && fields.length > 1;
}

export function addExcelColumnField(fields: string[], field: string): string[] {
  if (!field || fields.includes(field)) return fields;
  return [...fields, field];
}

export function removeExcelColumnField(fields: string[], field: string): string[] {
  if (fields.length <= 1) return fields;
  return fields.filter(item => item !== field);
}

export function moveExcelColumnFieldToStart(fields: string[], field: string): string[] {
  const index = fields.indexOf(field);
  if (index <= 0) return fields;
  return moveExcelColumnField(fields, index, 0);
}

export function moveExcelColumnFieldToEnd(fields: string[], field: string): string[] {
  const index = fields.indexOf(field);
  if (index < 0 || index === fields.length - 1) return fields;
  return moveExcelColumnField(fields, index, fields.length - 1);
}

export function reorderExcelColumnFieldsByDrop(fields: string[], sourceField: string | null, targetField: string): string[] {
  if (!sourceField || sourceField === targetField) return fields;
  return moveExcelColumnField(fields, fields.indexOf(sourceField), fields.indexOf(targetField));
}

export function buildExcelColumnMenuModel(
  menu: ExcelColumnMenuState | null,
  fields: string[],
  canEdit: boolean,
  busy: boolean,
  getFieldLabel: (field: string) => string,
  getFieldGroupLabel?: (field: string) => string | undefined,
): ExcelColumnMenuModel | null {
  if (!menu?.field) return null;
  const index = fields.indexOf(menu.field);
  return {
    field: menu.field,
    label: getFieldLabel(menu.field),
    group: getFieldGroupLabel?.(menu.field),
    index,
    canRemove: canRemoveExcelColumnField(fields, canEdit, busy),
    canMoveToStart: canEditExcelColumnFields(canEdit, busy) && index > 0,
    canMoveToEnd: canEditExcelColumnFields(canEdit, busy) && index >= 0 && index < fields.length - 1,
  };
}
