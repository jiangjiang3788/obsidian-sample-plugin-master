// src/features/settings/input/fieldsEditor/OptionRow.tsx
/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import { Box, Stack } from '@shared/public';
import { IconAction, RemoveCircleOutlineIcon, logRenderDiagnostic } from '@shared/public';
import type { TemplateField, TemplateFieldOption } from "@core/public";
import { NativeTextInput } from "./nativeControls";

export function OptionRow({
  option,
  onChange,
  onRemove,
  fieldType,
  disabled = false,
}: {
  option: TemplateFieldOption;
  onChange: (newOption: TemplateFieldOption) => void;
  onRemove: () => void;
  fieldType: TemplateField["type"];
  disabled?: boolean;
}) {
  const [localOption, setLocalOption] = useState(option);
  const renderCountRef = useRef(0);
  const previousOptionRef = useRef<TemplateFieldOption | null>(null);
  renderCountRef.current += 1;

  useEffect(() => {
    logRenderDiagnostic("FieldsEditor/OptionRow", {
      renderCount: renderCountRef.current,
      fieldType,
      disabled,
      optionRefChanged:
        previousOptionRef.current !== null &&
        previousOptionRef.current !== option,
      option,
      localOption,
    });
    previousOptionRef.current = option;
  });

  useEffect(() => {
    setLocalOption(option);
  }, [option]);

  const commitOption = (nextOption: TemplateFieldOption, reason: string) => {
    if (
      (nextOption.label || "") === (option.label || "") &&
      nextOption.value === option.value
    )
      return;
    logRenderDiagnostic("FieldsEditor/OptionRow/commit", {
      reason,
      fieldType,
      option: nextOption,
    });
    onChange(nextOption);
  };

  const updateLocalOption = (
    updates: Partial<TemplateFieldOption>,
    reason: string,
  ) => {
    setLocalOption((previous) => {
      const next = { ...previous, ...updates };
      logRenderDiagnostic("FieldsEditor/OptionRow/input", {
        reason,
        updates,
        nextOption: next,
      });
      return next;
    });
  };

  const handleBlur = () => {
    commitOption(localOption, "选项输入框失焦，提交到字段草稿");
  };

  const isRating = fieldType === "rating";
  const labelLabel = isRating ? "评分数值" : "选项标签";
  const valueLabel = isRating ? "显示内容 (Emoji/图片路径)" : "选项值";

  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
      <NativeTextInput
        label={labelLabel}
        value={localOption.label || ""}
        onInput={(value) => {
          const nextOption = { ...localOption, label: value };
          updateLocalOption({ label: value }, "编辑选项标签 native onInput");
          // 同步提交到上层草稿，避免点击“保存”时依赖 blur/setState 时序。
          onChange(nextOption);
        }}
        onBlur={handleBlur}
        disabled={disabled}
        style={{ flex: 1 }}
      />
      <NativeTextInput
        label={valueLabel}
        value={localOption.value}
        onInput={(value) => {
          const nextOption = { ...localOption, value };
          updateLocalOption({ value }, "编辑选项值 native onInput");
          // 同步提交到上层草稿，避免点击“保存”时依赖 blur/setState 时序。
          onChange(nextOption);
        }}
        onBlur={handleBlur}
        disabled={disabled}
        style={{ flex: 1 }}
      />
      <Box sx={{ pt: 2.5 }}>
        <IconAction
          label="删除此选项"
          disabled={disabled}
          onClick={onRemove}
          icon={<RemoveCircleOutlineIcon fontSize="small" />}
        />
      </Box>
    </Stack>
  );
}
