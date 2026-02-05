// @ts-nocheck
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { App } from 'obsidian';

import { useZustandAppStore } from '@/app/public';
import type { TemplateField, ThemeDefinition } from '@core/public';
import { buildThemeTree, type ThemeTreeNode } from '@core/public';
import { dayjs, renderTemplate } from '@core/public';
import { getEffectiveTemplate } from '@core/public';

import { computeLinkedTimeChanges, finalizeLinkedTimeFields } from '@shared/utils/linkedTimeFields';

import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup as MuiRadioGroup,
  Stack,
  Typography,
} from '@mui/material';

import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';

// 一个稳定的空对象引用：避免因为 `{}` 的引用变化造成不必要的 rerender（甚至触发上层状态回写链路）。
const EMPTY_FORM_DATA: Record<string, any> = {};

/**
 * 将 QuickInput 表单中的“时间/结束/时长”字段收敛成一致的最终数据。
 * - 复用 QuickInputModal 的逻辑（你更偏好的写入行为）
 * - 同时去掉 UI 内部状态字段 lastChanged，避免被写入
 */
export function finalizeQuickInputFormData(formData: Record<string, any>) {
  const finalData = { ...formData };
  delete finalData.lastChanged;

  return finalizeLinkedTimeFields(
    finalData,
    { startKey: '时间', endKey: '结束', durationKey: '时长' },
    { durationOutput: 'number' }
  );
}

const findNodePath = (nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode[] => {
  for (const node of nodes) {
    if (node.themeId === themeId) return [node];
    if (node.children.length > 0) {
      const path = findNodePath(node.children, themeId);
      if (path.length > 0) return [node, ...path];
    }
  }
  return [];
};

const renderThemeLevels = (
  nodes: ThemeTreeNode[],
  activePath: ThemeTreeNode[],
  onSelect: (id: string, parentId: string | null) => void,
  level = 0
) => {
  const parentNode = activePath[level - 1];
  const parentThemeId = parentNode ? parentNode.themeId : null;
  return (
    <div>
      <MuiRadioGroup row value={activePath[level]?.themeId || ''}>
        {nodes.map((node) => (
          <FormControlLabel
            key={node.id}
            value={node.themeId}
            disabled={!node.themeId}
            control={<Radio onClick={() => node.themeId && onSelect(node.themeId, parentThemeId)} size="small" />}
            label={node.name}
          />
        ))}
      </MuiRadioGroup>
      {activePath[level] && activePath[level].children.length > 0 && (
        <div style={{ paddingLeft: '20px' }}>{renderThemeLevels(activePath[level].children, activePath, onSelect, level + 1)}</div>
      )}
    </div>
  );
};

export interface QuickInputEditorState {
  blockId: string;
  themeId: string | null;
  formData: Record<string, any>;
  template: any;
  theme: ThemeDefinition | null;
}

export interface QuickInputEditorProps {
  app: App;
  initialBlockId: string;
  context?: Record<string, any>;
  initialThemeId?: string | null;
  initialFormData?: Record<string, any>;
  allowBlockSwitch?: boolean;
  dense?: boolean;
  showDivider?: boolean;
  onStateChange?: (state: QuickInputEditorState) => void;
}

/**
 * QuickInputEditor
 * - 抽出 QuickInputModal / AiBatchConfirmModal 里的大段表单 + 主题选择 + 字段渲染
 * - 只负责“编辑区”，不包含外层 Modal 壳和底部按钮
 */
export function QuickInputEditor({
  app,
  initialBlockId,
  context,
  initialThemeId = null,
  initialFormData,
  allowBlockSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
}: QuickInputEditorProps) {
  const settings = useZustandAppStore((state) => state.settings.inputSettings);
  const [currentBlockId, setCurrentBlockId] = useState(initialBlockId);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialThemeId);
  const [formData, setFormData] = useState<Record<string, any>>(() => initialFormData ?? EMPTY_FORM_DATA);

  // 当外部切换 record 时（通常 key 会变），仍然兜底同步一次
  useEffect(() => setCurrentBlockId(initialBlockId), [initialBlockId]);
  useEffect(() => setSelectedThemeId(initialThemeId ?? null), [initialThemeId]);
  /**
   * ⚠️ 重要：不要把 formData 的同步依赖写成 [initialFormData]
   * 因为调用方非常容易写出 initialFormData={{}} 这种“每次 render 都是新对象”的写法，
   * 进而触发 setFormData -> onStateChange -> 父组件 setState -> 再 render 的死循环，导致 UI 卡死。
   *
   * 这里用“记录身份”来判定是否需要重置（block/theme 变化通常意味着换了一条记录）。
   * 如需更强的重置语义，请在调用方使用 <QuickInputEditor key={recordId} ... /> 强制 remount。
   */
  useEffect(() => {
    setFormData(initialFormData ?? EMPTY_FORM_DATA);
  }, [initialBlockId, initialThemeId]);

  const blocks = useMemo(() => settings.blocks || [], [settings.blocks]);
  const themes = useMemo(() => settings.themes || [], [settings.themes]);

  const { themeTree, themeIdMap } = useMemo(() => {
    const disabledThemeIds = new Set<string>();
    settings.overrides.forEach((override) => {
      if (override.blockId === currentBlockId && override.disabled) {
        disabledThemeIds.add(override.themeId);
      }
    });
    const availableThemes = themes.filter((theme) => !disabledThemeIds.has(theme.id));
    return {
      themeTree: buildThemeTree(availableThemes),
      themeIdMap: new Map<string, ThemeDefinition>(themes.map((t) => [t.id, t])),
    };
  }, [settings, themes, currentBlockId]);

  const { template, theme } = useMemo(() => {
    return getEffectiveTemplate(settings, currentBlockId, selectedThemeId || undefined);
  }, [settings, currentBlockId, selectedThemeId]);

  // 初始化默认值/从 context 回填
  useEffect(() => {
    if (!template) return;

    setFormData((current) => {
      const dataForParsing = {
        ...context,
        theme: theme ? { path: theme.path, icon: theme.icon || '' } : {},
      };

      let changed = false;
      const next: Record<string, any> = { ...current };

      const assignIfChanged = (key: string, value: any) => {
        const prev = next[key];

        const isObj = value && typeof value === 'object';
        const isOptionObj = isObj && 'value' in value && 'label' in value;
        const prevIsObj = prev && typeof prev === 'object';
        const prevIsOptionObj = prevIsObj && 'value' in prev && 'label' in prev;

        const same = isOptionObj && prevIsOptionObj ? prev.value === value.value && prev.label === value.label : prev === value;
        if (!same) {
          next[key] = value;
          changed = true;
        }
      };

      template.fields.forEach((field: any) => {
        // 保留已有输入
        if (next[field.key] !== undefined && next[field.key] !== '') return;

        let valueAssigned = false;
        const contextValue = context?.[field.key] ?? context?.[field.label];

        if (contextValue !== undefined) {
          if (['select', 'radio', 'rating'].includes(field.type)) {
            const matchedOption = (field.options || []).find((opt: any) => opt.value === contextValue || opt.label === contextValue);
            if (matchedOption) {
              assignIfChanged(field.key, { value: matchedOption.value, label: matchedOption.label || matchedOption.value });
            } else {
              assignIfChanged(field.key, contextValue);
            }
          } else {
            assignIfChanged(field.key, contextValue);
          }
          valueAssigned = true;
        }

        if (!valueAssigned) {
          const isSelectable = ['select', 'radio', 'rating'].includes(field.type);
          if (field.defaultValue) {
            if (isSelectable) {
              const findOption = (val: string | undefined) => (field.options || []).find((o: any) => o.label === val || o.value === val);
              let defaultOpt = findOption(field.defaultValue as string);
              if (!defaultOpt && field.options && field.options.length > 0) defaultOpt = field.options[0];
              if (defaultOpt) {
                assignIfChanged(field.key, { value: defaultOpt.value, label: defaultOpt.label || defaultOpt.value });
              }
            } else {
              let finalDefaultValue = field.defaultValue || '';
              if (typeof finalDefaultValue === 'string') {
                finalDefaultValue = renderTemplate(finalDefaultValue, dataForParsing);
              }
              assignIfChanged(field.key, finalDefaultValue);
            }
          } else {
            if (field.type === 'date') {
              assignIfChanged(field.key, dayjs().format('YYYY-MM-DD'));
            } else if (field.type === 'time') {
              assignIfChanged(field.key, dayjs().format('HH:mm'));
            } else if (isSelectable && field.options && field.options.length > 0) {
              const firstOption = field.options[0];
              assignIfChanged(field.key, { value: firstOption.value, label: firstOption.label || firstOption.value });
            }
          }
        }
      });

      // ✅ 如果本轮并没有真正赋值/回填任何字段，直接返回 current，避免无意义 rerender 甚至死循环。
      return changed ? next : current;
    });
  }, [template, theme, context]);

  // 智能时间字段联动（时间/结束/时长）
  useEffect(() => {
    const changes = computeLinkedTimeChanges(
      formData,
      { startKey: '时间', endKey: '结束', durationKey: '时长' },
      formData.lastChanged,
      { durationOutput: 'number' }
    );

    if (Object.keys(changes).length > 0) {
      setFormData((current) => ({ ...current, ...changes, lastChanged: undefined }));
    }
  }, [formData]);

  useEffect(() => {
    onStateChange?.({
      blockId: currentBlockId,
      themeId: selectedThemeId,
      formData,
      template,
      theme: selectedThemeId ? themeIdMap.get(selectedThemeId) ?? null : null,
    });
  }, [currentBlockId, selectedThemeId, formData, template]);

  const handleUpdate = (key: string, value: any, isOptionObject = false) => {
    setFormData((current) => ({
      ...current,
      [key]: isOptionObject ? { value: value.value, label: value.label } : value,
      lastChanged: key,
    }));
  };

  const handleBlockChange = (newBlockId: string) => {
    if (newBlockId === currentBlockId) return;
    const preservedData: Record<string, any> = {};
    const commonFields = ['内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description'];
    commonFields.forEach((key) => {
      if (formData[key] !== undefined) preservedData[key] = formData[key];
    });
    setCurrentBlockId(newBlockId);
    setFormData(preservedData);
  };

  const activePath = selectedThemeId ? findNodePath(themeTree, selectedThemeId) : [];
  const handleSelectTheme = (newThemeId: string, parentThemeId: string | null) => {
    setSelectedThemeId(selectedThemeId === newThemeId ? parentThemeId : newThemeId);
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
                const isImagePath = opt.value && (opt.value.endsWith('.png') || opt.value.endsWith('.jpg') || opt.value.endsWith('.svg'));
                const displayContent = isImagePath ? (
                  <img
                    src={app.vault.adapter.getResourcePath(opt.value)}
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

  if (!template) {
    return <div>错误：找不到ID为 "{currentBlockId}" 的Block模板。</div>;
  }

  // “日期 + 时间字段并排”的布局逻辑（来自 QuickInputModal）
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
      const sortedTimeFields = timeFieldKeys
        .map((key) => timeFields.find((f) => f.key === key))
        .filter((f) => f !== undefined);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1.5 : 2 }}>
      {/* Block 类型选择器 */}
      {allowBlockSwitch && blocks.length > 1 && (
        <FormControl fullWidth>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            记录类型
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {blocks.map((block: any) => (
              <Button
                key={block.id}
                variant={currentBlockId === block.id ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleBlockChange(block.id)}
                sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.875rem' }}
              >
                {block.name}
              </Button>
            ))}
          </Box>
        </FormControl>
      )}

      {/* 主题选择 */}
      {themeTree.length > 0 && (
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            主题分类
          </Typography>
          <Box
            sx={{
              maxHeight: dense ? '100px' : '120px',
              overflowY: 'auto',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: 1,
              p: 1,
            }}
          >
            {renderThemeLevels(themeTree, activePath, handleSelectTheme)}
          </Box>
        </FormControl>
      )}

      {showDivider && <Divider sx={{ my: dense ? 1 : 2 }} />}

      <Stack spacing={dense ? 1.75 : 2.5}>{renderFields()}</Stack>
    </Box>
  );
}
