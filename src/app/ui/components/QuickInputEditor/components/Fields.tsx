/** @jsxImportSource preact */
import { h } from 'preact';

import type { TemplateField } from '@core/public';
import {
  getTemplateFieldInputType,
  getTemplateFieldSemantic,
  isTemplateImageField,
  isTemplateMultiValueField,
  isTemplatePathField,
  isTemplateTagField,
  normalizeImageValue,
} from '@core/public';

import { Box, Button, Stack, Typography } from '@mui/material';

import { QuickInputOptionPillGroup } from './QuickInputOptionPillGroup';
import { SelectablePill } from './SelectablePill';
import { normalizeQuickInputChoices } from './quickInputOptionSelection';

export interface QuickInputEditorFieldsProps {
  getResourcePath: (path: string) => string;
  template: any;
  formData: Record<string, any>;
  dense?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
  timeDirection?: 'forward' | 'backward';
  onTimeDirectionChange?: (direction: 'forward' | 'backward') => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
  showTimeDirectionControl?: boolean;
}

function toArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(typeof v === 'object' && v !== null ? (v as any).value ?? (v as any).label ?? '' : v)).filter(Boolean);
  if (value && typeof value === 'object') return [String((value as any).value ?? (value as any).label ?? '')].filter(Boolean);
  return String(value ?? '')
    .split(/[,，\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isImagePath(value: unknown): boolean {
  return !!normalizeImageValue(value);
}

export function QuickInputEditorFields({ getResourcePath, template, formData, dense = false, onUpdateField, timeDirection = 'forward', onTimeDirectionChange, onRequestSubmit, isMobileLike = false, showTimeDirectionControl = false }: QuickInputEditorFieldsProps) {
  const handleUpdate = (key: string, value: any, isOptionObject = false) => {
    onUpdateField(key, value, isOptionObject);
  };

  const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    const minHeight = dense ? 96 : 118;
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  };

  const isInlineRowField = (field: TemplateField) => {
    const semantic = getTemplateFieldSemantic(field);
    const label = field.label || field.key;
    return semantic === 'status' || semantic === 'recurrence' || semantic === 'date' || label === '状态' || label === '重复' || label === '日期';
  };

  const isTimeField = (field: TemplateField) => {
    const semantic = getTemplateFieldSemantic(field);
    return semantic === 'startTime' || semantic === 'endTime' || semantic === 'duration' || ['时间', '结束', '时长'].includes(field.label || field.key);
  };

  const renderFieldLabel = (label: string) => (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        color: 'text.primary',
        lineHeight: 1.35,
      }}
    >
      {label}
    </Typography>
  );

  const renderInlineRow = (label: string, control: any) => (
    <Box
      className="think-form-row think-form-row--inline"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '84px minmax(0, 1fr)' },
        alignItems: 'start',
        columnGap: { xs: 0, sm: 1.5 },
        rowGap: 0.7,
        width: '100%',
      }}
    >
      <Box sx={{ pt: { xs: 0, sm: 0.55 } }}>{renderFieldLabel(label)}</Box>
      <Box sx={{ minWidth: 0 }}>{control}</Box>
    </Box>
  );

  const renderStandardField = (label: string, control: any, textarea = false) => (
    <Box
      className={textarea ? 'think-form-row think-textarea-row' : 'think-form-row'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.8,
        width: '100%',
      }}
    >
      {renderFieldLabel(label)}
      {control}
    </Box>
  );

  const renderOptionPills = (field: TemplateField, label = field.label || field.key) => {
    const choices = normalizeQuickInputChoices(field.options);
    return (
      <QuickInputOptionPillGroup
        label={label}
        choices={choices}
        value={formData[field.key]}
        compact={dense}
        onSelect={(choice) => handleUpdate(field.key, choice, true)}
      />
    );
  };

  const renderMultiOptionPills = (field: TemplateField) => {
    const selected = new Set(toArrayValue(formData[field.key]));
    const choices = normalizeQuickInputChoices(field.options);
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {choices.map((choice) => {
          const isSelected = selected.has(choice.value) || selected.has(choice.label);
          return (
            <SelectablePill
              key={`${choice.value}-${choice.label}`}
              selected={isSelected}
              onClick={() => {
                const next = new Set(selected);
                if (isSelected) {
                  next.delete(choice.value);
                  next.delete(choice.label);
                } else {
                  next.add(choice.value);
                }
                handleUpdate(field.key, Array.from(next));
              }}
              title={choice.label}
            >
              {choice.label}
            </SelectablePill>
          );
        })}
      </Box>
    );
  };

  const renderImagePreview = (rawValue: unknown) => {
    const image = normalizeImageValue(rawValue);
    if (!image) return null;
    const src = /^https?:\/\//i.test(image.src) ? image.src : getResourcePath(image.src);
    return (
      <Box sx={{ mt: 0.8, display: 'flex', alignItems: 'center', gap: 1 }}>
        <img
          src={src}
          alt={image.alt || image.src}
          style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--background-modifier-border)' }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>{image.src}</Typography>
      </Box>
    );
  };

  const renderTextAreaValueField = (field: TemplateField, label: string, value: unknown) => {
    const multiline = isTemplateMultiValueField(field);
    const displayValue = Array.isArray(value) ? value.join('\n') : String(value ?? '');
    const control = (
      <textarea
        className="think-native-input think-native-input--textarea"
        value={displayValue}
        rows={dense ? 3 : 4}
        onInput={(e: any) => {
          handleUpdate(field.key, e.target.value);
          if (e.target instanceof HTMLTextAreaElement) autoResizeTextarea(e.target);
        }}
        onKeyDown={(e: any) => {
          e.stopPropagation();
          if (isMobileLike) return;
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !(e.nativeEvent?.isComposing)) {
            onRequestSubmit?.();
            e.preventDefault();
          }
        }}
        placeholder={multiline ? '每行一个，或用逗号分隔' : undefined}
        ref={(el: HTMLTextAreaElement | null) => autoResizeTextarea(el)}
        style={{ resize: 'none', overflowY: 'hidden', minHeight: dense ? '78px' : '96px' }}
      />
    );
    return renderStandardField(label, control, true);
  };

  const renderField = (field: TemplateField) => {
    const inputType = getTemplateFieldInputType(field);
    const isComplex = typeof formData[field.key] === 'object' && formData[field.key] !== null && !Array.isArray(formData[field.key]);
    const value = isComplex ? formData[field.key]?.value : formData[field.key];
    const label = field.label || field.key;

    if (inputType === 'multiSelect') {
      return renderStandardField(label, renderMultiOptionPills(field));
    }

    if (isTemplateTagField(field) || inputType === 'multiPath' || inputType === 'multiImage') {
      return renderTextAreaValueField(field, label, value);
    }

    if (isTemplateImageField(field)) {
      const control = (
        <Box>
          <input
            className="think-native-input"
            value={String(value || '')}
            onInput={(e: any) => handleUpdate(field.key, e.target.value)}
            onKeyDown={(e: any) => {
              e.stopPropagation();
              if (!isMobileLike && e.key === 'Enter' && !(e.metaKey || e.ctrlKey || e.shiftKey) && !(e.nativeEvent?.isComposing)) {
                onRequestSubmit?.();
                e.preventDefault();
              }
            }}
            placeholder="图片路径、![[图片.png]] 或 URL"
          />
          {renderImagePreview(value)}
        </Box>
      );
      return renderStandardField(label, control);
    }

    switch (inputType) {
      case 'rating':
        return renderStandardField(
          label,
          <Stack direction="row" spacing={0.9} sx={{ mt: 0.1, flexWrap: 'wrap' }}>
            {(field.options || []).map((opt: any) => {
              const isSelected = isComplex && formData[field.key]?.label === opt.label && formData[field.key]?.value === opt.value;
              const imageValue = isImagePath(opt.value) ? normalizeImageValue(opt.value) : undefined;

              const displayContent = imageValue ? (
                <img
                  src={/^https?:\/\//i.test(imageValue.src) ? imageValue.src : getResourcePath(imageValue.src)}
                  alt={opt.label}
                  style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{opt.value}</span>
              );

              return (
                <Button
                  key={opt.label}
                  variant="text"
                  onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                  title={opt.label || String(opt.value || '')}
                  sx={{
                    minWidth: '40px',
                    height: '40px',
                    p: 0.75,
                    opacity: isSelected ? 1 : 0.8,
                    border: isSelected ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)',
                    background: isSelected ? 'var(--background-modifier-hover)' : 'transparent',
                    borderRadius: '10px',
                    transition: 'all 0.18s ease',
                    '&:hover': { opacity: 1, background: 'var(--background-modifier-hover)' },
                  }}
                >
                  {displayContent}
                </Button>
              );
            })}
          </Stack>
        );

      case 'radio':
        return isInlineRowField(field)
          ? renderInlineRow(label, renderOptionPills(field))
          : renderStandardField(label, renderOptionPills(field));

      case 'select':
      case 'singleSelect':
      case 'path': {
        const choices = normalizeQuickInputChoices(field.options);
        const singleSelectControl = choices.length ? (
          renderOptionPills(field, label)
        ) : (
          <input
            className="think-native-input"
            value={value || ''}
            onInput={(e: any) => handleUpdate(field.key, e.target.value)}
            placeholder={isTemplatePathField(field) ? '例如：生活/健康' : undefined}
          />
        );

        return isInlineRowField(field)
          ? renderInlineRow(label, singleSelectControl)
          : renderStandardField(label, singleSelectControl);
      }

      default: {
        const commonInputProps: any = {
          className: inputType === 'textarea' ? 'think-native-input think-native-input--textarea' : 'think-native-input',
          value: value || '',
          onInput: (e: any) => {
            handleUpdate(field.key, e.target.value);
            if (inputType === 'textarea' && e.target instanceof HTMLTextAreaElement) {
              autoResizeTextarea(e.target);
            }
          },
          onKeyDown: (e: any) => {
            e.stopPropagation();
            if (inputType === 'textarea') {
              if (isMobileLike) return;
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !(e.nativeEvent?.isComposing)) {
                onRequestSubmit?.();
                e.preventDefault();
              }
              return;
            }
            if (isMobileLike) return;
            if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey || e.shiftKey) && !(e.nativeEvent?.isComposing)) {
              onRequestSubmit?.();
              e.preventDefault();
            }
          },
        };

        const control = inputType === 'textarea' ? (
          <textarea
            {...commonInputProps}
            rows={dense ? 4 : 5}
            enterKeyHint={isMobileLike ? 'enter' : 'done'}
            ref={(el: HTMLTextAreaElement | null) => autoResizeTextarea(el)}
            style={{ resize: 'none', overflowY: 'hidden', minHeight: dense ? '96px' : '118px' }}
          />
        ) : (
          <input
            {...commonInputProps}
            type={inputType === 'text' ? 'text' : (inputType as any)}
            min={field.min}
            max={field.max}
            enterKeyHint={isMobileLike ? 'enter' : 'done'}
            style={isTimeField(field) ? { minHeight: '42px' } : undefined}
          />
        );

        if (isInlineRowField(field)) {
          return renderInlineRow(label, control);
        }

        return renderStandardField(label, control, inputType === 'textarea');
      }
    }
  };

  const renderFields = () => {
    const fieldsToRender: any[] = [];
    const timeFields: any[] = [];
    const dateFields: any[] = [];

    template.fields.forEach((field: any) => {
      const semantic = getTemplateFieldSemantic(field);
      if (semantic === 'date') {
        dateFields.push(field);
      } else if (semantic === 'startTime' || semantic === 'endTime' || semantic === 'duration') {
        timeFields.push(field);
      } else {
        fieldsToRender.push(<div key={field.id}>{renderField(field)}</div>);
      }
    });

    dateFields.forEach((field: any) => {
      fieldsToRender.push(<div key={field.id}>{renderField(field)}</div>);
    });

    if (timeFields.length > 0) {
      const order = { startTime: 0, endTime: 1, duration: 2 } as Record<string, number>;
      const sortedTimeFields = [...timeFields].sort((a, b) => (order[getTemplateFieldSemantic(a)] ?? 99) - (order[getTemplateFieldSemantic(b)] ?? 99));

      fieldsToRender.push(
        <Box key="time-fields-wrapper" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            key="time-fields"
            className="think-form-row"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(sortedTimeFields.length, 3)}, minmax(0, 1fr))` },
              gap: 1.25,
              pt: 0.2,
            }}
          >
            {sortedTimeFields.map((field: any) => (
              <div key={field.id}>{renderField(field)}</div>
            ))}
          </Box>
          {showTimeDirectionControl && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: 28 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={timeDirection === 'backward'}
                  onChange={(e: any) => onTimeDirectionChange?.(e.currentTarget.checked ? 'backward' : 'forward')}
                />
                反向（结束 - 时长 = 时间）
              </label>
            </Box>
          )}
        </Box>
      );
    }

    return fieldsToRender;
  };

  return <Stack spacing={dense ? 1.7 : 1.9}>{renderFields()}</Stack>;
}
