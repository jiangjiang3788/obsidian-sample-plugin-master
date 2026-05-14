// src/features/settings/fieldsEditor/FieldRow.tsx
/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import type { TemplateField, TemplateFieldOption } from "@core/public";
import { IconAction, SimpleSelect } from "@shared/public";
import { logRenderDiagnostic } from "../../../shared/debug/inputDiagnostics";
import { NativeTextarea, NativeTextInput } from "./nativeControls";
import { OptionRow } from "./OptionRow";

const fieldTypeOptions = [
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "time", label: "时间" },
  { value: "select", label: "下拉选择" },
  { value: "radio", label: "单选按钮" },
  { value: "rating", label: "评分" },
];

export function FieldRow({
  field,
  index,
  fieldCount,
  disabled = false,
  onUpdate,
  onRemove,
  onMove,
}: {
  field: TemplateField;
  index: number;
  fieldCount: number;
  disabled?: boolean;
  onUpdate: (updates: Partial<TemplateField>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [localName, setLocalName] = useState(field.label || field.key);
  const [localDefaultValue, setLocalDefaultValue] = useState(
    field.defaultValue || "",
  );
  const [isEditing, setIsEditing] = useState(false);
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
    console.log("[字段编辑器][字段名称编辑] 字段名称输入框失焦", {
      字段id: field.id,
      原字段名: field.label || field.key,
      输入值: localName,
      去空格后: trimmedName,
    });
    if (trimmedName && trimmedName !== (field.label || field.key)) {
      onUpdate({ key: trimmedName, label: trimmedName });
    } else {
      setLocalName(field.label || field.key);
    }
    setIsEditing(false);
  };

  const handleOptionChange = (
    optIndex: number,
    newOption: TemplateFieldOption,
  ) => {
    const newOptions = [...(field.options || [])];
    newOptions[optIndex] = newOption;
    console.log("[字段编辑器][选项编辑] 更新选项到字段", {
      字段: field.key,
      选项索引: optIndex,
      新选项列表: newOptions,
    });
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(field.options || [])];
    newOptions.push({ value: "🆕", label: String(newOptions.length + 1) });
    console.log("[字段编辑器][选项编辑] 添加选项", {
      字段: field.key,
      新选项列表: newOptions,
    });
    onUpdate({ options: newOptions });
  };

  const removeOption = (optIndex: number) => {
    const nextOptions = (field.options || []).filter((_, i) => i !== optIndex);
    console.log("[字段编辑器][选项编辑] 删除选项", {
      字段: field.key,
      删除索引: optIndex,
      新选项列表: nextOptions,
    });
    onUpdate({ options: nextOptions });
  };

  const showOptionsEditor = ["select", "radio", "rating"].includes(field.type);
  const isCategoryLike =
    ["select", "radio"].includes(field.type) &&
    ((field.semanticType || "") === "path" ||
      String(field.key || field.label || "").includes("分类"));
  const isRatingLike =
    field.type === "rating" || field.semanticType === "ratingPair";
  const showDefaultValueEditor = [
    "text",
    "textarea",
    "number",
    "date",
    "time",
  ].includes(field.type);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ minWidth: 120, flexShrink: 0 }}>
          <SimpleSelect
            value={field.type}
            options={fieldTypeOptions}
            onChange={(val) => {
              console.log("[字段编辑器][字段类型编辑] 修改字段类型", {
                字段: field.key,
                原类型: field.type,
                新类型: val,
              });
              onUpdate({ type: val as TemplateField["type"] });
            }}
            disabled={disabled}
            sx={{ minWidth: 120, flexShrink: 0 }}
          />
        </Box>
        <NativeTextInput
          label="字段名称"
          placeholder="例如：任务内容"
          value={localName}
          onInput={(value) => {
            console.log(
              "[字段编辑器][字段名称编辑] 正在输入字段名称 native onInput",
              { 字段id: field.id, 输入值: value },
            );
            setLocalName(value);
          }}
          onBlur={handleNameBlur}
          onFocus={() => setIsEditing(true)}
          disabled={disabled}
          style={{ flexGrow: 1 }}
          title="该名称将作为表单项的标题，并在模板中通过 {{字段名称}} 的形式引用"
        />

        {field.type === "number" && (
          <Stack direction="row" spacing={1}>
            <NativeTextInput
              label="Min"
              type="number"
              value={field.min ?? ""}
              onInput={(value) =>
                onUpdate({ min: value === "" ? undefined : Number(value) })
              }
              disabled={disabled}
              style={{ width: 80 }}
            />
            <NativeTextInput
              label="Max"
              type="number"
              value={field.max ?? ""}
              onInput={(value) =>
                onUpdate({ max: value === "" ? undefined : Number(value) })
              }
              disabled={disabled}
              style={{ width: 80 }}
            />
          </Stack>
        )}
        <Stack direction="row" sx={{ pt: 2.5 }}>
          <IconAction
            label="上移"
            disabled={disabled || index === 0}
            onClick={() => onMove("up")}
            icon={<ArrowUpwardIcon sx={{ fontSize: "1.1rem" }} />}
          />
          <IconAction
            label="下移"
            disabled={disabled || index === fieldCount - 1}
            onClick={() => onMove("down")}
            icon={<ArrowDownwardIcon sx={{ fontSize: "1.1rem" }} />}
          />
        </Stack>
        <Box sx={{ pt: 2.5 }}>
          <IconAction
            label="删除此字段"
            disabled={disabled}
            onClick={onRemove}
            color="error"
            icon={<DeleteIcon />}
          />
        </Box>
      </Stack>

      {showDefaultValueEditor &&
        (field.type === "textarea" ? (
          <NativeTextarea
            label="默认值"
            value={localDefaultValue}
            rows={3}
            onInput={(value) => {
              console.log(
                "[字段编辑器][默认值编辑] 正在输入默认值 native onInput",
                { 字段: field.key, 输入值: value },
              );
              setLocalDefaultValue(value);
              // 默认值实时进入上层草稿，保存不再依赖 blur 提交。
              onUpdate({ defaultValue: value });
            }}
            onBlur={() => {
              console.log(
                "[字段编辑器][默认值编辑] 默认值失焦，提交到上层覆写草稿",
                {
                  字段: field.key,
                  默认值: localDefaultValue,
                },
              );
              onUpdate({ defaultValue: localDefaultValue });
            }}
            disabled={disabled}
            placeholder="可使用 {{moment:YYYY-MM-DD}}、{{theme}} 等模板变量"
            style={{
              marginTop: 12,
              marginLeft: 48,
              width: "calc(100% - 48px)",
            }}
          />
        ) : (
          <NativeTextInput
            label="默认值"
            value={localDefaultValue}
            type={
              field.type === "number"
                ? "number"
                : field.type === "date"
                  ? "date"
                  : field.type === "time"
                    ? "time"
                    : "text"
            }
            onInput={(value) => {
              console.log(
                "[字段编辑器][默认值编辑] 正在输入默认值 native onInput",
                { 字段: field.key, 输入值: value },
              );
              setLocalDefaultValue(value);
              // 默认值实时进入上层草稿，保存不再依赖 blur 提交。
              onUpdate({ defaultValue: value });
            }}
            onBlur={() => {
              console.log(
                "[字段编辑器][默认值编辑] 默认值失焦，提交到上层覆写草稿",
                {
                  字段: field.key,
                  默认值: localDefaultValue,
                },
              );
              onUpdate({ defaultValue: localDefaultValue });
            }}
            disabled={disabled}
            placeholder="可使用 {{moment:YYYY-MM-DD}}、{{theme}} 等模板变量"
            style={{
              marginTop: 12,
              marginLeft: 48,
              width: "calc(100% - 48px)",
            }}
          />
        ))}

      {showOptionsEditor && (
        <Box sx={{ mt: 2, pl: 2, ml: 6 }}>
          {isRatingLike ? (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block", mb: 1 }}
            >
              推荐：label 填评分数值，value 填显示资源。模板中优先写 评分::{" "}
              {"{{字段名.label}}"} 与 评图:: {"{{字段名.value}}"}。
            </Typography>
          ) : isCategoryLike ? (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block", mb: 1 }}
            >
              推荐：分类/主题这类路径字段保留对象值，模板中优先写{" "}
              {"{{字段名.value}}"} 保存完整路径，{"{{字段名.label}}"} 用于显示。
            </Typography>
          ) : null}
          <Stack
            spacing={1.5}
            divider={<Divider flexItem sx={{ borderStyle: "dashed" }} />}
          >
            {(field.options || []).map((option, optIndex) => (
              <OptionRow
                key={optIndex}
                option={option}
                onChange={(newOpt) => handleOptionChange(optIndex, newOpt)}
                onRemove={() => removeOption(optIndex)}
                fieldType={field.type}
                disabled={disabled}
              />
            ))}
          </Stack>
          <Button
            onClick={addOption}
            disabled={disabled}
            startIcon={<AddIcon />}
            size="small"
            sx={{ alignSelf: "flex-start", mt: 1.5 }}
          >
            添加选项
          </Button>
        </Box>
      )}
    </Box>
  );
}
