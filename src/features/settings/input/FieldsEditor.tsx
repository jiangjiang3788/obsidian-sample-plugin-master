// src/features/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import { Box, Button, Divider, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { TemplateField } from "@core/public";
import { createCustomTemplateField, sanitizeTemplateField, sanitizeTemplateFields } from "@core/public";
import { logRenderDiagnostic } from "@shared/public";
import { FieldRow } from "./fieldsEditor/FieldRow";

function createEmptyField(index: number): TemplateField {
  return createCustomTemplateField(index);
}

function reorderFields(fields: TemplateField[], fromIndex: number, toIndex: number): TemplateField[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= fields.length || toIndex >= fields.length) {
    return fields;
  }
  const next = [...fields];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

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
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  renderCountRef.current += 1;

  useEffect(() => {
    logRenderDiagnostic("FieldsEditor", {
      renderCount: renderCountRef.current,
      disabled,
      fieldsRefChanged:
        previousFieldsRef.current !== null && previousFieldsRef.current !== fields,
      fieldsCount: fields.length,
      fieldIds: fields.map((field) => field.id),
    });
    previousFieldsRef.current = fields;
  });

  const emitFields = (nextFields: TemplateField[]) => {
    onChange(sanitizeTemplateFields(nextFields));
  };

  const handleUpdate = (index: number, updates: Partial<TemplateField>) => {
    const newFields = sanitizeTemplateFields(fields || []);
    newFields[index] = sanitizeTemplateField({ ...newFields[index], ...updates }, index + 1);
    emitFields(newFields);
  };

  const addField = () => emitFields([...(fields || []), createEmptyField((fields || []).length + 1)]);

  const removeField = (index: number) => {
    emitFields((fields || []).filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    emitFields(reorderFields(fields || [], index, targetIndex));
  };

  const handleDropOn = (targetIndex: number) => {
    if (draggingIndex === null || disabled) return;
    emitFields(reorderFields(fields || [], draggingIndex, targetIndex));
    setDraggingIndex(null);
  };

  return (
    <Stack spacing={1.25}>
      <Box>
        <Button onClick={addField} disabled={disabled} startIcon={<AddIcon />} variant="contained" size="small">
          添加字段
        </Button>
      </Box>

      <Stack spacing={0} divider={<Divider sx={{ my: 0.75 }} />}>
        {(fields || []).map((field: TemplateField, index: number) => (
          <Box
            key={field.id}
            draggable={!disabled}
            onDragStart={(event) => {
              if (disabled) return;
              setDraggingIndex(index);
              event.dataTransfer?.setData("text/plain", String(index));
              if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              if (disabled || draggingIndex === null) return;
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDropOn(index);
            }}
            onDragEnd={() => setDraggingIndex(null)}
            sx={{
              opacity: draggingIndex === index ? 0.55 : 1,
              borderRadius: 1,
            }}
          >
            <FieldRow
              field={field}
              index={index}
              fieldCount={fields.length}
              disabled={disabled}
              isDragging={draggingIndex === index}
              onUpdate={(updates) => handleUpdate(index, updates)}
              onRemove={() => removeField(index)}
              onMove={(dir) => moveField(index, dir)}
            />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
