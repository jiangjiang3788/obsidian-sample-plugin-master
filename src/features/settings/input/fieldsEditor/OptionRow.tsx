/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import { logRenderDiagnostic } from '@shared/debug/public';
import type { TemplateField, TemplateFieldOption } from '@core/types/public';
import { NativeTextInput } from './nativeControls';

export function OptionRow({ option, onChange, onRemove, fieldType, disabled = false }: { option: TemplateFieldOption; onChange: (newOption: TemplateFieldOption) => void; onRemove: () => void; fieldType: TemplateField['type']; disabled?: boolean; }) {
  const [localOption, setLocalOption] = useState(option); const renderCountRef = useRef(0); const previousOptionRef = useRef<TemplateFieldOption | null>(null); renderCountRef.current += 1;
  useEffect(() => { logRenderDiagnostic('FieldsEditor/OptionRow', { renderCount: renderCountRef.current, fieldType, disabled, optionRefChanged: previousOptionRef.current !== null && previousOptionRef.current !== option, option, localOption }); previousOptionRef.current = option; });
  useEffect(() => setLocalOption(option), [option]);
  const commitOption = (nextOption: TemplateFieldOption) => { if ((nextOption.label || '') === (option.label || '') && nextOption.value === option.value) return; onChange(nextOption); };
  const handleBlur = () => commitOption(localOption);
  const isRating = fieldType === 'rating';
  return (
    <div className="think-field-option-row">
      <NativeTextInput label={isRating ? '评分数值' : '选项标签'} value={localOption.label || ''} onInput={(value) => { const next={...localOption,label:value}; setLocalOption(next); onChange(next); }} onBlur={handleBlur} disabled={disabled} />
      <NativeTextInput label={isRating ? '显示内容' : '选项值'} value={localOption.value} onInput={(value) => { const next={...localOption,value}; setLocalOption(next); onChange(next); }} onBlur={handleBlur} disabled={disabled} />
      <ThinkIconButton label="删除此选项" disabled={disabled} onClick={onRemove} icon={<ThinkIcon name="trash-2" />} size="sm" tone="danger" />
    </div>
  );
}
