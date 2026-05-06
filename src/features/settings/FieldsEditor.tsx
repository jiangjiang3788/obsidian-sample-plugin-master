// src/features/settings/ui/components/FieldsEditor.tsx
/** @jsxImportSource preact */
import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { Box, Stack, Button, Typography, Divider } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import type { JSX } from "preact";
import type { TemplateField, TemplateFieldOption } from "@core/public";
import { IconAction, SimpleSelect } from "@shared/public";
import {
  logInputEvent,
  logRenderDiagnostic,
} from "../../shared/debug/inputDiagnostics";

type NativeInputEvent = Event & {
  currentTarget: HTMLInputElement | HTMLTextAreaElement;
};

function readInputValue(event: Event): string {
  return (
    (event.target || event.currentTarget) as
      | HTMLInputElement
      | HTMLTextAreaElement
  ).value;
}

function stopEditorEvent(event: Event) {
  // Obsidian 的工作区、悬浮窗和快捷键系统会监听冒泡阶段的鼠标/键盘事件。
  // 输入控件必须截断这些事件，否则会出现“能 focus，但无法选中文字/无法稳定输入”的现象。
  event.stopPropagation();
}

const nativeControlBaseStyle: JSX.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--background-modifier-border)",
  borderRadius: 6,
  background: "var(--background-primary)",
  color: "var(--text-normal)",
  padding: "8px 10px",
  font: "inherit",
  lineHeight: 1.4,
  userSelect: "text",
  WebkitUserSelect: "text",
  pointerEvents: "auto",
};

const nativeLabelStyle: JSX.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

function NativeTextInput({
  label,
  value,
  onInput,
  onBlur,
  onFocus,
  disabled = false,
  placeholder,
  type = "text",
  title,
  style,
}: {
  label: string;
  value: string | number;
  onInput: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  title?: string;
  style?: JSX.CSSProperties;
}) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }} title={title}>
      <span style={nativeLabelStyle}>{label}</span>
      <input
        type={type}
        value={value as any}
        disabled={disabled}
        placeholder={placeholder}
        data-think-diag-control={label}
        onPointerDown={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onPointerDown",
          })
        }
        onMouseDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onMouseDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onDblClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onDblClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onKeyDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyUp={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onKeyUp before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onBeforeInput={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onBeforeInput",
          })
        }
        onInput={(event: NativeInputEvent) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onInput before local update",
            nextValue: readInputValue(event),
          });
          onInput(readInputValue(event));
        }}
        onChange={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onChange",
          })
        }
        onBlur={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onBlur before commit",
          });
          onBlur?.();
        }}
        onFocus={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onFocus",
          });
          onFocus?.();
        }}
        style={{
          ...nativeControlBaseStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}

function NativeTextarea({
  label,
  value,
  onInput,
  onBlur,
  disabled = false,
  placeholder,
  rows = 3,
  style,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  style?: JSX.CSSProperties;
}) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span style={nativeLabelStyle}>{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        data-think-diag-control={label}
        onPointerDown={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onPointerDown",
          })
        }
        onMouseDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onMouseDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onDblClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onDblClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onKeyDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyUp={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onKeyUp before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onBeforeInput={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onBeforeInput",
          })
        }
        onInput={(event: NativeInputEvent) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onInput before local update",
            nextValue: readInputValue(event),
          });
          onInput(readInputValue(event));
        }}
        onChange={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onChange",
          })
        }
        onBlur={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onBlur before commit",
          });
          onBlur?.();
        }}
        style={{
          ...nativeControlBaseStyle,
          resize: "vertical",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}

function OptionRow({
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
    console.log("[字段编辑器][选项编辑]", {
      原因: reason,
      字段类型: fieldType,
      选项: nextOption,
    });
    onChange(nextOption);
  };

  const updateLocalOption = (
    updates: Partial<TemplateFieldOption>,
    reason: string,
  ) => {
    setLocalOption((previous) => {
      const next = { ...previous, ...updates };
      console.log("[字段编辑器][选项输入]", {
        原因: reason,
        更新内容: updates,
        更新后选项: next,
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

function FieldRow({
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
