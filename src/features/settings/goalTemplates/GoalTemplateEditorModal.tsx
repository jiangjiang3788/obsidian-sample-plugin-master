/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@shared/ui/public';
import { diagnosticError } from '@shared/utils/public';
import { FloatingPanel, selectSettings, useSelector, useUiPort, type UseCases } from '@/app/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import { getGoalTemplateId, isPeriodAwareCoreBlock } from '@core/goal/public';
import { FieldsEditor } from '../input/FieldsEditor';
import { TemplateVariableCopier } from '../input/TemplateVariableCopier';
import { GoalTemplateModeSwitch } from './GoalTemplateModeSwitch';
import { NativeSelectInput, NativeTextarea, NativeTextInput } from './GoalTemplateNativeControls';
import {
  applyThemePathToDraft,
  buildDraftDiffSummary,
  buildInheritedDraft,
  buildInheritedTemplatePatchFromDraft,
  buildTemplatePatchFromDraft,
  buildThemeByPath,
  buildThemeOptions,
  cleanDisplayThemePath,
  createCopiedDraft,
  inferTemplateEditMode,
  isGeneratedPresetName,
  makeDraftFromTemplate,
  makeNewDraft,
  makeVariantId,
  presetGranularityOptions,
  readThemePathFromFields,
  sortGoalTemplateVariants,
  switchDraftToOverride,
  themeLeafLabel,
  type GoalTemplateDraftState,
  type GoalTemplateEditMode,
} from './GoalTemplateEditorModel';

interface GoalTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalDefinition | null;
  block: CoreBlockDefinition | null;
  variants: GoalTemplate[];
  initialVariantId?: string | null;
  useCases: UseCases;
}

export function GoalTemplateEditorModal({ isOpen, onClose, goal, block, variants, initialVariantId = null, useCases }: GoalTemplateEditorModalProps) {
  const ui = useUiPort();
  const settings = useSelector(selectSettings);
  const themes = settings.inputSettings?.themes || [];
  const themeOptions = useMemo(() => buildThemeOptions(themes), [themes]);
  const themeByPath = useMemo(() => buildThemeByPath(themes), [themes]);
  const sortedVariants = useMemo(() => sortGoalTemplateVariants(variants), [variants]);

  const [mode, setMode] = useState<GoalTemplateEditMode>('inherit');
  const [selectedVariantId, setSelectedVariantId] = useState('default');
  const [draft, setDraft] = useState<GoalTemplateDraftState>(() => makeDraftFromTemplate(null, block, sortedVariants));
  const draftRef = useRef<GoalTemplateDraftState>(draft);

  const selectedTemplate = useMemo(
    () => sortedVariants.find((template) => (template.variantId || 'default') === selectedVariantId) || null,
    [sortedVariants, selectedVariantId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const initial = initialVariantId
      ? sortedVariants.find((template) => (template.variantId || 'default') === initialVariantId || template.id === initialVariantId) || null
      : null;

    if (initial) {
      const nextVariantId = initial.variantId || 'default';
      const nextMode = inferTemplateEditMode(initial, block, goal);
      const baseDraft = makeDraftFromTemplate(initial, block, sortedVariants);
      const nextDraft = nextMode === 'inherit' ? buildInheritedDraft(baseDraft, block) : baseDraft;
      setMode(nextMode);
      setSelectedVariantId(nextVariantId);
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

  const updateDraft = (updates: Partial<GoalTemplateDraftState>) => {
    setDraft((previous) => {
      const next = { ...previous, ...updates };
      draftRef.current = next;
      return next;
    });
  };

  const updateThemePath = (themePath: string) => {
    setDraft((previous) => {
      const next = applyThemePathToDraft(previous, themePath, (themeByPath.get(String(themePath || '')) as any)?.icon);
      draftRef.current = next;
      return next;
    });
  };

  const currentTheme = themeByPath.get(String(draft.themePath || '')) as any;
  const isExistingTemplate = !!selectedTemplate;
  const diffSummary = useMemo(() => buildDraftDiffSummary(goal, block, draft, currentTheme?.icon), [goal, block, draft, currentTheme?.icon]);
  const supportsPeriod = !!block && isPeriodAwareCoreBlock(block.id);
  const metadataDisabled = mode === 'disabled';
  const inheritedMode = mode === 'inherit';
  const fieldEditDisabled = mode !== 'override';

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
      const next = switchDraftToOverride(previous, block);
      draftRef.current = next;
      return next;
    });
  };

  const handleCopyVariant = async () => {
    if (!goal || !block) return;
    const nextDraft = createCopiedDraft(draftRef.current, selectedTemplate, sortedVariants);
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
        await useCases.goal.upsertGoalTemplate(buildInheritedTemplatePatchFromDraft({ goal, block, draft: currentDraft, selectedTemplate, themeIcon: (themeByPath.get(String(currentDraft.themePath || '')) as any)?.icon }));
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

      await useCases.goal.upsertGoalTemplate(buildTemplatePatchFromDraft({ goal, block, draft: currentDraft, selectedTemplate, themeIcon: (themeByPath.get(String(currentDraft.themePath || '')) as any)?.icon }));
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
      <Box className="think-goal-template-editor">
        <Stack spacing={1.5}>
          <Box className="think-editor-header">
            <Box className="think-goal-template-editor__identity">
              <Typography className="think-settings-title-strong">{currentTheme?.icon ? `${currentTheme.icon} ` : ''}{titleTheme}</Typography>
              <Typography variant="caption" color="text.secondary">{goal.goalPath || goal.title} / {block.name}</Typography>
            </Box>
            <Box className="think-settings-actions">
              <Button size="small" variant="outlined" disabled={!selectedTemplate || metadataDisabled} onClick={handleCopyVariant}>复制为新预设</Button>
            </Box>
          </Box>

          {mode === 'disabled' ? <Alert severity="warning">这个目标下已经隐藏「{block.name}」。保存前请先改为普通记录预设，或删除这条隐藏规则。</Alert> : null}

          <GoalTemplateModeSwitch mode={mode} blockName={block.name} disabled={metadataDisabled} onInherit={switchToInherit} onOverride={switchToOverride} />

          <Box className="think-goal-template-editor__fields">
            <Box className={`think-goal-template-editor__primary-grid${supportsPeriod ? '' : ' is-two-column'}`}> 
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
              {supportsPeriod ? <NativeSelectInput label="周期" value={draft.granularity} options={presetGranularityOptions} onChange={(value) => updateDraft({ granularity: value as GoalTemplateDraftState['granularity'] })} disabled={metadataDisabled} /> : null}
            </Box>

            <Box className="think-goal-template-editor__secondary-grid">
              <NativeTextInput label="保存文件" value={draft.targetFile} onInput={(value) => updateDraft({ targetFile: value })} disabled={fieldEditDisabled} placeholder="例如：01/目标打卡.md" />
              <NativeTextInput label="标题" value={draft.appendUnderHeader} onInput={(value) => updateDraft({ appendUnderHeader: value })} disabled={fieldEditDisabled} placeholder="## {{goalPath}}" />
            </Box>
            <NativeTextInput label="说明" value={draft.description} onInput={(value) => updateDraft({ description: value })} disabled={metadataDisabled} placeholder="可选" />

            {diffSummary.length ? (
              <Box className="think-editor-diff-list">
                {diffSummary.map(item => <span key={item} className="think-editor-diff-chip">{item}</span>)}
              </Box>
            ) : null}
          </Box>

          <Box className={fieldEditDisabled ? "think-settings-muted-disabled" : undefined}>
            <Stack spacing={1.5}>
              <Box>
                <Typography className="think-goal-template-editor__section-heading">表单字段</Typography>
                {inheritedMode ? <Typography variant="caption" color="text.secondary" className="think-goal-template-editor__section-help">当前为继承模式，下面只读展示记录类型基础字段。切到“覆盖”后可单独修改这个主题预设。</Typography> : null}
                <FieldsEditor fields={draft.fields || []} disabled={fieldEditDisabled} onChange={(fields: TemplateField[]) => updateDraft({ fields, themePath: readThemePathFromFields(fields) || draft.themePath })} />
              </Box>
              <Divider />
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" className="think-goal-template-editor__output-heading">
                  <Typography className="think-goal-template-editor__section-heading">输出格式</Typography>
                  {effectiveBlockForCopier ? <TemplateVariableCopier block={effectiveBlockForCopier} /> : null}
                </Stack>
                <NativeTextarea value={draft.outputTemplate} rows={7} onInput={(value) => updateDraft({ outputTemplate: value })} disabled={fieldEditDisabled} />
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" justifyContent="space-between" spacing={1} className="think-settings-sticky-actions">
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handleSave} variant="contained" disabled={metadataDisabled}>保存</Button>
          </Stack>
        </Stack>
      </Box>
    </FloatingPanel>
  );
}
