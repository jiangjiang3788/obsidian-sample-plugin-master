/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { ThinkButton, ThinkIcon } from '@shared/ui/public';
import { logRenderDiagnostic } from '@shared/debug/public';
import type { TemplateField } from '@core/types/public';
import { createCustomTemplateField, sanitizeTemplateField, sanitizeTemplateFields } from '@core/fields/public';
import { FieldRow } from './fieldsEditor/FieldRow';

function createEmptyField(index: number): TemplateField { return createCustomTemplateField(index); }
function reorderFields(fields: TemplateField[], fromIndex: number, toIndex: number): TemplateField[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= fields.length || toIndex >= fields.length) return fields;
  const next = [...fields]; const [moved] = next.splice(fromIndex, 1); next.splice(toIndex, 0, moved); return next;
}

export function FieldsEditor({ fields = [], disabled = false, onChange }: { fields: TemplateField[]; disabled?: boolean; onChange: (fields: TemplateField[]) => void; }) {
  const renderCountRef = useRef(0); const previousFieldsRef = useRef<TemplateField[] | null>(null); const [draggingIndex, setDraggingIndex] = useState<number | null>(null); renderCountRef.current += 1;
  useEffect(() => { logRenderDiagnostic('FieldsEditor', { renderCount: renderCountRef.current, disabled, fieldsRefChanged: previousFieldsRef.current !== null && previousFieldsRef.current !== fields, fieldsCount: fields.length, fieldIds: fields.map((field) => field.id) }); previousFieldsRef.current = fields; });
  const emitFields = (nextFields: TemplateField[]) => onChange(sanitizeTemplateFields(nextFields));
  const handleUpdate = (index: number, updates: Partial<TemplateField>) => { const next = sanitizeTemplateFields(fields || []); next[index] = sanitizeTemplateField({ ...next[index], ...updates }, index + 1); emitFields(next); };
  const handleDropOn = (targetIndex: number) => { if (draggingIndex === null || disabled) return; emitFields(reorderFields(fields || [], draggingIndex, targetIndex)); setDraggingIndex(null); };
  return (
    <div className="think-fields-editor">
      <div className="think-fields-editor__grid think-fields-editor__header"><span /><span>字段名称</span><span>字段类型</span><span>默认值</span><span className="think-fields-editor__header-center">必填</span><span className="think-fields-editor__header-center">详情</span><span /></div>
      <div className="think-fields-editor__rows">{(fields || []).map((field, index) => (
        <div key={field.id} draggable={!disabled} onDragStart={(event) => { if (disabled) return; setDraggingIndex(index); event.dataTransfer?.setData('text/plain', String(index)); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => { if (disabled || draggingIndex === null) return; event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); handleDropOn(index); }} onDragEnd={() => setDraggingIndex(null)} className={`think-fields-editor__row-wrap${draggingIndex === index ? ' is-dragging' : ''}`}>
          <FieldRow field={field} disabled={disabled} isDragging={draggingIndex === index} onUpdate={(updates) => handleUpdate(index, updates)} onRemove={() => emitFields((fields || []).filter((_, current) => current !== index))} />
        </div>
      ))}</div>
      <div className="think-settings-actions think-settings-actions--start"><ThinkButton onClick={() => emitFields([...(fields || []), createEmptyField((fields || []).length + 1)])} disabled={disabled} leadingIcon={<ThinkIcon name="plus" />} variant="secondary" size="sm">添加字段</ThinkButton></div>
    </div>
  );
}
