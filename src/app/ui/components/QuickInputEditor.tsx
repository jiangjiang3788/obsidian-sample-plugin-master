/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { selectInputSettings, useSelector } from '@/app/public';
import type { ThemeDefinition } from '@core/public';
import { buildThemeTree, type ThemeTreeNode, dayjs, getEffectiveTemplate, renderTemplate } from '@core/public';
import { computeLinkedTimeChanges, finalizeLinkedTimeFields } from '@shared/public';

import { QuickInputEditorView } from './QuickInputEditorView';

// 稳定空引用：避免调用方传入 `initialFormData={{}}` 造成死循环。
const EMPTY_FORM_DATA: Record<string, any> = {};

/** 将“时间/结束/时长”字段收敛成最终数据，并去掉 lastChanged。 */
export function finalizeQuickInputFormData(formData: Record<string, any>) {
  const finalData = { ...formData };
  delete finalData.lastChanged;
  return finalizeLinkedTimeFields(finalData, { startKey: '时间', endKey: '结束', durationKey: '时长' }, { durationOutput: 'number' });
}

const findNodePath = (nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode[] => {
  for (const node of nodes) {
    if (node.themeId === themeId) return [node];
    if (node.children.length) {
      const path = findNodePath(node.children, themeId);
      if (path.length) return [node, ...path];
    }
  }
  return [];
};

export interface QuickInputEditorState {
  blockId: string;
  themeId: string | null;
  formData: Record<string, any>;
  template: any;
  theme: ThemeDefinition | null;
}

export interface QuickInputEditorProps {
  /** 用于渲染 rating 图片资源（由 platform 注入）。 */
  getResourcePath: (path: string) => string;
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
 * QuickInputEditor（Container）
 * - 状态/订阅/副作用在这里
 * - 纯渲染交给 QuickInputEditorView
 */
export function QuickInputEditor({
  getResourcePath,
  initialBlockId,
  context,
  initialThemeId = null,
  initialFormData,
  allowBlockSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
}: QuickInputEditorProps) {
  const settings = useSelector(selectInputSettings);

  const [currentBlockId, setCurrentBlockId] = useState(initialBlockId);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialThemeId);
  const [formData, setFormData] = useState<Record<string, any>>(() => initialFormData ?? EMPTY_FORM_DATA);

  useEffect(() => setCurrentBlockId(initialBlockId), [initialBlockId]);
  useEffect(() => setSelectedThemeId(initialThemeId ?? null), [initialThemeId]);
  // 不要依赖 initialFormData（可能是新对象）→ 用 block/theme 变化作为 reset 语义。
  useEffect(() => setFormData(initialFormData ?? EMPTY_FORM_DATA), [initialBlockId, initialThemeId]);

  const blocks = useMemo(() => settings.blocks || [], [settings.blocks]);
  const themes = useMemo(() => settings.themes || [], [settings.themes]);

  const { themeTree, themeIdMap } = useMemo(() => {
    const disabledThemeIds = new Set<string>();
    (settings.overrides || []).forEach((override: any) => {
      if (override.blockId === currentBlockId && override.disabled) disabledThemeIds.add(override.themeId);
    });
    const availableThemes = themes.filter((t: any) => !disabledThemeIds.has(t.id));
    return {
      themeTree: buildThemeTree(availableThemes),
      themeIdMap: new Map<string, ThemeDefinition>(themes.map((t: any) => [t.id, t])),
    };
  }, [settings, themes, currentBlockId]);

  const { template, theme } = useMemo(() => getEffectiveTemplate(settings, currentBlockId, selectedThemeId || undefined), [
    settings,
    currentBlockId,
    selectedThemeId,
  ]);

  // 默认值/从 context 回填
  useEffect(() => {
    if (!template) return;

    setFormData((current) => {
      const dataForParsing = { ...context, theme: theme ? { path: theme.path, icon: theme.icon || '' } : {} };
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
        if (next[field.key] !== undefined && next[field.key] !== '') return;

        let valueAssigned = false;
        const contextValue = context?.[field.key] ?? context?.[field.label];

        if (contextValue !== undefined) {
          if (['select', 'radio', 'rating'].includes(field.type)) {
            const matched = (field.options || []).find((opt: any) => opt.value === contextValue || opt.label === contextValue);
            assignIfChanged(field.key, matched ? { value: matched.value, label: matched.label || matched.value } : contextValue);
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
              let opt = findOption(field.defaultValue as string);
              if (!opt && field.options?.length) opt = field.options[0];
              if (opt) assignIfChanged(field.key, { value: opt.value, label: opt.label || opt.value });
            } else {
              let v = field.defaultValue || '';
              if (typeof v === 'string') v = renderTemplate(v, dataForParsing);
              assignIfChanged(field.key, v);
            }
          } else {
            if (field.type === 'date') assignIfChanged(field.key, dayjs().format('YYYY-MM-DD'));
            else if (field.type === 'time') assignIfChanged(field.key, dayjs().format('HH:mm'));
            else if (isSelectable && field.options?.length) {
              const first = field.options[0];
              assignIfChanged(field.key, { value: first.value, label: first.label || first.value });
            }
          }
        }
      });

      return changed ? next : current;
    });
  }, [template, theme, context]);

  // 时间字段联动（时间/结束/时长）
  useEffect(() => {
    const changes = computeLinkedTimeChanges(formData, { startKey: '时间', endKey: '结束', durationKey: '时长' }, (formData as any).lastChanged, {
      durationOutput: 'number',
    });
    if (Object.keys(changes).length) setFormData((cur) => ({ ...cur, ...changes, lastChanged: undefined }));
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

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    setFormData((cur) => ({ ...cur, [key]: isOptionObject ? { value: value.value, label: value.label } : value, lastChanged: key }));
  };

  const handleBlockChange = (newBlockId: string) => {
    if (newBlockId === currentBlockId) return;
    const preserved: Record<string, any> = {};
    ['内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description'].forEach((k) => {
      if (formData[k] !== undefined) preserved[k] = formData[k];
    });
    setCurrentBlockId(newBlockId);
    setFormData(preserved);
  };

  const activePath = selectedThemeId ? findNodePath(themeTree, selectedThemeId) : [];
  const handleSelectTheme = (newThemeId: string, parentThemeId: string | null) => {
    setSelectedThemeId(selectedThemeId === newThemeId ? parentThemeId : newThemeId);
  };

  return (
    <QuickInputEditorView
      getResourcePath={getResourcePath}
      blocks={blocks}
      allowBlockSwitch={allowBlockSwitch}
      currentBlockId={currentBlockId}
      onBlockChange={handleBlockChange}
      themeTree={themeTree}
      activePath={activePath}
      onSelectTheme={handleSelectTheme}
      template={template}
      formData={formData}
      dense={dense}
      showDivider={showDivider}
      onUpdateField={handleUpdateField}
    />
  );
}
