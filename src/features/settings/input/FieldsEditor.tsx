// src/features/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { useEffect, useRef } from "preact/hooks";
import { Button, Divider, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { TemplateField } from "@core/public";
import { logRenderDiagnostic } from "@shared/public";
import { FieldRow } from "./fieldsEditor/FieldRow";

export function FieldsEditor({
  fields = [],
  disabled = false,
  onChange,
}: {
  fields: TemplateField[];
  disabled?: boolean;
  onChange: (fields: TemplateField[]) => void;
}) {
  const renderCountRef = useRef(0);
  const previousFieldsRef = useRef<TemplateField[] | null>(null);
  renderCountRef.current += 1;

  useEffect(() => {
    logRenderDiagnostic("FieldsEditor", {
      renderCount: renderCountRef.current,
      disabled,
      fieldsRefChanged:
        previousFieldsRef.current !== null &&
        previousFieldsRef.current !== fields,
      fieldsCount: fields.length,
      fieldIds: fields.map((field) => field.id),
    });
    previousFieldsRef.current = fields;
  });

  const handleUpdate = (index: number, updates: Partial<TemplateField>) => {
    const newFields = [...(fields || [])];
    newFields[index] = { ...newFields[index], ...updates };
    console.log("[字段编辑器][字段列表更新]", {
      字段索引: index,
      更新内容: updates,
      更新后字段: newFields[index],
      完整字段列表: newFields,
    });
    onChange(newFields);
  };

  const addField = () => {
    const newName = `新字段${(fields || []).length + 1}`;
    const nextFields = [
      ...(fields || []),
      {
        id: `field_${Date.now().toString(36)}`,
        key: newName,
        label: newName,
        type: "text" as const,
      },
    ];
    console.log("[字段编辑器][字段列表更新] 添加字段", {
      新字段名: newName,
      更新后字段列表: nextFields,
    });
    onChange(nextFields);
  };

  const removeField = (index: number) => {
    const nextFields = (fields || []).filter((_, i) => i !== index);
    console.log("[字段编辑器][字段列表更新] 删除字段", {
      删除索引: index,
      更新后字段列表: nextFields,
    });
    onChange(nextFields);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...(fields || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    console.log("[字段编辑器][字段列表更新] 移动字段", {
      原索引: index,
      方向: direction,
      目标索引: targetIndex,
      更新后字段列表: newFields,
    });
    onChange(newFields);
  };

  return (
    <Stack spacing={2} divider={<Divider sx={{ my: 1 }} />}>
      {(fields || []).map((field: TemplateField, index: number) => (
        <FieldRow
          key={field.id}
          field={field}
          index={index}
          fieldCount={fields.length}
          disabled={disabled}
          onUpdate={(updates) => handleUpdate(index, updates)}
          onRemove={() => removeField(index)}
          onMove={(dir) => moveField(index, dir)}
        />
      ))}
      <Button
        onClick={addField}
        disabled={disabled}
        startIcon={<AddIcon />}
        variant="contained"
        size="small"
        sx={{ alignSelf: "flex-start" }}
      >
        添加字段
      </Button>
    </Stack>
  );
}
