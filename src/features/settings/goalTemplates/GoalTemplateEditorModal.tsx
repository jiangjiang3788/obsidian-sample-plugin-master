/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Alert, Box, Button, Divider, Stack, Typography, diagnosticError } from '@shared/public';
import type { JSX } from 'preact';
import { FloatingPanel, selectSettings, useSelector, useUiPort, type UseCases } from '@/app/public';
import type { CoreBlockDefinition } from '@core/public';
import type { GoalDefinition, GoalTemplate, TemplateField } from '@core/public';
import { getGoalTemplateId, isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity, isSystemRecordContextField, compactGoalTemplateForStorage, describeGoalTemplateStorageDiff, getGoalTemplateDisplayName as getCoreGoalTemplateDisplayName, inferGoalTemplateEditMode } from '@core/public';
import { FieldsEditor } from '../input/FieldsEditor';
import { TemplateVariableCopier } from '../input/TemplateVariableCopier';
import { GoalTemplateModeSwitch } from './GoalTemplateModeSwitch';

type EditMode = 'inherit' | 'override' | 'disabled';

interface GoalTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalDefinition | null;
  block: CoreBlockDefinition | null;
  variants: GoalTemplate[];
  initialVariantId?: string | null;
  useCases: UseCases;
}

interface DraftState {
  variantId: string;
  name: string;
  description: string;
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

function normalizeThemePath(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || text === '{{goal.themePath}}') return '';
  return text;
}

function cleanDisplayThemePath(value: unknown): string {
  return String(value ?? '').split('/').map((part) => part.trim().replace(/^[#＃]+\s*/, '').trim()).filter(Boolean).join('/');
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

function leafPath(value: unknown): string {
  const text = String(value ?? '').trim();
  return text.split('/').filter(Boolean).pop() || text;
}

function isGeneratedPresetName(value: unknown): boolean {
  const text = String(value ?? '').trim();
  return !text || /^预设\s*\d+$/i.test(text) || /^preset[-_\s]*\d+$/i.test(text) || text === '记录预设' || text === '未命名预设';
}

function themeLeafLabel(themePath: unknown, fallback = ''): string {
  const clean = cleanDisplayThemePath(themePath);
  return leafPath(clean) || fallback;
}

function inferTemplateDisplayName(template: GoalTemplate | null | undefined, themePath?: string, fallback = '记录预设'): string {
  const resolvedThemePath = normalizeThemePath(themePath || readThemePathFromTemplate(template));
  const displayTemplate = resolvedThemePath
    ? { ...(template || {}), defaultValues: { ...((template?.defaultValues || {}) as Record<string, unknown>), themePath: resolvedThemePath, '主题': resolvedThemePath } }
    : template;
  return getCoreGoalTemplateDisplayName(displayTemplate as GoalTemplate | null | undefined, null, fallback);
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

function NativeSelectInput({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={nativeLabelStyle}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onMouseDown={stopEditorEvent as any}
        onClick={stopEditorEvent as any}
        onDblClick={stopEditorEvent as any}
        onKeyDown={stopEditorEvent as any}
        onKeyUp={stopEditorEvent as any}
        onChange={(event) => onChange(((event.target || event.currentTarget) as HTMLSelectElement).value)}
        style={{ ...nativeControlBaseStyle, opacity: disabled ? 0.6 : 1 }}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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
    name: inferTemplateDisplayName(template, themePath),
    description: template?.description || '',
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

function makeNewDraft(goal: GoalDefinition | null, block: CoreBlockDefinition | null, variants: GoalTemplate[], themes: any[]): DraftState {
  const base = makeDraftFromTemplate(null, block, variants);
  const usedVariantIds = new Set(variants.map((item) => String(item.variantId || 'default')));
  const usedThemePaths = new Set(variants.map((item) => normalizeThemePath(readThemePathFromTemplate(item))).filter(Boolean));
  const preferredTheme = normalizeThemePath((goal as any)?.themePath) || normalizeThemePath(base.themePath);
  const firstUnusedTheme = themes.map((theme: any) => normalizeThemePath(theme?.path)).find((path: string) => path && !usedThemePaths.has(path));
  const themePath = preferredTheme && !usedThemePaths.has(preferredTheme) ? preferredTheme : (firstUnusedTheme || preferredTheme || '');
  const label = themeLeafLabel(themePath, block?.name || '记录预设');
  let variantId = makeVariantId(label || `preset-${variants.length + 1}`);
  if (usedVariantIds.has(variantId)) {
    let index = 2;
    while (usedVariantIds.has(`${variantId}-${index}`)) index += 1;
    variantId = `${variantId}-${index}`;
  }
  const fields = ensureThemeField(base.fields || [], themePath);
  return {
    ...base,
    variantId,
    name: label || '记录预设',
    sortOrder: variants.length * 10,
    themePath,
    fields,
    defaultValues: mergeDefaultValues({ ...base, themePath, fields, name: label || '记录预设', variantId } as DraftState, themes.find((theme: any) => normalizeThemePath(theme?.path) === themePath)?.icon),
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


function buildInheritedDraft(previous: DraftState, block: CoreBlockDefinition | null): DraftState {
  const baseFields = ensureThemeField(cloneValue(block?.fields || []), previous.themePath);
  const requiredFields = deriveRequiredFields(baseFields);
  const next: DraftState = {
    ...previous,
    fields: baseFields,
    outputTemplate: block?.outputTemplate || '',
    targetFile: block?.targetFile || '',
    appendUnderHeader: block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields,
    defaultValues: mergeDefaultValues({ ...previous, fields: baseFields } as DraftState),
  };
  return next;
}

function inferTemplateEditMode(template: GoalTemplate | null | undefined, block: CoreBlockDefinition | null, goal: GoalDefinition | null): EditMode {
  return inferGoalTemplateEditMode(template, block, goal) as EditMode;
}

function buildInheritedTemplatePatchFromDraft(params: {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  draft: DraftState;
  selectedTemplate: GoalTemplate | null;
  themeIcon?: string;
}): GoalTemplate {
  const { goal, block, draft, selectedTemplate, themeIcon } = params;
  const variantId = draft.variantId || 'default';
  const defaultValues = cleanDefaultValuesOverride({ ...draft, fields: [] }, block, goal, themeIcon);
  const rawPatch: GoalTemplate = {
    id: getGoalTemplateId(goal.id, block.id, variantId),
    goalId: goal.id,
    coreBlockId: block.id,
    variantId,
    name: draft.name || (variantId === 'default' ? '记录预设' : variantId),
    description: draft.description || undefined,
    periodPolicy: buildDraftPeriodPolicy(block, draft),
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    enabled: true,
    defaultValues,
    createdAt: selectedTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return compactGoalTemplateForStorage(rawPatch, { coreBlock: block, goal });
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
    name: draft.name || (variantId === 'default' ? '记录预设' : variantId),
    description: draft.description || undefined,
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

export function GoalTemplateEditorModal({ isOpen, onClose, goal, block, variants, initialVariantId = null, useCases }: GoalTemplateEditorModalProps) {
  const ui = useUiPort();
  const settings = useSelector(selectSettings);
  const themes = settings.inputSettings?.themes || [];
  const themeOptions = [{ value: '', label: '不指定主题' }, ...themes.map((theme: any) => ({ value: theme.path, label: `${theme.icon ? `${theme.icon} ` : ''}${cleanDisplayThemePath(theme.path)}` }))];
  const themeByPath = new Map(themes.map((theme: any) => [String(theme.path || ''), theme]));
  const sortedVariants = useMemo(() => variants
    .map((template, index) => ({ template, index }))
    .sort((left, right) => {
      const bySort = (left.template.sortOrder ?? 9999) - (right.template.sortOrder ?? 9999);
      if (bySort !== 0) return bySort;
      return left.index - right.index;
    })
    .map(({ template }) => template), [variants]);

  const [mode, setMode] = useState<EditMode>('inherit');
  const [selectedVariantId, setSelectedVariantId] = useState('default');
  const [draft, setDraft] = useState<DraftState>(() => makeDraftFromTemplate(null, block, sortedVariants));
  const draftRef = useRef<DraftState>(draft);

  const selectedTemplate = useMemo(() => sortedVariants.find((template) => (template.variantId || 'default') === selectedVariantId) || null, [sortedVariants, selectedVariantId]);
  useEffect(() => {
    if (!isOpen) return;
    const initial = initialVariantId
      ? sortedVariants.find((template) => (template.variantId || 'default') === initialVariantId || template.id === initialVariantId) || null
      : null;

    if (initial) {
      const nextVariantId = initial.variantId || 'default';
      const nextMode = inferTemplateEditMode(initial, block, goal);
      setMode(nextMode);
      setSelectedVariantId(nextVariantId);
      const baseDraft = makeDraftFromTemplate(initial, block, sortedVariants);
      const nextDraft = nextMode === 'inherit' ? buildInheritedDraft(baseDraft, block) : baseDraft;
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      return;
    }

    const nextDraft = buildInheritedDraft(makeNewDraft(goal, block, sortedVariants, themes), block);
    setMode('inherit');
    setSelectedVariantId(nextDraft.variantId);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [isOpen, goal?.id, goal?.themePath, block?.id, initialVariantId, sortedVariants.length, themes.length]);

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
  const isExistingTemplate = !!selectedTemplate;
  const diffSummary = useMemo(() => buildDraftDiffSummary(goal, block, draft, currentTheme?.icon), [goal, block, draft, currentTheme?.icon]);
  const supportsPeriod = !!block && isPeriodAwareCoreBlock(block.id);

  const isFormDisabled = mode !== 'override';
  const effectiveBlockForCopier = useMemo(() => {
    if (!block) return null;
    return { ...block, fields: draft.fields || block.fields, outputTemplate: draft.outputTemplate || block.outputTemplate };
  }, [block, draft.fields, draft.outputTemplate]);

  const switchToInherit = () => {
    setMode('inherit');
    setDraft((previous) => {
      const next = buildInheritedDraft(previous, block);
      draftRef.current = next;
      return next;
    });
  };

  const switchToOverride = () => {
    setMode('override');
    setDraft((previous) => {
      const base = buildInheritedDraft(previous, block);
      const next: DraftState = {
        ...previous,
        fields: previous.fields?.length ? previous.fields : base.fields,
        outputTemplate: previous.outputTemplate || base.outputTemplate,
        targetFile: previous.targetFile || base.targetFile,
        appendUnderHeader: previous.appendUnderHeader || base.appendUnderHeader,
        requiredFields: previous.requiredFields?.length ? previous.requiredFields : base.requiredFields,
      };
      draftRef.current = next;
      return next;
    });
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
        sortOrder: nextDraft.sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setMode('override');
    setSelectedVariantId(nextDraft.variantId);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    ui.notice('已复制记录预设');
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
        await useCases.goal.upsertGoalTemplate(buildInheritedTemplatePatchFromDraft({
          goal,
          block,
          draft: currentDraft,
          selectedTemplate,
          themeIcon: (themeByPath.get(String(currentDraft.themePath || '')) as any)?.icon,
        }));
        ui.notice(`已保存继承预设：${currentDraft.name || block.name}`);
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
          description: '该目标下隐藏此记录类型',
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
      ui.notice(`已保存记录预设：${goal.goalPath || goal.title} / ${block.name}`);
      onClose();
    } catch (error) {
      diagnosticError('[GoalTemplateEditorModal] save failed', error);
      ui.notice('保存记录预设失败，请查看控制台日志');
    }
  };

  if (!isOpen || !goal || !block) return null;

  const titleTheme = draft.themePath ? cleanDisplayThemePath(draft.themePath) : '新预设';
  const currentPresetTitle = draft.name || titleTheme || '记录预设';
  const metadataDisabled = mode === 'disabled';
  const inheritedMode = mode === 'inherit';
  const fieldEditDisabled = mode !== 'override';

  return (
    <FloatingPanel
      id={`goal-template-editor-${goal.id}-${block.id}`}
      title={<Typography>字段预设：<strong>{currentPresetTitle}</strong></Typography>}
      onClose={onClose}
      defaultPosition={{ x: Math.max(24, window.innerWidth / 2 - 380), y: 72 }}
      portal={false}
      placement="floating"
      closeOnOutsideClick={false}
      width={760}
      height={680}
      minWidth={560}
      minHeight={430}
      maxWidth="96vw"
      maxHeight="92vh"
      resizable
      bodyPadding={0}
      bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{currentTheme?.icon ? `${currentTheme.icon} ` : ''}{titleTheme}</Typography>
              <Typography variant="caption" color="text.secondary">
                {goal.goalPath || goal.title} / {block.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" disabled={!selectedTemplate || metadataDisabled} onClick={handleCopyVariant}>复制为新预设</Button>
            </Box>
          </Box>

          {mode === 'disabled' ? (
            <Alert severity="warning">这个目标下已经隐藏「{block.name}」。保存前请先改为普通记录预设，或删除这条隐藏规则。</Alert>
          ) : null}

          <GoalTemplateModeSwitch
            mode={mode}
            blockName={block.name}
            disabled={metadataDisabled}
            onInherit={switchToInherit}
            onOverride={switchToOverride}
          />

          <Box sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 1.25, p: 1.25, display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: supportsPeriod ? '1.2fr 1.2fr 0.75fr' : '1.2fr 1.2fr' }, gap: 1 }}>
              <NativeTextInput label="名字" value={draft.name} onInput={(value) => updateDraft({ name: value })} disabled={metadataDisabled} placeholder="例如：心情" />
              {isExistingTemplate ? (
                <NativeTextInput label="主题" value={currentTheme?.icon ? `${currentTheme.icon} ${cleanDisplayThemePath(draft.themePath)}` : cleanDisplayThemePath(draft.themePath) || '未指定主题'} onInput={() => undefined} disabled />
              ) : (
                <NativeSelectInput label="主题" value={draft.themePath || ''} options={themeOptions} onChange={(value) => {
                  const themePath = String(value || '');
                  updateThemePath(themePath);
                  const label = themeLeafLabel(themePath);
                  if (label && isGeneratedPresetName(draftRef.current.name)) updateDraft({ name: label, variantId: makeVariantId(label) });
                }} disabled={metadataDisabled} />
              )}
              {supportsPeriod ? <NativeSelectInput label="周期" value={draft.granularity} options={presetGranularityOptions} onChange={(value) => updateDraft({ granularity: value as DraftState['granularity'] })} disabled={metadataDisabled} /> : null}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
              <NativeTextInput label="保存文件" value={draft.targetFile} onInput={(value) => updateDraft({ targetFile: value })} disabled={fieldEditDisabled} placeholder="例如：01/目标打卡.md" />
              <NativeTextInput label="标题" value={draft.appendUnderHeader} onInput={(value) => updateDraft({ appendUnderHeader: value })} disabled={fieldEditDisabled} placeholder="## {{goalPath}}" />
            </Box>

            <NativeTextInput label="说明" value={draft.description} onInput={(value) => updateDraft({ description: value })} disabled={metadataDisabled} placeholder="可选" />

            {diffSummary.length ? (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                {diffSummary.map(item => (
                  <span key={item} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--background-modifier-border)', color: 'var(--text-muted)' }}>{item}</span>
                ))}
              </Box>
            ) : null}
          </Box>

          <Box sx={{ opacity: fieldEditDisabled ? 0.72 : 1 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, mb: 0.75 }}>表单字段</Typography>
                {inheritedMode ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    当前为继承模式，下面只读展示记录类型基础字段。切到“覆盖”后可单独修改这个主题预设。
                  </Typography>
                ) : null}
                <FieldsEditor fields={draft.fields || []} disabled={fieldEditDisabled} onChange={(fields: TemplateField[]) => updateDraft({ fields, themePath: readThemePathFromFields(fields) || draft.themePath })} />
              </Box>
              <Divider />
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>输出格式</Typography>
                  {effectiveBlockForCopier ? <TemplateVariableCopier block={effectiveBlockForCopier} /> : null}
                </Stack>
                <NativeTextarea value={draft.outputTemplate} rows={7} onInput={(value) => updateDraft({ outputTemplate: value })} disabled={fieldEditDisabled} />
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ position: 'sticky', bottom: -12, py: 1, background: 'var(--background-primary)', borderTop: '1px solid var(--background-modifier-border)' }}>
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handleSave} variant="contained" disabled={metadataDisabled}>保存</Button>
          </Stack>
        </Stack>
      </Box>
    </FloatingPanel>
  );
}
