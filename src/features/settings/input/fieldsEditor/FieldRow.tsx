// src/features/settings/input/fieldsEditor/FieldRow.tsx
/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Stack,
  Typography,
} from '@shared/ui/public';
import {
  AddIcon,
  DeleteIcon,
  DragIndicatorIcon,
  ExpandLessIcon,
  ExpandMoreIcon,
  IconAction,
  SimpleSelect,
} from '@shared/ui/public';
import { logRenderDiagnostic } from '@shared/debug/public';
import type { TemplateField, TemplateFieldOption } from '@core/types/public';
import {
  getCustomFieldNameWarning,
  getUserTemplateFieldTypeOptions,
  normalizeTemplateFieldType,
  templateFieldTypeSupportsDefaultValue,
  templateFieldTypeUsesOptions,
} from '@core/fields/public';
import { NativeTextarea, NativeTextInput } from "./nativeControls";
import { OptionRow } from "./OptionRow";

const fieldTypeOptions = getUserTemplateFieldTypeOptions();

function defaultInputType(uiType: string) {
  if (uiType === "number") return "number";
  if (uiType === "date") return "date";
  if (uiType === "time") return "time";
  if (uiType === "datetime") return "datetime-local";
  return "text";
}

export function FieldRow({
  field,
  disabled = false,
  isDragging = false,
  onUpdate,
  onRemove,
}: {
  field: TemplateField;
  disabled?: boolean;
  isDragging?: boolean;
  onUpdate: (updates: Partial<TemplateField>) => void;
  onRemove: () => void;
}) {
  const [localName, setLocalName] = useState(field.label || field.key);
  const [localDefaultValue, setLocalDefaultValue] = useState(field.defaultValue || "");
  const [isEditing, setIsEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const renderCountRef = useRef(0);
  const previousFieldRef = useRef<TemplateField | null>(null);
  renderCountRef.current += 1;

  useEffect(() => {
    logRenderDiagnostic("FieldsEditor/FieldRow", {
      renderCount: renderCountRef.current,
      fieldId: field.id,
      fieldKey: field.key,
      fieldType: field.type,
      disabled,
      isEditing,
      isDragging,
      fieldRefChanged:
        previousFieldRef.current !== null && previousFieldRef.current !== field,
      localName,
      localDefaultValue,
      incomingDefaultValue: field.defaultValue,
    });
    previousFieldRef.current = field;
  });

  useEffect(() => {
    if (!isEditing) setLocalName(field.label || field.key);
  }, [field.label, field.key, isEditing]);

  useEffect(() => {
    setLocalDefaultValue(field.defaultValue || "");
  }, [field.defaultValue, field.id]);

  const handleNameBlur = () => {
    const trimmedName = localName.trim();
    if (trimmedName && trimmedName !== (field.label || field.key)) {
      onUpdate({ key: trimmedName, label: trimmedName });
    } else {
      setLocalName(field.label || field.key);
    }
    setIsEditing(false);
  };

  const handleOptionChange = (optIndex: number, newOption: TemplateFieldOption) => {
    const newOptions = [...(field.options || [])];
    newOptions[optIndex] = newOption;
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(field.options || [])];
    newOptions.push({ value: "新选项", label: String(newOptions.length + 1) });
    onUpdate({ options: newOptions });
    setDetailsOpen(true);
  };

  const removeOption = (optIndex: number) => {
    const nextOptions = (field.options || []).filter((_, i) => i !== optIndex);
    onUpdate({ options: nextOptions });
  };

  const uiType = normalizeTemplateFieldType(field.type);
  const customFieldNameWarning = getCustomFieldNameWarning(localName);
  const showOptionsEditor = templateFieldTypeUsesOptions(uiType);
  const showDefaultValueEditor = templateFieldTypeSupportsDefaultValue(uiType);
  const showInlineDefaultValue = showDefaultValueEditor && uiType !== "textarea";
  const showDetails = showOptionsEditor || uiType === "textarea" || uiType === "number";

  return (
    <Box className={`think-field-row${isDragging ? ' is-dragging' : ''}`}>
      <Box className="think-fields-editor__grid">
        <Box
          title="拖动排序"
          className={`think-field-row__drag${disabled ? ' is-disabled' : ''}`}
        >
          <DragIndicatorIcon className="think-field-row__drag-icon" />
        </Box>

        <Box className="think-field-row__cell">
          <NativeTextInput
            label=""
            placeholder="字段名称"
            value={localName}
            onInput={(value) => setLocalName(value)}
            onBlur={handleNameBlur}
            onFocus={() => setIsEditing(true)}
            disabled={disabled}
            className="think-settings-full-width"
            title="该名称会显示在输入表单中，也可在模板中用 {{字段名称}} 引用"
          />
        </Box>

        <Box className="think-field-row__cell">
          <SimpleSelect
            value={uiType}
            options={fieldTypeOptions}
            onChange={(val) => onUpdate({ type: normalizeTemplateFieldType(val) })}
            disabled={disabled}
            className="think-settings-full-width"
          />
        </Box>

        <Box className="think-field-row__cell">
          {showInlineDefaultValue ? (
            <NativeTextInput
              label=""
              value={localDefaultValue}
              type={defaultInputType(uiType)}
              onInput={(value) => {
                setLocalDefaultValue(value);
                onUpdate({ defaultValue: value });
              }}
              onBlur={() => onUpdate({ defaultValue: localDefaultValue })}
              disabled={disabled}
              placeholder="可留空"
              className="think-settings-full-width"
            />
          ) : (
            <Box className="think-field-row__empty" />
          )}
        </Box>

        <Box className="think-field-row__required">
          <label className="think-field-row__required-label" title="提交时此字段不能为空">
            <input
              type="checkbox"
              checked={field.required === true}
              disabled={disabled}
              onChange={(event: any) => onUpdate({ required: !!event.target.checked })}
            />
            必填
          </label>
        </Box>

        <Box className="think-field-row__details-cell">
          {showDetails ? (
            <button
              type="button"
              disabled={disabled && !showOptionsEditor}
              onClick={() => setDetailsOpen((open) => !open)}
              className="think-field-row__details-button"
            >
              {detailsOpen ? '收起' : '详情'}
            </button>
          ) : (
            <Box className="think-field-row__empty" />
          )}
        </Box>

        <Box className="think-field-row__delete-cell">
          <button
            type="button"
            title="删除此字段"
            disabled={disabled}
            onClick={onRemove}
            className="think-field-row__delete"
          >
            −
          </button>
        </Box>
      </Box>

      {customFieldNameWarning && (
        <Typography variant="caption" className="think-field-row__warning">
          {customFieldNameWarning}
        </Typography>
      )}

      <Collapse in={detailsOpen} unmountOnExit>
        <Box className="think-field-row__details">
          {uiType === "textarea" && showDefaultValueEditor && (
            <NativeTextarea
              label="默认值"
              value={localDefaultValue}
              rows={3}
              onInput={(value) => {
                setLocalDefaultValue(value);
                onUpdate({ defaultValue: value });
              }}
              onBlur={() => onUpdate({ defaultValue: localDefaultValue })}
              disabled={disabled}
              placeholder="可留空"
              className="think-settings-full-width"
            />
          )}

          {uiType === "number" && (
            <Stack direction="row" spacing={1} className={`think-field-row__number-range${showOptionsEditor ? ' has-options' : ''}`}>
              <NativeTextInput
                label="最小值"
                type="number"
                value={field.min ?? ""}
                onInput={(value) => onUpdate({ min: value === "" ? undefined : Number(value) })}
                disabled={disabled}
                className="think-native-field--narrow"
              />
              <NativeTextInput
                label="最大值"
                type="number"
                value={field.max ?? ""}
                onInput={(value) => onUpdate({ max: value === "" ? undefined : Number(value) })}
                disabled={disabled}
                className="think-native-field--narrow"
              />
            </Stack>
          )}

          {showOptionsEditor && (
            <Box>
              <Stack spacing={1.25} divider={<Divider flexItem className="think-field-row__option-divider" />}>
                {(field.options || []).map((option, optIndex) => (
                  <OptionRow
                    key={optIndex}
                    option={option}
                    onChange={(newOpt) => handleOptionChange(optIndex, newOpt)}
                    onRemove={() => removeOption(optIndex)}
                    fieldType={uiType}
                    disabled={disabled}
                  />
                ))}
              </Stack>
              <Button
                onClick={addOption}
                disabled={disabled}
                startIcon={<AddIcon />}
                size="small"
                className="think-field-row__add-option"
              >
                添加选项
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
