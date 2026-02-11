/** @jsxImportSource preact */
import { h } from 'preact';

import type { TemplateField } from '@core/public';

import { Box, Button, FormControl, FormControlLabel, Radio, RadioGroup as MuiRadioGroup, Stack, Typography } from '@mui/material';

import { SimpleSelect } from '@shared/public';

export interface QuickInputEditorFieldsProps {
  getResourcePath: (path: string) => string;
  template: any;
  formData: Record<string, any>;
  dense?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
}

/**
 * 字段渲染（纯渲染）
 * - 不读 store，不做副作用
 * - 只根据 template + formData + handler 输出 UI
 */
export function QuickInputEditorFields({ getResourcePath, template, formData, dense = false, onUpdateField }: QuickInputEditorFieldsProps) {
  const handleUpdate = (key: string, value: any, isOptionObject = false) => {
    onUpdateField(key, value, isOptionObject);
  };

  const renderField = (field: TemplateField) => {
    const isComplex = typeof formData[field.key] === 'object' && formData[field.key] !== null;
    const value = isComplex ? formData[field.key]?.value : formData[field.key];
    const label = field.label || field.key;

    switch (field.type) {
      case 'rating':
        return (
          <FormControl component="fieldset">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {(field.options || []).map((opt: any) => {
                const isSelected = isComplex && formData[field.key]?.label === opt.label && formData[field.key]?.value === opt.value;
                const isImagePath =
                  opt.value && (opt.value.endsWith('.png') || opt.value.endsWith('.jpg') || opt.value.endsWith('.jpeg') || opt.value.endsWith('.svg'));

                const displayContent = isImagePath ? (
                  <img
                    src={getResourcePath(opt.value)}
                    alt={opt.label}
                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '20px' }}>{opt.value}</span>
                );

                return (
                  <Button
                    key={opt.label}
                    variant="text"
                    onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                    title={`评分: ${opt.label}`}
                    sx={{
                      minWidth: '40px',
                      height: '40px',
                      p: 1,
                      opacity: isSelected ? 1 : 0.6,
                      '&:hover': { opacity: 1, transform: 'scale(1.05)' },
                      border: isSelected ? '2px solid var(--interactive-accent)' : '1px solid transparent',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {displayContent}
                  </Button>
                );
              })}
            </Stack>
          </FormControl>
        );

      case 'radio':
      case 'select': {
        const isRadio = field.type === 'radio';

        if (isRadio) {
          const selectedOptionObject = formData[field.key];
          const selectedIndex =
            field.options?.findIndex((opt: any) => opt.value === selectedOptionObject?.value && opt.label === selectedOptionObject?.label) ?? -1;

          return (
            <FormControl component="fieldset">
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {label}
              </Typography>
              <MuiRadioGroup
                row
                value={selectedIndex > -1 ? String(selectedIndex) : ''}
                onChange={(e: any) => {
                  const newIndex = parseInt(e.target.value, 10);
                  const newlySelectedOption = field.options?.[newIndex];
                  if (newlySelectedOption) {
                    handleUpdate(
                      field.key,
                      { value: newlySelectedOption.value, label: newlySelectedOption.label || newlySelectedOption.value },
                      true
                    );
                  }
                }}
              >
                {(field.options || []).map((opt: any, index: number) => (
                  <FormControlLabel key={index} value={String(index)} control={<Radio />} label={opt.label || opt.value} />
                ))}
              </MuiRadioGroup>
            </FormControl>
          );
        }

        const selectOptions = (field.options || []).map((opt: any) => ({ value: opt.value, label: opt.label || opt.value }));
        return (
          <FormControl fullWidth>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              {label}
            </Typography>
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
      }

      default: {
        const commonInputProps: any = {
          className: 'think-native-input',
          value: value || '',
          onInput: (e: any) => handleUpdate(field.key, e.target.value),
          onKeyDown: (e: any) => e.stopPropagation(),
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <label style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px' }}>{label}</label>
            {field.type === 'textarea' ? (
              <textarea {...commonInputProps} rows={dense ? 3 : 4} />
            ) : (
              <input {...commonInputProps} type={field.type === 'text' ? 'text' : (field.type as any)} min={field.min} max={field.max} />
            )}
          </div>
        );
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
        <Box key="time-fields" sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', '& > div': { flex: 1, minWidth: 0 } }}>
          {sortedTimeFields.map((field: any) => (
            <div key={field.id}>{renderField(field)}</div>
          ))}
        </Box>
      );
    }

    return fieldsToRender;
  };

  return <Stack spacing={dense ? 1.75 : 2.5}>{renderFields()}</Stack>;
}
