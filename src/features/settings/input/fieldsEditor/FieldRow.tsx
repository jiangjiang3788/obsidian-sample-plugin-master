// src/features/settings/input/fieldsEditor/FieldRow.tsx
/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import { Box, Button, Collapse, Divider, Stack, Typography } from '@shared/public';
import { AddIcon, DeleteIcon, DragIndicatorIcon, ExpandLessIcon, ExpandMoreIcon, IconAction, SimpleSelect, logRenderDiagnostic } from '@shared/public';
import type { TemplateField, TemplateFieldOption } from "@core/public";
import { getCustomFieldNameWarning, getUserTemplateFieldTypeOptions, normalizeTemplateFieldType, templateFieldTypeSupportsDefaultValue, templateFieldTypeUsesOptions } from "@core/public";
import { NativeTextarea, NativeTextInput } from "./nativeControls";
import { OptionRow } from "./OptionRow";

const fieldTypeOptions = getUserTemplateFieldTypeOptions();

const fieldRowGridTemplateColumns = "20px minmax(0, 1.15fr) minmax(112px, 145px) minmax(0, 1fr) 54px 46px 30px";
const emptyControlMinHeight = 40;

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
    <Box
      sx={{
        py: 0.75,
        px: 0.5,
        borderRadius: 1,
        bgcolor: isDragging ? "action.hover" : "transparent",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: fieldRowGridTemplateColumns,
          columnGap: 0.75,
          alignItems: "center",
        }}
      >
        <Box
          title="拖动排序"
          sx={{
            width: 28,
            minHeight: emptyControlMinHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
            cursor: disabled ? "default" : "grab",
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: "1.25rem" }} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <NativeTextInput
            label=""
            placeholder="字段名称"
            value={localName}
            onInput={(value) => setLocalName(value)}
            onBlur={handleNameBlur}
            onFocus={() => setIsEditing(true)}
            disabled={disabled}
            style={{ width: "100%" }}
            title="该名称会显示在输入表单中，也可在模板中用 {{字段名称}} 引用"
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <SimpleSelect
            value={uiType}
            options={fieldTypeOptions}
            onChange={(val) => onUpdate({ type: normalizeTemplateFieldType(val) })}
            disabled={disabled}
            sx={{ width: "100%" }}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
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
              style={{ width: "100%" }}
            />
          ) : (
            <Box sx={{ minHeight: emptyControlMinHeight }} />
          )}
        </Box>

        <Box sx={{ minWidth: 0, display: "flex", justifyContent: "center", alignItems: "center", minHeight: emptyControlMinHeight }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--text-muted)" }} title="提交时此字段不能为空">
            <input
              type="checkbox"
              checked={field.required === true}
              disabled={disabled}
              onChange={(event: any) => onUpdate({ required: !!event.target.checked })}
            />
            必填
          </label>
        </Box>

        <Box sx={{ minWidth: 0, display: "flex", justifyContent: "center" }}>
          {showDetails ? (
            <button
              type="button"
              disabled={disabled && !showOptionsEditor}
              onClick={() => setDetailsOpen((open) => !open)}
              style={{
                width: '100%',
                minWidth: 0,
                padding: '4px 2px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: disabled && !showOptionsEditor ? 'default' : 'pointer',
                font: 'inherit',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {detailsOpen ? '收起' : '详情'}
            </button>
          ) : (
            <Box sx={{ minHeight: emptyControlMinHeight }} />
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            title="删除此字段"
            disabled={disabled}
            onClick={onRemove}
            style={{
              width: 26,
              height: 26,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: disabled ? 'default' : 'pointer',
              font: 'inherit',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            −
          </button>
        </Box>
      </Box>

      {customFieldNameWarning && (
        <Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: 0.5, ml: 4.5 }}>
          {customFieldNameWarning}
        </Typography>
      )}

      <Collapse in={detailsOpen} unmountOnExit>
        <Box sx={{ mt: 1.25, ml: 4.5, p: 1.25, borderRadius: 1, bgcolor: "background.default" }}>
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
              style={{ width: "100%" }}
            />
          )}

          {uiType === "number" && (
            <Stack direction="row" spacing={1} sx={{ mb: showOptionsEditor ? 1.5 : 0 }}>
              <NativeTextInput
                label="最小值"
                type="number"
                value={field.min ?? ""}
                onInput={(value) => onUpdate({ min: value === "" ? undefined : Number(value) })}
                disabled={disabled}
                style={{ width: 120 }}
              />
              <NativeTextInput
                label="最大值"
                type="number"
                value={field.max ?? ""}
                onInput={(value) => onUpdate({ max: value === "" ? undefined : Number(value) })}
                disabled={disabled}
                style={{ width: 120 }}
              />
            </Stack>
          )}

          {showOptionsEditor && (
            <Box>
              <Stack spacing={1.25} divider={<Divider flexItem sx={{ borderStyle: "dashed" }} />}>
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
                sx={{ mt: 1.25 }}
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
