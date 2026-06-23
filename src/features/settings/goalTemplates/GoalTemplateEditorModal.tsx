/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Box, Button, Divider, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, Typography, diagnosticError } from '@shared/public';
import type { JSX } from 'preact';
import { FloatingPanel, selectSettings, useSelector, useUiPort, type UseCases } from '@/app/public';
import type { CoreBlockDefinition } from '@core/public';
import type { GoalDefinition, GoalTemplate, TemplateField } from '@core/public';
import { getGoalTemplateId, isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity, isSystemRecordContextField, compactGoalTemplateForStorage, describeGoalTemplateStorageDiff } from '@core/public';
import { FieldsEditor } from '../input/FieldsEditor';
import { TemplateVariableCopier } from '../input/TemplateVariableCopier';

type EditMode = 'inherit' | 'override' | 'disabled';

interface GoalTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalDefinition | null;
  block: CoreBlockDefinition | null;
  variants: GoalTemplate[];
  useCases: UseCases;
}

interface DraftState {
  variantId: string;
  name: string;
  description: string;
  isDefault: boolean;
  granularity: 'week' | 'month' | 'quarter' | 'year';
  sortOrder: number;
  fields: TemplateField[];
  outputTemplate: string;
  targetFile: string;
  appendUnderHeader: string;
  requiredFields: string[];
  defaultValues: Record<string, unknown>;
  themePath: string;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readInputValue(event: Event): string {
  return ((event.target || event.currentTarget) as HTMLInputElement | HTMLTextAreaElement).value;
}

function stopEditorEvent(event: Event) {
  event.stopPropagation();
}

const nativeControlBaseStyle: JSX.CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1px solid var(--background-modifier-border)',
  borderRadius: 6,
  background: 'var(--background-primary)',
  color: 'var(--text-normal)',
  padding: '8px 10px',
  font: 'inherit',
  lineHeight: 1.4,
  userSelect: 'text',
  WebkitUserSelect: 'text',
  pointerEvents: 'auto',
};

const nativeLabelStyle: JSX.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};


const presetGranularityOptions = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
];

const granularityLabelMap: Record<DraftState['granularity'], string> = {
  week: '周',
  month: '月',
  quarter: '季度',
  year: '年',
};

function normalizeThemePath(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || text === '{{goal.themePath}}') return '';
  return text;
}

function isThemeField(field: TemplateField): boolean {
  const anyField = field as any;
  const key = String(anyField.key || '').toLowerCase();
  const label = String(anyField.label || '');
  const semantic = String(anyField.semantic || anyField.semanticType || '').toLowerCase();
  return key === 'themepath' || key === '主题' || label === '主题' || semantic.includes('themepath');
}

function readThemePathFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isThemeField(field)) continue;
    const value = normalizeThemePath((field as any).defaultValue);
    if (value) return value;
  }
  return '';
}

function readThemePathFromTemplate(template: GoalTemplate | null | undefined): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return normalizeThemePath(values.themePath) || normalizeThemePath(values['主题']) || readThemePathFromFields(template?.fields as TemplateField[] | undefined);
}

function readPeriodGranularity(template: GoalTemplate | null | undefined, block: CoreBlockDefinition | null): DraftState['granularity'] {
  const rawPolicy = (template as any)?.periodPolicy || (block as any)?.periodPolicy;
  const rawGranularity = rawPolicy?.granularity || (template as any)?.granularity || (block as any)?.granularity;
  return normalizePeriodPolicyGranularity(rawGranularity) as DraftState['granularity'];
}

function buildDraftPeriodPolicy(block: CoreBlockDefinition | null, draft: Pick<DraftState, 'granularity'>) {
  return block && isPeriodAwareCoreBlock(block.id) ? { enabled: true, granularity: draft.granularity } : undefined;
}

function ensureThemeField(fields: TemplateField[], themePath: string): TemplateField[] {
  const normalizedTheme = normalizeThemePath(themePath);
  let found = false;
  const next = (fields || []).map((field) => {
    if (!isThemeField(field)) return field;
    found = true;
    return { ...(field as any), defaultValue: normalizedTheme || (field as any).defaultValue || '{{goal.themePath}}' } as TemplateField;
  });
  if (!found && normalizedTheme) {
    next.push({
      id: 'core.field.themePath',
      key: 'themePath',
      label: '主题',
      type: 'hierarchicalSingleSelect',
      semantic: 'themePath',
      semanticType: 'path',
      hierarchical: true,
      defaultValue: normalizedTheme,
    } as any);
  }
  return next;
}

function mergeDefaultValues(draft: DraftState, themeIcon?: string): Record<string, unknown> {
  const values: Record<string, unknown> = { ...(draft.defaultValues || {}), ...deriveDefaultValues(draft.fields || []) };
  const themePath = normalizeThemePath(draft.themePath) || normalizeThemePath(values.themePath) || normalizeThemePath(values['主题']);
  if (themePath) {
    values.themePath = themePath;
    values['主题'] = themePath;
  }
  if (themeIcon) {
    values.icon = themeIcon;
    values['图标'] = themeIcon;
  }
  return values;
}

function shortText(value: unknown, fallback = '—', max = 24): string {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function leafPath(value: unknown): string {
  const text = String(value ?? '').trim();
  return text.split('/').filter(Boolean).pop() || text;
}

function presetName(template: { name?: string; variantId?: string }): string {
  const name = String(template.name || '').trim();
  if (name) return name;
  const variantId = String(template.variantId || '').trim();
  if (variantId) return variantId.replace(/^legacy-/, '');
  return '默认预设';
}

function NativeTextInput({
  label,
  value,
  onInput,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={nativeLabelStyle}>{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onMouseDown={stopEditorEvent as any}
        onClick={stopEditorEvent as any}
        onDblClick={stopEditorEvent as any}
        onKeyDown={stopEditorEvent as any}
        onKeyUp={stopEditorEvent as any}
        onInput={(event) => onInput(readInputValue(event as any))}
        style={{ ...nativeControlBaseStyle, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
      />
    </label>
  );
}

function CompactCellInput({
  value,
  onInput,
  disabled = false,
  placeholder,
  type = 'text',
}: {
  value: string;
  onInput: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      type={type as any}
      disabled={disabled}
      placeholder={placeholder}
      onMouseDown={stopEditorEvent as any}
      onClick={stopEditorEvent as any}
      onDblClick={stopEditorEvent as any}
      onKeyDown={stopEditorEvent as any}
      onKeyUp={stopEditorEvent as any}
      onInput={(event) => onInput(readInputValue(event as any))}
      style={{
        ...nativeControlBaseStyle,
        padding: '5px 7px',
        minHeight: 30,
        fontSize: 13,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
    />
  );
}

function CompactCellSelect({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onMouseDown={stopEditorEvent as any}
      onClick={stopEditorEvent as any}
      onDblClick={stopEditorEvent as any}
      onKeyDown={stopEditorEvent as any}
      onKeyUp={stopEditorEvent as any}
      onChange={(event) => onChange(((event.target || event.currentTarget) as HTMLSelectElement).value)}
      style={{
        ...nativeControlBaseStyle,
        padding: '5px 7px',
        minHeight: 30,
        fontSize: 13,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function NativeTextarea({
  label,
  value,
  onInput,
  disabled = false,
  rows = 8,
}: {
  label?: string;
  value: string;
  onInput: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      {label ? <span style={nativeLabelStyle}>{label}</span> : null}
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        onMouseDown={stopEditorEvent as any}
        onClick={stopEditorEvent as any}
        onDblClick={stopEditorEvent as any}
        onKeyDown={stopEditorEvent as any}
        onKeyUp={stopEditorEvent as any}
        onInput={(event) => onInput(readInputValue(event as any))}
        style={{
          ...nativeControlBaseStyle,
          fontFamily: 'monospace',
          fontSize: '13px',
          resize: 'vertical',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </label>
  );
}

function makeVariantId(label: string): string {
  const text = String(label || '').trim();
  if (!text) return `variant-${Date.now()}`;
  return text.replace(/\s+/g, '-').replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-').replace(/^-+|-+$/g, '') || `variant-${Date.now()}`;
}

function makeDraftFromTemplate(template: GoalTemplate | null, block: CoreBlockDefinition | null, variants: GoalTemplate[]): DraftState {
  const variantId = template?.variantId || 'default';
  const index = Math.max(0, variants.findIndex((item) => (item.variantId || 'default') === variantId));
  const themePath = readThemePathFromTemplate(template) || readThemePathFromFields(block?.fields as TemplateField[] | undefined);
  const fields = ensureThemeField(cloneValue(template?.fields || block?.fields || []), themePath);
  return {
    variantId,
    name: template?.name || (variantId === 'default' ? '默认预设' : variantId),
    description: template?.description || '',
    isDefault: template?.isDefault !== undefined ? !!template.isDefault : variantId === 'default',
    granularity: readPeriodGranularity(template, block),
    sortOrder: template?.sortOrder ?? index * 10,
    fields,
    outputTemplate: template?.outputTemplate || block?.outputTemplate || '',
    targetFile: template?.targetFile || block?.targetFile || '',
    appendUnderHeader: template?.appendUnderHeader || block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: cloneValue(template?.requiredFields || []),
    defaultValues: cloneValue(template?.defaultValues || {}),
    themePath,
  };
}

function deriveRequiredFields(fields: TemplateField[]): string[] {
  return (fields || [])
    .filter((field: any) => field?.required === true)
    .map((field: any) => String(field.key || field.label || '').trim())
    .filter(Boolean);
}

function deriveDefaultValues(fields: TemplateField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields || []) {
    const key = String((field as any).key || (field as any).label || '').trim();
    if (!key) continue;
    const value = (field as any).defaultValue;
    if (value !== undefined && value !== null && String(value).trim() !== '') result[key] = value;
  }
  return result;
}


function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (input: any): any => {
    if (input === undefined) return undefined;
    if (input === null || typeof input !== 'object') return input;
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    if (Array.isArray(input)) return input.map(normalize);
    const out: Record<string, unknown> = {};
    Object.keys(input).sort().forEach((key) => {
      const value = normalize(input[key]);
      if (value !== undefined) out[key] = value;
    });
    return out;
  };
  return JSON.stringify(normalize(value));
}

function compactFieldForStructureCompare(field: TemplateField): Record<string, unknown> {
  const source = field as any;
  const out: Record<string, unknown> = {};
  Object.keys(source || {}).sort().forEach((key) => {
    if (key === 'id' || key === 'defaultValue' || key === 'required') return;
    const value = source[key];
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  });
  return out;
}

function fieldsHaveSameStructure(left: TemplateField[] | undefined, right: TemplateField[] | undefined): boolean {
  const normalize = (fields: TemplateField[] | undefined) => (fields || []).map(compactFieldForStructureCompare);
  return stableJson(normalize(left)) === stableJson(normalize(right));
}

function setOf(values: string[]): Set<string> {
  return new Set(values.map((value) => String(value || '').trim()).filter(Boolean));
}

function equalStringSet(left: string[], right: string[]): boolean {
  const a = setOf(left);
  const b = setOf(right);
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

function getFieldDefaultMap(fields: TemplateField[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields || []) {
    const key = compactText((field as any).key || (field as any).label);
    if (!key) continue;
    const value = (field as any).defaultValue;
    if (value !== undefined && value !== null && compactText(value) !== '') result[key] = compactText(value);
  }
  return result;
}

function cleanDefaultValuesOverride(draft: DraftState, block: CoreBlockDefinition | null, goal: GoalDefinition | null, themeIcon?: string): Record<string, unknown> | undefined {
  const merged = mergeDefaultValues(draft, themeIcon);
  const baseDefaults = getFieldDefaultMap(block?.fields as TemplateField[] | undefined);
  const result: Record<string, unknown> = {};
  const allowSystemDefault = new Set(['themePath', '主题', 'icon', '图标']);
  const forbiddenKeys = new Set(['legacyOverrideId', 'legacyThemePath', 'goalId', '目标ID', 'goalPath', '目标', 'templateId', '模板ID', 'templateSourceType', '模板来源', 'templateVariantId', 'goalTemplateVariantId', '变体ID', '记录预设', 'period', 'periodId', 'cycleId', '周期', '周期ID', '周期粒度', 'goalGranularity']);
  const goalThemePath = normalizeThemePath(goal?.themePath);

  Object.entries(merged).forEach(([key, raw]) => {
    if (forbiddenKeys.has(key)) return;
    const value = compactText(raw);
    if (!value) return;
    if (isSystemRecordContextField(key) && !allowSystemDefault.has(key)) return;
    if ((key === 'themePath' || key === '主题') && value === goalThemePath) return;
    if ((key === 'themePath' || key === '主题') && value === '{{goal.themePath}}') return;
    if (baseDefaults[key] !== undefined && baseDefaults[key] === value) return;
    result[key] = value;
  });

  if (draft.themePath && draft.themePath !== goalThemePath) {
    result.themePath = draft.themePath;
    result['主题'] = draft.themePath;
  }
  if (themeIcon && draft.themePath && draft.themePath !== goalThemePath) {
    result.icon = themeIcon;
    result['图标'] = themeIcon;
  }

  return Object.keys(result).length ? result : undefined;
}


function buildDraftDiffSummary(goal: GoalDefinition | null, block: CoreBlockDefinition | null, draft: DraftState, themeIcon?: string): string[] {
  if (!block || !goal) return [];
  const patch = buildTemplatePatchFromDraft({ goal, block, draft, selectedTemplate: null, themeIcon });
  return describeGoalTemplateStorageDiff(patch);
}

function buildTemplatePatchFromDraft(params: {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  draft: DraftState;
  selectedTemplate: GoalTemplate | null;
  themeIcon?: string;
}): GoalTemplate {
  const { goal, block, draft, selectedTemplate, themeIcon } = params;
  const variantId = draft.variantId || 'default';
  const draftFields = ensureThemeField(draft.fields || [], draft.themePath);
  const baseFields = block.fields as TemplateField[] | undefined;
  const requiredFields = deriveRequiredFields(draftFields);
  const baseRequiredFields = deriveRequiredFields(baseFields || []);
  const defaultValues = cleanDefaultValuesOverride(draft, block, goal, themeIcon);
  const sameFields = fieldsHaveSameStructure(draftFields, baseFields);
  const sameRequired = equalStringSet(requiredFields, baseRequiredFields);
  const outputTemplate = compactText(draft.outputTemplate);
  const targetFile = compactText(draft.targetFile);
  const appendUnderHeader = compactText(draft.appendUnderHeader);
  const baseOutputTemplate = compactText(block.outputTemplate);
  const baseTargetFile = compactText(block.targetFile);
  const baseAppendUnderHeader = compactText(block.appendUnderHeader);

  const rawPatch: GoalTemplate = {
    id: getGoalTemplateId(goal.id, block.id, variantId),
    goalId: goal.id,
    coreBlockId: block.id,
    variantId,
    name: draft.name || (variantId === 'default' ? '默认预设' : variantId),
    description: draft.description || undefined,
    isDefault: !!draft.isDefault,
    periodPolicy: buildDraftPeriodPolicy(block, draft),
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    enabled: true,
    fields: sameFields ? undefined : draftFields,
    outputTemplate: outputTemplate && outputTemplate !== baseOutputTemplate ? outputTemplate : undefined,
    targetFile: targetFile && targetFile !== baseTargetFile ? targetFile : undefined,
    appendUnderHeader: appendUnderHeader && appendUnderHeader !== baseAppendUnderHeader ? appendUnderHeader : undefined,
    requiredFields: sameRequired ? undefined : requiredFields,
    defaultValues: defaultValues,
    createdAt: selectedTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return compactGoalTemplateForStorage(rawPatch, { coreBlock: block, goal });
}

function nextCopyVariantId(existing: GoalTemplate[], sourceVariantId: string): string {
  const base = `${sourceVariantId || 'default'}-copy`;
  const used = new Set(existing.map((item) => String(item.variantId || 'default')));
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function GoalTemplateEditorModal({ isOpen, onClose, goal, block, variants, useCases }: GoalTemplateEditorModalProps) {
  const ui = useUiPort();
  const settings = useSelector(selectSettings);
  const themes = settings.inputSettings?.themes || [];
  const themeOptions = [{ value: '', label: '不指定主题' }, ...themes.map((theme: any) => ({ value: theme.path, label: `${theme.icon ? `${theme.icon} ` : ''}${theme.path}` }))];
  const themeByPath = new Map(themes.map((theme: any) => [String(theme.path || ''), theme]));
  const sortedVariants = useMemo(() => [...variants].sort((left, right) => {
    const bySort = (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999);
    if (bySort !== 0) return bySort;
    if (!!left.isDefault !== !!right.isDefault) return left.isDefault ? -1 : 1;
    return String(left.name || left.variantId || '').localeCompare(String(right.name || right.variantId || ''), 'zh-CN');
  }), [variants]);

  const [mode, setMode] = useState<EditMode>('inherit');
  const [selectedVariantId, setSelectedVariantId] = useState('default');
  const [draft, setDraft] = useState<DraftState>(() => makeDraftFromTemplate(null, block, sortedVariants));
  const draftRef = useRef<DraftState>(draft);

  const selectedTemplate = useMemo(() => sortedVariants.find((template) => (template.variantId || 'default') === selectedVariantId) || null, [sortedVariants, selectedVariantId]);
  const tableVariants = useMemo(() => {
    const rows = [...sortedVariants];
    const draftVariantId = draft.variantId || selectedVariantId || 'default';
    const draftExists = rows.some((template) => (template.variantId || 'default') === draftVariantId);
    if (mode === 'override' && !draftExists) {
      rows.push({
        id: goal && block ? getGoalTemplateId(goal.id, block.id, draftVariantId) : draftVariantId,
        goalId: goal?.id || '',
        coreBlockId: block?.id || '',
        variantId: draftVariantId,
        name: draft.name,
        description: draft.description,
        isDefault: draft.isDefault,
        periodPolicy: buildDraftPeriodPolicy(block, draft),
        sortOrder: draft.sortOrder,
        enabled: true,
        fields: draft.fields,
        outputTemplate: draft.outputTemplate,
        targetFile: draft.targetFile,
        appendUnderHeader: draft.appendUnderHeader,
        defaultValues: draft.defaultValues,
        requiredFields: draft.requiredFields,
      } as GoalTemplate);
    }
    return rows.sort((left, right) => {
      const bySort = (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999);
      if (bySort !== 0) return bySort;
      if (!!left.isDefault !== !!right.isDefault) return left.isDefault ? -1 : 1;
      return String(left.name || left.variantId || '').localeCompare(String(right.name || right.variantId || ''), 'zh-CN');
    });
  }, [sortedVariants, draft, selectedVariantId, mode, goal?.id, block?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const firstEnabled = sortedVariants.find((template) => template.enabled !== false);
    const first = firstEnabled || sortedVariants[0] || null;
    const nextMode: EditMode = sortedVariants.length === 0 ? 'inherit' : (firstEnabled ? 'override' : 'disabled');
    const nextVariantId = first?.variantId || 'default';
    setMode(nextMode);
    setSelectedVariantId(nextVariantId);
    const nextDraft = makeDraftFromTemplate(first, block, sortedVariants);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [isOpen, goal?.id, block?.id]);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  const updateDraft = (updates: Partial<DraftState>) => {
    setDraft((previous) => {
      const next = { ...previous, ...updates };
      draftRef.current = next;
      return next;
    });
  };

  const updateThemePath = (themePath: string) => {
    setDraft((previous) => {
      const theme = themeByPath.get(String(themePath || '')) as any;
      const next: DraftState = {
        ...previous,
        themePath: normalizeThemePath(themePath),
        fields: ensureThemeField(previous.fields || [], themePath),
        defaultValues: mergeDefaultValues({ ...previous, themePath: normalizeThemePath(themePath), fields: ensureThemeField(previous.fields || [], themePath) }, theme?.icon),
      };
      draftRef.current = next;
      return next;
    });
  };

  const currentTheme = themeByPath.get(String(draft.themePath || '')) as any;
  const diffSummary = useMemo(() => buildDraftDiffSummary(goal, block, draft, currentTheme?.icon), [goal, block, draft, currentTheme?.icon]);
  const supportsPeriod = !!block && isPeriodAwareCoreBlock(block.id);

  const isFormDisabled = mode !== 'override';
  const effectiveBlockForCopier = useMemo(() => {
    if (!block) return null;
    return { ...block, fields: draft.fields || block.fields, outputTemplate: draft.outputTemplate || block.outputTemplate };
  }, [block, draft.fields, draft.outputTemplate]);

  const handleSelectVariant = (variantId: string) => {
    const template = sortedVariants.find((item) => (item.variantId || 'default') === variantId) || null;
    setSelectedVariantId(variantId || 'default');
    const nextDraft = makeDraftFromTemplate(template, block, sortedVariants);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setMode(template?.enabled === false ? 'disabled' : 'override');
  };

  const handleNewVariant = () => {
    const base = makeDraftFromTemplate(null, block, sortedVariants);
    const variantId = makeVariantId(`preset-${sortedVariants.length + 1}`);
    const next = { ...base, variantId, name: `预设 ${sortedVariants.length + 1}`, isDefault: sortedVariants.length === 0, sortOrder: sortedVariants.length * 10 };
    setMode('override');
    setSelectedVariantId(variantId);
    draftRef.current = next;
    setDraft(next);
  };

  const handleMoveVariant = async (direction: -1 | 1) => {
    if (!goal || !block || !selectedTemplate) return;
    const index = sortedVariants.findIndex((template) => (template.variantId || 'default') === (selectedTemplate.variantId || 'default'));
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sortedVariants.length) return;
    const reordered = [...sortedVariants];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await Promise.all(reordered.map((template, order) => useCases.goal.upsertGoalTemplate({ ...template, sortOrder: order * 10 })));
    setSelectedVariantId(moved.variantId || 'default');
  };

  const handleCopyVariant = async () => {
    if (!goal || !block) return;
    const currentDraft = draftRef.current;
    const sourceVariantId = currentDraft.variantId || selectedTemplate?.variantId || 'default';
    const variantId = nextCopyVariantId(sortedVariants, sourceVariantId);
    const nextDraft = {
      ...currentDraft,
      variantId,
      name: `${currentDraft.name || selectedTemplate?.name || sourceVariantId} 副本`,
      isDefault: false,
      sortOrder: sortedVariants.length * 10,
    };
    await useCases.goal.upsertGoalTemplate({
      ...buildTemplatePatchFromDraft({
        goal,
        block,
        draft: nextDraft,
        selectedTemplate: null,
        themeIcon: (themeByPath.get(String(nextDraft.themePath || '')) as any)?.icon,
      }),
      isDefault: false,
      sortOrder: nextDraft.sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setMode('override');
    setSelectedVariantId(variantId);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    ui.notice('已复制记录预设');
  };

  const handleDeleteCurrentVariant = async () => {
    if (!goal || !block) return;
    const variantId = selectedVariantId || draft.variantId || 'default';
    await useCases.goal.deleteGoalTemplate(goal.id, block.id, variantId);
    const next = sortedVariants.find((template) => (template.variantId || 'default') !== variantId) || null;
    if (next) handleSelectVariant(next.variantId || 'default');
    else handleNewVariant();
    ui.notice('已删除当前记录预设');
  };

  const handleSetCurrentDefault = async () => {
    if (!goal || !block) return;
    const currentDraft = draftRef.current;
    await useCases.goal.upsertGoalTemplate({
      ...buildTemplatePatchFromDraft({
        goal,
        block,
        draft: currentDraft,
        selectedTemplate,
        themeIcon: (themeByPath.get(String(currentDraft.themePath || '')) as any)?.icon,
      }),
      isDefault: true,
    });
    updateDraft({ isDefault: true });
    ui.notice('已设为默认预设');
  };

  const deleteCellTemplates = async () => {
    if (!goal || !block) return;
    await Promise.all(sortedVariants.map((template) => useCases.goal.deleteGoalTemplate(goal.id, block.id, template.variantId || 'default')));
  };

  const handleSave = async () => {
    if (!goal || !block) return;
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && typeof activeElement.blur === 'function') activeElement.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const currentDraft = draftRef.current;
    try {
      if (mode === 'inherit') {
        await deleteCellTemplates();
        ui.notice(`已设为继承 ${block.name} 的默认记录方式`);
        onClose();
        return;
      }

      if (mode === 'disabled') {
        await deleteCellTemplates();
        await useCases.goal.upsertGoalTemplate({
          id: getGoalTemplateId(goal.id, block.id, 'default'),
          goalId: goal.id,
          coreBlockId: block.id,
          variantId: 'default',
          name: '隐藏',
          description: '该目标下隐藏此 Block',
          isDefault: true,
          sortOrder: 0,
          enabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        ui.notice(`已隐藏 ${goal.goalPath || goal.title} / ${block.name}`);
        onClose();
        return;
      }

      const variantId = currentDraft.variantId || 'default';
      await useCases.goal.upsertGoalTemplate(buildTemplatePatchFromDraft({
        goal,
        block,
        draft: currentDraft,
        selectedTemplate,
        themeIcon: (themeByPath.get(String(currentDraft.themePath || '')) as any)?.icon,
      }));
      ui.notice(`已保存预设单元格：${goal.goalPath || goal.title} / ${block.name}`);
      onClose();
    } catch (error) {
      diagnosticError('[GoalTemplateEditorModal] save failed', error);
      ui.notice('保存记录预设失败，请查看控制台日志');
    }
  };

  if (!isOpen || !goal || !block) return null;

  return (
    <FloatingPanel
      id={`goal-template-editor-${goal.id}-${block.id}`}
      title={<Typography>预设单元格：<strong>{goal.goalPath || goal.title}</strong> / <span style={{ color: 'var(--color-accent)' }}>{block.name}</span></Typography>}
      onClose={onClose}
      portal={false}
      placement="inline"
      closeOnOutsideClick={false}
      width="100%"
      minWidth={0}
      maxWidth="100%"
      minHeight={420}
      maxHeight="calc(100vh - 120px)"
      height="min(780px, calc(100vh - 160px))"
      resizable={false}
      bodyPadding={0}
      bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
        <Stack spacing={3}>
          <FormControl component="fieldset">
            <FormLabel component="legend">配置模式</FormLabel>
            <RadioGroup row value={mode} onChange={(_event: unknown, value: string) => setMode(value as EditMode)}>
              <FormControlLabel value="inherit" control={<Radio />} label="继承默认记录方式" />
              <FormControlLabel value="override" control={<Radio />} label="使用本单元格预设" />
              <FormControlLabel value="disabled" control={<Radio />} label="隐藏这种记录类型" />
            </RadioGroup>
          </FormControl>

          <Box sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 1, p: 1, display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>记录预设</Typography>
                <Typography variant="caption" color="text.secondary">同一个目标下可以为这种记录类型准备多个记录预设。周期只对计划 / 总结生效；任务、打卡、思考、事件不再默认日周期。</Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={handleNewVariant} disabled={mode !== 'override'}>新建记录预设</Button>
            </Box>
            <Box sx={{ overflowX: 'auto', border: '1px solid var(--background-modifier-border)', borderRadius: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--background-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', minWidth: '150px' }}>名字</th>
                    <th style={{ textAlign: 'left', padding: '8px', minWidth: '120px' }}>主题</th>
                    <th style={{ textAlign: 'left', padding: '8px', minWidth: '70px' }}>周期</th>
                    <th style={{ textAlign: 'left', padding: '8px', minWidth: '160px' }}>保存文件</th>
                    <th style={{ textAlign: 'left', padding: '8px', minWidth: '140px' }}>标题</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '64px' }}>默认</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '64px' }}>顺序</th>
                  </tr>
                </thead>
                <tbody>
                  {tableVariants.length > 0 ? tableVariants.map((template) => {
                    const variantId = template.variantId || 'default';
                    const selectedRow = selectedVariantId === variantId;
                    const rowThemePath = selectedRow ? draft.themePath : readThemePathFromTemplate(template);
                    const rowGranularity = selectedRow ? draft.granularity : readPeriodGranularity(template, block);
                    const rowTargetFile = selectedRow ? draft.targetFile : String(template.targetFile || '');
                    const rowHeader = selectedRow ? draft.appendUnderHeader : String(template.appendUnderHeader || '');
                    const rowName = selectedRow ? draft.name : presetName(template);
                    const rowSortOrder = selectedRow ? draft.sortOrder : (template.sortOrder ?? 0);
                    const rowIsDefault = selectedRow ? draft.isDefault : !!template.isDefault;
                    return (
                      <tr
                        key={variantId}
                        onClick={() => handleSelectVariant(variantId)}
                        style={{
                          cursor: 'pointer',
                          background: selectedRow ? 'rgba(137, 99, 255, 0.12)' : 'transparent',
                          borderTop: '1px solid var(--background-modifier-border)',
                        }}
                      >
                        <td style={{ padding: '6px', fontWeight: selectedRow ? 700 : 500 }}>
                          {selectedRow ? (
                            <CompactCellInput value={rowName} onInput={(value) => updateDraft({ name: value })} disabled={isFormDisabled} placeholder="例如：睡眠任务" />
                          ) : rowName}
                        </td>
                        <td style={{ padding: '6px', color: rowThemePath ? 'var(--text-normal)' : 'var(--text-muted)' }}>
                          {selectedRow ? (
                            <CompactCellSelect value={rowThemePath || ''} options={themeOptions} onChange={(value) => updateThemePath(String(value || ''))} disabled={isFormDisabled} />
                          ) : (rowThemePath ? leafPath(rowThemePath) : '不指定')}
                        </td>
                        <td style={{ padding: '6px' }}>
                          {selectedRow ? (
                            supportsPeriod ? <CompactCellSelect value={rowGranularity} options={presetGranularityOptions} onChange={(value) => updateDraft({ granularity: value as DraftState['granularity'] })} disabled={isFormDisabled} /> : <span style={{ color: 'var(--text-muted)' }}>不适用</span>
                          ) : (supportsPeriod ? (granularityLabelMap[rowGranularity] || '周') : '不适用')}
                        </td>
                        <td style={{ padding: '6px', color: 'var(--text-muted)' }} title={rowTargetFile}>
                          {selectedRow ? (
                            <CompactCellInput value={rowTargetFile} onInput={(value) => updateDraft({ targetFile: value })} disabled={isFormDisabled} placeholder="例如：01/目标.md" />
                          ) : shortText(rowTargetFile)}
                        </td>
                        <td style={{ padding: '6px', color: 'var(--text-muted)' }} title={rowHeader}>
                          {selectedRow ? (
                            <CompactCellInput value={rowHeader} onInput={(value) => updateDraft({ appendUnderHeader: value })} disabled={isFormDisabled} placeholder="## {{goalPath}}" />
                          ) : shortText(rowHeader)}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {selectedRow ? (
                            <input type="checkbox" checked={rowIsDefault} disabled={isFormDisabled} onClick={stopEditorEvent as any} onChange={(event: any) => updateDraft({ isDefault: !!event.target.checked })} />
                          ) : (rowIsDefault ? '是' : '')}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {selectedRow ? (
                            <CompactCellInput value={String(rowSortOrder)} onInput={(value) => updateDraft({ sortOrder: Number(value) || 0 })} disabled={isFormDisabled} type="number" />
                          ) : rowSortOrder}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '12px', color: 'var(--text-muted)' }}>当前单元还没有记录预设。切换到“使用本单元格预设”后可保存第一个预设。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="text" disabled={mode !== 'override' || !selectedTemplate} onClick={() => handleMoveVariant(-1)}>上移</Button>
              <Button size="small" variant="text" disabled={mode !== 'override' || !selectedTemplate} onClick={() => handleMoveVariant(1)}>下移</Button>
              <Button size="small" variant="text" disabled={mode !== 'override'} onClick={handleCopyVariant}>复制当前预设</Button>
              <Button size="small" variant="text" disabled={mode !== 'override'} onClick={handleSetCurrentDefault}>设为默认</Button>
              <Button size="small" color="error" variant="text" disabled={mode !== 'override' || !selectedTemplate} onClick={handleDeleteCurrentVariant}>删除当前预设</Button>
            </Box>
            {draft.themePath ? (
              <Typography variant="caption" color="text.secondary">主题只作为这个预设的表单默认值与统计维度，不再决定目标归属。当前主题：{currentTheme?.icon ? `${currentTheme.icon} ` : ''}{draft.themePath}</Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">主题不是必填项。旧主题表单迁移过来的预设会保留主题，纯目标记录可以不指定主题。</Typography>
            )}
            <NativeTextInput label="说明" value={draft.description} onInput={(value) => updateDraft({ description: value })} disabled={isFormDisabled} placeholder="可选：说明这个预设适合的记录场景" />
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">保存策略：</Typography>
              {diffSummary.length ? diffSummary.map(item => (
                <span key={item} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--background-modifier-border)', color: 'var(--text-muted)' }}>{item}</span>
              )) : <Typography variant="caption" color="text.secondary">完全继承 CoreBlock，只保存名称 / 默认状态 / 顺序等元信息。</Typography>}
            </Box>
          </Box>

          <Box sx={{ opacity: isFormDisabled ? 0.6 : 1 }}>
            <Stack spacing={3}>
              <Divider />
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>表单字段</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>字段名称、类型、默认值、必填、选项、数字范围会随记录预设保存。若与 CoreBlock 完全一致，只保存默认值差异，避免每个预设复制完整字段。</Typography>
                <FieldsEditor fields={draft.fields || []} disabled={isFormDisabled} onChange={(fields: TemplateField[]) => updateDraft({ fields, themePath: readThemePathFromFields(fields) || draft.themePath })} />
              </Box>
              <Divider />
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box><Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>输出格式</Typography><Typography variant="caption" color="text.secondary">与 CoreBlock 相同则不单独保存；只在确实需要覆盖时保存差异。</Typography></Box>
                  {effectiveBlockForCopier ? <TemplateVariableCopier block={effectiveBlockForCopier} /> : null}
                </Stack>
                <NativeTextarea value={draft.outputTemplate} rows={8} onInput={(value) => updateDraft({ outputTemplate: value })} disabled={isFormDisabled} />
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handleSave} variant="contained">保存单元格</Button>
          </Stack>
        </Stack>
      </Box>
    </FloatingPanel>
  );
}
