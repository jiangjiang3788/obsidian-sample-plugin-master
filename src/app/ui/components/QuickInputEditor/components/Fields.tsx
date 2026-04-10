/** @jsxImportSource preact */
import { h } from 'preact';

import type { TemplateField } from '@core/public';

import { Box, Button, FormControl, Stack, Typography } from '@mui/material';

import { SimpleSelect } from '@shared/public';

import { SelectablePill } from './SelectablePill';

export interface QuickInputEditorFieldsProps {
  getResourcePath: (path: string) => string;
  template: any;
  formData: Record<string, any>;
  dense?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
}

export function QuickInputEditorFields({ getResourcePath, template, formData, dense = false, onUpdateField, onRequestSubmit, isMobileLike = false }: QuickInputEditorFieldsProps) {
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
    const label = field.label || field.key;
    return label === '状态' || label === '重复' || label === '日期';
  };

  const isTimeField = (field: TemplateField) => ['时间', '结束', '时长'].includes(field.label || field.key);

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

  const renderOptionPills = (field: TemplateField) => {
    const selectedOptionObject = formData[field.key];
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {(field.options || []).map((opt: any, index: number) => {
          const selected = selectedOptionObject?.value === opt.value && selectedOptionObject?.label === (opt.label || opt.value);
          return (
            <SelectablePill
              key={index}
              selected={selected}
              onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label || opt.value }, true)}
              title={opt.label || opt.value}
            >
              {opt.label || opt.value}
            </SelectablePill>
          );
        })}
      </Box>
    );
  };

  const renderField = (field: TemplateField) => {
    const isComplex = typeof formData[field.key] === 'object' && formData[field.key] !== null;
    const value = isComplex ? formData[field.key]?.value : formData[field.key];
    const label = field.label || field.key;

    switch (field.type) {
      case 'rating':
        return renderStandardField(
          label,
          <Stack direction="row" spacing={0.9} sx={{ mt: 0.1, flexWrap: 'wrap' }}>
            {(field.options || []).map((opt: any) => {
              const isSelected = isComplex && formData[field.key]?.label === opt.label && formData[field.key]?.value === opt.value;
              const isImagePath =
                opt.value && (opt.value.endsWith('.png') || opt.value.endsWith('.jpg') || opt.value.endsWith('.jpeg') || opt.value.endsWith('.svg'));

              const displayContent = isImagePath ? (
                <img
                  src={getResourcePath(opt.value)}
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

      case 'select': {
        const selectOptions = (field.options || []).map((opt: any) => ({ value: opt.value, label: opt.label || opt.value }));
        const selectControl = (
          <FormControl fullWidth>
            <SimpleSelect
              value={value || ''}
              options={selectOptions}
              placeholder={`-- 选择 ${label} --`}
              onChange={(selectedValue: string) => {
                const selectedOption = field.options?.find((opt: any) => opt.value === selectedValue);
                if (selectedOption) {
                  handleUpdate(field.key, { value: selectedOption.value, label: selectedOption.label || selectedOption.value }, true);
                }
              }}
            />
          </FormControl>
        );

        return isInlineRowField(field)
          ? renderInlineRow(label, selectControl)
          : renderStandardField(label, selectControl);
      }

      default: {
        const commonInputProps: any = {
          className: field.type === 'textarea' ? 'think-native-input think-native-input--textarea' : 'think-native-input',
          value: value || '',
          onInput: (e: any) => {
            handleUpdate(field.key, e.target.value);
            if (field.type === 'textarea' && e.target instanceof HTMLTextAreaElement) {
              autoResizeTextarea(e.target);
            }
          },
          onKeyDown: (e: any) => {
            e.stopPropagation();
            if (field.type === 'textarea') {
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

        const control = field.type === 'textarea' ? (
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
            type={field.type === 'text' ? 'text' : (field.type as any)}
            min={field.min}
            max={field.max}
            enterKeyHint={isMobileLike ? 'enter' : 'done'}
            style={isTimeField(field) ? { minHeight: '42px' } : undefined}
          />
        );

        if (isInlineRowField(field)) {
          return renderInlineRow(label, control);
        }

        return renderStandardField(label, control, field.type === 'textarea');
      }
    }
  };

  const renderFields = () => {
    const timeFieldKeys = ['时间', '结束', '时长'];
    const dateFieldKey = '日期';

    const fieldsToRender: any[] = [];
    const dateField = template.fields.find((f: any) => f.key === dateFieldKey);
    const timeFields: any[] = [];

    template.fields.forEach((field: any) => {
      if (field.key !== dateFieldKey && !timeFieldKeys.includes(field.key)) {
        fieldsToRender.push(<div key={field.id}>{renderField(field)}</div>);
      } else if (timeFieldKeys.includes(field.key)) {
        timeFields.push(field);
      }
    });

    if (dateField) {
      fieldsToRender.push(<div key={dateField.id}>{renderField(dateField)}</div>);
    }

    if (timeFields.length > 0) {
      const sortedTimeFields = timeFieldKeys.map((key) => timeFields.find((f) => f.key === key)).filter((f) => f !== undefined);

      fieldsToRender.push(
        <Box
          key="time-fields"
          className="think-form-row"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.25,
            pt: 0.2,
          }}
        >
          {sortedTimeFields.map((field: any) => (
            <div key={field.id}>{renderField(field)}</div>
          ))}
        </Box>
      );
    }

    return fieldsToRender;
  };

  return <Stack spacing={dense ? 1.7 : 1.9}>{renderFields()}</Stack>;
}
