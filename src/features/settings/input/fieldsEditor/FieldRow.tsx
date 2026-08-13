/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { SimpleSelect, ThinkButton, ThinkCheckbox, ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import { logRenderDiagnostic } from '@shared/debug/public';
import type { TemplateField, TemplateFieldOption } from '@core/types/public';
import { getCustomFieldNameWarning, getUserTemplateFieldTypeOptions, normalizeTemplateFieldType, templateFieldTypeSupportsDefaultValue, templateFieldTypeUsesOptions } from '@core/fields/public';
import { NativeTextarea, NativeTextInput } from './nativeControls';
import { OptionRow } from './OptionRow';

const fieldTypeOptions = getUserTemplateFieldTypeOptions();
function defaultInputType(uiType: string) { if (uiType === 'number') return 'number'; if (uiType === 'date') return 'date'; if (uiType === 'time') return 'time'; if (uiType === 'datetime') return 'datetime-local'; return 'text'; }

export function FieldRow({ field, disabled = false, isDragging = false, onUpdate, onRemove }: { field: TemplateField; disabled?: boolean; isDragging?: boolean; onUpdate: (updates: Partial<TemplateField>) => void; onRemove: () => void; }) {
  const [localName, setLocalName] = useState(field.label || field.key); const [localDefaultValue, setLocalDefaultValue] = useState(field.defaultValue || ''); const [isEditing, setIsEditing] = useState(false); const [detailsOpen, setDetailsOpen] = useState(false);
  const renderCountRef = useRef(0); const previousFieldRef = useRef<TemplateField | null>(null); renderCountRef.current += 1;
  useEffect(() => { logRenderDiagnostic('FieldsEditor/FieldRow', { renderCount: renderCountRef.current, fieldId: field.id, fieldKey: field.key, fieldType: field.type, disabled, isEditing, isDragging, fieldRefChanged: previousFieldRef.current !== null && previousFieldRef.current !== field, localName, localDefaultValue, incomingDefaultValue: field.defaultValue }); previousFieldRef.current = field; });
  useEffect(() => { if (!isEditing) setLocalName(field.label || field.key); }, [field.label, field.key, isEditing]);
  useEffect(() => setLocalDefaultValue(field.defaultValue || ''), [field.defaultValue, field.id]);
  const handleNameBlur = () => { const trimmedName = localName.trim(); if (trimmedName && trimmedName !== (field.label || field.key)) onUpdate({ key: trimmedName, label: trimmedName }); else setLocalName(field.label || field.key); setIsEditing(false); };
  const handleOptionChange = (optIndex: number, newOption: TemplateFieldOption) => { const next=[...(field.options || [])]; next[optIndex]=newOption; onUpdate({ options: next }); };
  const addOption = () => { const next=[...(field.options || []), { value: '新选项', label: String((field.options || []).length + 1) }]; onUpdate({ options: next }); setDetailsOpen(true); };
  const uiType = normalizeTemplateFieldType(field.type); const warning = getCustomFieldNameWarning(localName); const showOptionsEditor = templateFieldTypeUsesOptions(uiType); const showDefaultValueEditor = templateFieldTypeSupportsDefaultValue(uiType); const showInlineDefaultValue = showDefaultValueEditor && uiType !== 'textarea'; const showDetails = showOptionsEditor || uiType === 'textarea' || uiType === 'number';
  return (
    <div className={`think-field-row${isDragging ? ' is-dragging' : ''}`}>
      <div className="think-fields-editor__grid">
        <span className={`think-field-row__drag${disabled ? ' is-disabled' : ''}`} title="拖动排序"><ThinkIcon name="grip-vertical" /></span>
        <div className="think-field-row__cell"><NativeTextInput label="" placeholder="字段名称" value={localName} onInput={setLocalName} onBlur={handleNameBlur} onFocus={() => setIsEditing(true)} disabled={disabled} className="think-settings-full-width" /></div>
        <div className="think-field-row__cell"><SimpleSelect value={uiType} options={fieldTypeOptions} onChange={(value) => onUpdate({ type: normalizeTemplateFieldType(value) })} disabled={disabled} className="think-settings-full-width" /></div>
        <div className="think-field-row__cell">{showInlineDefaultValue ? <NativeTextInput label="" value={localDefaultValue} type={defaultInputType(uiType)} onInput={(value) => { setLocalDefaultValue(value); onUpdate({ defaultValue: value }); }} onBlur={() => onUpdate({ defaultValue: localDefaultValue })} disabled={disabled} placeholder="可留空" className="think-settings-full-width" /> : <span className="think-field-row__empty" />}</div>
        <div className="think-field-row__required-label" title="提交时此字段不能为空"><ThinkCheckbox checked={field.required === true} disabled={disabled} compact label="必填" onChange={(event) => onUpdate({ required: (event.currentTarget as HTMLInputElement).checked })} /></div>
        <div className="think-field-row__details-cell">{showDetails ? <ThinkButton size="sm" variant="ghost" disabled={disabled && !showOptionsEditor} onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? '收起' : '详情'}</ThinkButton> : null}</div>
        <div className="think-field-row__delete-cell"><ThinkIconButton label="删除字段" icon={<ThinkIcon name="trash-2" />} size="sm" tone="danger" disabled={disabled} onClick={onRemove} /></div>
      </div>
      {warning && <div className="think-field-row__warning">{warning}</div>}
      {detailsOpen && (
        <div className="think-field-row__details">
          {uiType === 'textarea' && showDefaultValueEditor && <NativeTextarea label="默认值" value={localDefaultValue} rows={3} onInput={(value) => { setLocalDefaultValue(value); onUpdate({ defaultValue: value }); }} onBlur={() => onUpdate({ defaultValue: localDefaultValue })} disabled={disabled} placeholder="可留空" className="think-settings-full-width" />}
          {uiType === 'number' && <div className={`think-field-row__number-range${showOptionsEditor ? ' has-options' : ''}`}><NativeTextInput label="最小值" type="number" value={field.min ?? ''} onInput={(value) => onUpdate({ min: value === '' ? undefined : Number(value) })} disabled={disabled} className="think-native-field--narrow" /><NativeTextInput label="最大值" type="number" value={field.max ?? ''} onInput={(value) => onUpdate({ max: value === '' ? undefined : Number(value) })} disabled={disabled} className="think-native-field--narrow" /></div>}
          {showOptionsEditor && <div className="think-field-row__options"><div className="think-field-row__options-list">{(field.options || []).map((option, optIndex) => <OptionRow key={optIndex} option={option} onChange={(newOption) => handleOptionChange(optIndex, newOption)} onRemove={() => onUpdate({ options: (field.options || []).filter((_, index) => index !== optIndex) })} fieldType={uiType} disabled={disabled} />)}</div><ThinkButton onClick={addOption} disabled={disabled} leadingIcon={<ThinkIcon name="plus" />} size="sm" variant="secondary">添加选项</ThinkButton></div>}
        </div>
      )}
    </div>
  );
}
